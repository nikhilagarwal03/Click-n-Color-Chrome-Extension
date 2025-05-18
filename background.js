chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['savedColors'], (result) => {
        if (!result.savedColors) {
            chrome.storage.local.set({ savedColors: [] }, () => {
                console.log("Color Picker extension initialized");
            });
        }
    });
});
