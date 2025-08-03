// UPDATED content.js - Complete fix for scroll coordinate issues

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
    magnifier.style.position = 'fixed'; // Changed from absolute to fixed
    magnifier.style.top = '50px';
    magnifier.style.left = '50px';
    magnifier.style.width = '70px';
    magnifier.style.height = '70px';
    magnifier.style.border = '2px solid white';
    magnifier.style.borderRadius = '10px';
    magnifier.style.zIndex = '99999'; 
    magnifier.style.backgroundColor = 'red'; 
    magnifier.style.display = 'block';
    magnifier.style.pointerEvents = 'none'; // Prevent interference with mouse events

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
    let viewportOffsetX = 0;
    let viewportOffsetY = 0;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'screenshot') {
            const img = new Image();
            img.src = message.imageUri;

            img.onload = () => {
                canvas = document.createElement('canvas');
                devicePixelRatio = window.devicePixelRatio || 1;
                
                // Store the current scroll position when screenshot was taken
                viewportOffsetX = window.pageXOffset || document.documentElement.scrollLeft || 0;
                viewportOffsetY = window.pageYOffset || document.documentElement.scrollTop || 0;
                
                // Set canvas size to match the actual screenshot dimensions
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);

                handleMouseMove = (e) => {
                    // Get current mouse position relative to viewport
                    const mouseX = e.clientX;
                    const mouseY = e.clientY;
                    
                    // Convert to canvas coordinates accounting for:
                    // 1. Device pixel ratio
                    // 2. The fact that screenshot only contains visible viewport
                    const canvasX = Math.floor(mouseX * devicePixelRatio);
                    const canvasY = Math.floor(mouseY * devicePixelRatio);
                    
                    // Ensure coordinates are within canvas bounds
                    const clampedX = Math.max(0, Math.min(canvasX, canvas.width - 1));
                    const clampedY = Math.max(0, Math.min(canvasY, canvas.height - 1));
                    
                    try {
                        const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
                        const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                        magnifier.style.backgroundColor = color;
                        
                        // Debug info (can be removed in production)
                        console.log(`Mouse: (${mouseX}, ${mouseY}) -> Canvas: (${clampedX}, ${clampedY}) -> Color: ${color}`);
                    } catch (error) {
                        console.error('Error getting pixel data:', error);
                        magnifier.style.backgroundColor = 'red';
                    }
                };

                handleClick = (e) => {
                    // Get current mouse position relative to viewport
                    const mouseX = e.clientX;
                    const mouseY = e.clientY;
                    
                    // Convert to canvas coordinates
                    const canvasX = Math.floor(mouseX * devicePixelRatio);
                    const canvasY = Math.floor(mouseY * devicePixelRatio);
                    
                    // Ensure coordinates are within canvas bounds
                    const clampedX = Math.max(0, Math.min(canvasX, canvas.width - 1));
                    const clampedY = Math.max(0, Math.min(canvasY, canvas.height - 1));
                    
                    try {
                        const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
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