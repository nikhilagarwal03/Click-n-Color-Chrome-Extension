chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['savedColors'], (result) => {
        if (!result.savedColors) {
            chrome.storage.local.set({ savedColors: [] }, () => {
                console.log("The Color Picker extension initialized");
            });
        }
    });
});
