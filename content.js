(function() {
    if (window.colorPickerInjected) return;
    window.colorPickerInjected = true;

    const overlay = document.createElement('div'); 
    overlay.style.position = 'fixed'; 
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '9999'; 
    overlay.style.cursor = 'crosshair';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.1)'; 

    const magnifier = document.createElement('div'); 
    magnifier.style.position = 'absolute'; 
    magnifier.style.top = '50px';
    magnifier.style.left = '50px';
    magnifier.style.width = '70px';
    magnifier.style.height = '70px';
    magnifier.style.border = '2px solid white';
    magnifier.style.borderRadius = '10px';
    magnifier.style.zIndex = '99999'; 
    magnifier.style.backgroundColor = 'red'; 
    magnifier.style.display = 'block'; 

    document.body.appendChild(overlay);
    document.body.appendChild(magnifier);

    document.addEventListener('mousemove', (e) => {
        magnifier.style.left = `${e.clientX + 15}px`;  
        magnifier.style.top = `${e.clientY + 15}px`;   
    });

    let handleMouseMove;
    let handleClick;
    let canvas;
    let ctx;
    let devicePixelRatio;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'screenshot') {
            const img = new Image();
            img.src = message.imageUri;

            img.onload = () => {
                canvas = document.createElement('canvas');
                devicePixelRatio = window.devicePixelRatio || 1;
                
                // Set canvas size to match the actual screenshot dimensions
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);

                handleMouseMove = (e) => {
                    // Convert client coordinates to canvas coordinates
                    const rect = document.documentElement.getBoundingClientRect();
                    const x = Math.floor((e.clientX - rect.left) * devicePixelRatio);
                    const y = Math.floor((e.clientY - rect.top) * devicePixelRatio);
                    
                    // Ensure coordinates are within canvas bounds
                    const canvasX = Math.max(0, Math.min(x, canvas.width - 1));
                    const canvasY = Math.max(0, Math.min(y, canvas.height - 1));
                    
                    try {
                        const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
                        const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                        magnifier.style.backgroundColor = color;
                    } catch (error) {
                        console.error('Error getting pixel data:', error);
                    }
                };

                handleClick = (e) => {
                    // Convert client coordinates to canvas coordinates
                    const rect = document.documentElement.getBoundingClientRect();
                    const x = Math.floor((e.clientX - rect.left) * devicePixelRatio);
                    const y = Math.floor((e.clientY - rect.top) * devicePixelRatio);
                    
                    // Ensure coordinates are within canvas bounds
                    const canvasX = Math.max(0, Math.min(x, canvas.width - 1));
                    const canvasY = Math.max(0, Math.min(y, canvas.height - 1));
                    
                    try {
                        const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
                        const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

                        chrome.runtime.sendMessage({
                            type: 'colorPicked',
                            color: color
                        });

                        cleanup();
                    } catch (error) {
                        console.error('Error picking color:', error);
                        cleanup();
                    }
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('click', handleClick, { once: true });
            };
            
            img.onerror = () => {
                console.error('Failed to load screenshot image');
                cleanup();
            };
        }
    });

    function cleanup() {
        if (handleMouseMove) {
            document.removeEventListener('mousemove', handleMouseMove);
        }
        if (handleClick) {
            document.removeEventListener('click', handleClick);
        }
        if (overlay && overlay.parentNode) {
            overlay.remove();
        }
        if (magnifier && magnifier.parentNode) {
            magnifier.remove();
        }
        window.colorPickerInjected = false;
    }

    // Add escape key to cancel color picking
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cleanup();
        }
    });
})();