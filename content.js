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
    magnifier.style.zIndex = '99999'; // Ensure it is above all other elements
    magnifier.style.backgroundColor = 'red'; // Temporary test color
    magnifier.style.display = 'block'; // Make sure it's visible

    document.body.appendChild(overlay);
    document.body.appendChild(magnifier);

    document.addEventListener('mousemove', (e) => {
        magnifier.style.left = `${e.clientX + 15}px`;  // 15px offset to avoid overlap
        magnifier.style.top = `${e.clientY + 15}px`;   // 15px offset to avoid overlap
    });

    let handleMouseMove;
    let handleClick;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'screenshot') {
            const img = new Image();
            img.src = message.imageUri;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);

                handleMouseMove = (e) => {
                    const x = e.clientX;
                    const y = e.clientY;
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                    magnifier.style.backgroundColor = color;
                };

                handleClick = (e) => {
                    const x = e.clientX;
                    const y = e.clientY;
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

                    chrome.runtime.sendMessage({
                        type: 'colorPicked',
                        color: color
                    });

                    cleanup();
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('click', handleClick, { once: true });
            };
        }
    });

    function cleanup() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('click', handleClick);
        overlay.remove();
        magnifier.remove();
        window.colorPickerInjected = false;
    }
})();
