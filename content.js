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

    const rootNode = document.body || document.documentElement;
    if (!rootNode) {
        window.colorPickerInjected = false;
        return;
    }
    let isUiAttached = false;

    function attachUi() {
        if (isUiAttached) {
            return;
        }

        rootNode.appendChild(overlay);
        rootNode.appendChild(magnifier);
        isUiAttached = true;
    }

    let handleMouseMove;
    let handleClick;
    let handleKeydown;
    let handleMessage;
    let initTimeoutId;
    let canvas;
    let ctx;
    let devicePixelRatio;
    let isImageReady = false;
    let isInitializing = false;
    let pendingClick = null;

    function getColorAt(clientX, clientY) {
        const canvasX = Math.floor(clientX * devicePixelRatio);
        const canvasY = Math.floor(clientY * devicePixelRatio);

        const clampedX = Math.max(0, Math.min(canvasX, canvas.width - 1));
        const clampedY = Math.max(0, Math.min(canvasY, canvas.height - 1));

        const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
        return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    }

    function pickColorAt(clientX, clientY) {
        try {
            const color = getColorAt(clientX, clientY);

            chrome.runtime.sendMessage({
                type: 'colorPicked',
                color: color
            });
        } catch (error) {
            console.error('Error picking color:', error);
        }

        cleanup();
    }

    function cleanup() {
        if (initTimeoutId) {
            clearTimeout(initTimeoutId);
            initTimeoutId = null;
        }
        if (handleMouseMove) {
            document.removeEventListener('mousemove', handleMouseMove);
            handleMouseMove = null;
        }
        if (handleClick) {
            document.removeEventListener('click', handleClick);
            handleClick = null;
        }
        if (handleKeydown) {
            document.removeEventListener('keydown', handleKeydown);
            handleKeydown = null;
        }
        if (handleMessage) {
            chrome.runtime.onMessage.removeListener(handleMessage);
            handleMessage = null;
        }
        if (overlay && overlay.parentNode) {
            overlay.remove();
        }
        if (magnifier && magnifier.parentNode) {
            magnifier.remove();
        }
        isUiAttached = false;
        isImageReady = false;
        isInitializing = false;
        pendingClick = null;
        canvas = null;
        ctx = null;
        window.colorPickerInjected = false;
    }

    handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        if (!isImageReady || !ctx || !canvas) {
            pendingClick = { x: mouseX, y: mouseY };
            return;
        }

        pickColorAt(mouseX, mouseY);
    };

    handleMessage = (message, sender, sendResponse) => {
        if (message.type === 'screenshot') {
            if (initTimeoutId) {
                clearTimeout(initTimeoutId);
                initTimeoutId = null;
            }

            sendResponse({ status: 'ready' });

            if (isInitializing || isImageReady) {
                return;
            }

            isInitializing = true;
            attachUi();
            document.addEventListener('click', handleClick);

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
                isImageReady = true;
                isInitializing = false;

                handleMouseMove = (e) => {
                    // Get current mouse position relative to viewport
                    const mouseX = e.clientX;
                    const mouseY = e.clientY;

                    magnifier.style.left = `${mouseX + 15}px`;
                    magnifier.style.top = `${mouseY + 15}px`;
                    
                    // Convert to canvas coordinates accounting for:
                    // 1. Device pixel ratio
                    // 2. The fact that screenshot only contains visible viewport
                    try {
                        const color = getColorAt(mouseX, mouseY);
                        magnifier.style.backgroundColor = color;
                    } catch (error) {
                        console.error('Error getting pixel data:', error);
                        magnifier.style.backgroundColor = 'red';
                    }
                };

                document.addEventListener('mousemove', handleMouseMove);

                if (pendingClick) {
                    const { x, y } = pendingClick;
                    pendingClick = null;
                    pickColorAt(x, y);
                }
            };
            
            img.onerror = () => {
                console.error('Failed to load screenshot image');
                isInitializing = false;
                cleanup();
            };
        }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    initTimeoutId = setTimeout(() => {
        cleanup();
    }, 5000);

    // Add escape key to cancel color picking
    handleKeydown = (e) => {
        if (e.key === 'Escape') {
            cleanup();
        }
    };
    document.addEventListener('keydown', handleKeydown);
})();