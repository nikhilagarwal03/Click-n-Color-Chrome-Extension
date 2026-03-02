chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['savedColors', 'lastPickedColor'], (result) => {
        const initialState = {};

        if (!Array.isArray(result.savedColors)) {
            initialState.savedColors = [];
        }

        if (typeof result.lastPickedColor === 'undefined') {
            initialState.lastPickedColor = null;
        }

        if (Object.keys(initialState).length > 0) {
            chrome.storage.local.set(initialState, () => {
                console.log("The Color Picker extension initialized");
            });
        }
    });
});

function isTabUrlSupported(url) {
    return !!url && /^(https?:)\/\//i.test(url);
}

function captureVisibleTab(windowId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(windowId, {
            format: 'png',
            quality: 100
        }, (imageUri) => {
            if (chrome.runtime.lastError || !imageUri) {
                reject(new Error(chrome.runtime.lastError?.message || 'Unable to capture visible tab'));
                return;
            }

            resolve(imageUri);
        });
    });
}

function sendScreenshotWithRetry(tabId, imageUri, retriesLeft = 6) {
    return new Promise((resolve, reject) => {
        const attempt = (remainingRetries) => {
            chrome.tabs.sendMessage(tabId, {
                type: 'screenshot',
                imageUri
            }, (response) => {
                if (chrome.runtime.lastError || !response || response.status !== 'ready') {
                    if (remainingRetries > 0) {
                        setTimeout(() => attempt(remainingRetries - 1), 120);
                        return;
                    }

                    reject(new Error(chrome.runtime.lastError?.message || 'No response from content script'));
                    return;
                }

                resolve();
            });
        };

        attempt(retriesLeft);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'startColorPick') {
        (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab || !tab.id) {
                    sendResponse({ status: 'error', message: 'No active tab found.' });
                    return;
                }

                if (!isTabUrlSupported(tab.url)) {
                    sendResponse({ status: 'error', message: 'This page is not supported for color picking.' });
                    return;
                }

                const imageUri = await captureVisibleTab(tab.windowId);
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });

                await sendScreenshotWithRetry(tab.id, imageUri, 6);
                sendResponse({ status: 'started' });
            } catch (error) {
                console.error('startColorPick failed:', error);
                sendResponse({ status: 'error', message: 'Unable to start picker on this page.' });
            }
        })();

        return true;
    }

    if (message.type !== 'colorPicked' || typeof message.color !== 'string') {
        return;
    }

    chrome.storage.local.get(['savedColors', 'settings'], (result) => {
        let savedColors = Array.isArray(result.savedColors) ? result.savedColors : [];
        const settings = result.settings && typeof result.settings === 'object' ? result.settings : {};
        const parsedMax = parseInt(settings.maxPaletteSize, 10);
        const maxPaletteSize = Number.isFinite(parsedMax)
            ? Math.min(100, Math.max(10, parsedMax))
            : 50;

        if (!savedColors.includes(message.color)) {
            savedColors.unshift(message.color);
            if (savedColors.length > maxPaletteSize) {
                savedColors = savedColors.slice(0, maxPaletteSize);
            }
        }

        chrome.storage.local.set({
            savedColors,
            lastPickedColor: message.color
        }, () => {
            chrome.action.openPopup().catch(() => {
                chrome.windows.create({
                    url: chrome.runtime.getURL('popup.html'),
                    type: 'popup',
                    width: 560,
                    height: 760,
                    focused: true
                });
            });

            sendResponse({ status: 'saved' });
        });
    });

    return true;
});
