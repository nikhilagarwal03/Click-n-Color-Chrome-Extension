document.addEventListener('DOMContentLoaded', () => {
    //Html Elements 
    const pickColorBtn = document.getElementById('pickColorBtn'); // Pick Color Button-- added a EventListener
    const colorPreview = document.getElementById('colorPreview');
    const colorValue = document.getElementById('colorValue');
    const savedColorsList = document.getElementById('savedColorsList');
    const notification = document.getElementById('notification'); // added notification to Show-notification Function
    const copyBtn = document.querySelector('.copy-btn'); // copy to CLickboard Button-- added a EventListner
    const formatChips = document.querySelectorAll('.format-chip'); // Format changing-- addeda a Eventlistner
    const clearAllBtn = document.querySelector('.action-btn'); // Clear ALL Button-- added a EventListner
    const exportBtn = document.getElementById('exportBtn');  // Export Palette Button-- added a EventListner
    const settingsBtn = document.getElementById('settingsBtn');  // Settings Button-- added a EventListner
    const openThemesBtn = document.getElementById('openThemesBtn');  // Themes Button-- added a EventListner
    //Modal Html Elements
    const exportPaletteModal = document.getElementById('exportPaletteModalWrapper');
    const settingsModal = document.getElementById('settingsModalWrapper');
    const themesModal = document.getElementById('themesModalWrapper');
    const closeModalButtons = document.querySelectorAll('.close-modal'); //close modal button(for ExportPalette,Settings,Themes)-- added a EventListner


    // Default settings , later can be customized
    let settings = {
        defaultFormat: 'RGB',
        maxPaletteSize: 50,
        autoCopy: true
    };


    // Load settings and saved colors
    function loadUserData() {
        chrome.storage.local.get(['settings', 'savedColors', 'theme'], (result) => {
            // Load settings
            if (result.settings) {
                settings = result.settings;
                // Apply default format
                activateFormatChip(settings.defaultFormat.toUpperCase());
                // Set form values in settings modal
                document.querySelector(`input[name="defaultFormat"][value="${settings.defaultFormat.toLowerCase()}"]`).checked = true;
                document.getElementById('maxPaletteSize').value = settings.maxPaletteSize;
                document.getElementById('autoCopy').checked = settings.autoCopy;
            }
            // Load saved colors
            const savedColors = result.savedColors || [];
            renderSavedColors(savedColors);
            // Load theme
            if (result.theme) {
                document.querySelector(`input[name="theme"][value="${result.theme}"]`).checked = true;
                applyTheme(result.theme);
            }
        });
    }
    // Activate format chip
    function activateFormatChip(format) {
        formatChips.forEach(chip => {
            chip.classList.toggle('active', chip.textContent === format);
        });
    }
    // Initialize
    loadUserData();


    // adding Functionality to Pick A Color Button
    pickColorBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            // First, inject the content script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Add a small delay to ensure content script is fully loaded
            await new Promise(resolve => setTimeout(resolve, 100));

            // Then, capture the screenshot and send it to content script
            chrome.tabs.captureVisibleTab(null, {
                format: "png",
                quality: 100 // Ensure maximum quality
            }, (imageUri) => {
                if (chrome.runtime.lastError) {
                    console.error('Screenshot error:', chrome.runtime.lastError.message);
                    return;
                }

                // Send the screenshot to the content script
                chrome.tabs.sendMessage(tab.id, {
                    type: 'screenshot',
                    imageUri: imageUri
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Message sending error:', chrome.runtime.lastError.message);
                    }
                });
            });
        } catch (error) {
            console.error('Color picking error:', error);
        }
    });


    // Notifications related program
    // Copy color to clipboard
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(colorValue.textContent);
        showNotification('Color copied to clipboard!');
    });
    // Format switching
    formatChips.forEach(chip => {
        chip.addEventListener('click', () => {
            activateFormatChip(chip.textContent);
            updateColorValueFormat();
            showNotification('Format Changed!');
        });
    });
    // Clear All functionality
    clearAllBtn.addEventListener('click', () => {
        chrome.storage.local.set({ savedColors: [] }, () => {
            renderSavedColors([]);
            showNotification('All colors cleared!');
        });
    });
    // Show notification
    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }


    // Export button
    exportBtn.addEventListener('click', () => {
        exportPaletteModal.style.display = 'flex';
    });
    // Settings button
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });
    // Themes button
    openThemesBtn.addEventListener('click', () => {
        themesModal.style.display = 'flex';
    });
    // Close modal buttons
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            exportPaletteModal.style.display = 'none';
            settingsModal.style.display = 'none';
            themesModal.style.display = 'none';
        });
    });
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === exportPaletteModal) {
            exportPaletteModal.style.display = 'none';
        }
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (e.target === themesModal) {
            themesModal.style.display = 'none';
        }
    });


    // Update color value based on selected format
    function updateColorValueFormat() {
        const currentColor = getComputedStyle(colorPreview).backgroundColor;
        const format = document.querySelector('.format-chip.active').textContent;
        if (format === 'RGB') {
            colorValue.textContent = currentColor;
        } else if (format === 'HEX') {
            colorValue.textContent = rgbToHex(currentColor);
        } else if (format === 'HSL') {
            colorValue.textContent = rgbToHsl(currentColor);
        }
    }
    // function for converting RGB to HEX
    function rgbToHex(rgb) {
        // Extract RGB values
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return rgb;
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#hex${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    // function for converting RGB to HEX
    function rgbToHsl(rgb) {
        // Extract RGB values
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return rgb;
        let r = parseInt(match[1]) / 255;
        let g = parseInt(match[2]) / 255;
        let b = parseInt(match[3]) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h = Math.round(h * 60);
        }
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        return `hsl(${h}, ${s}%, ${l}%)`;
    }


    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'colorPicked') {
            const color = message.color;
            // Update UI
            colorPreview.style.backgroundColor = color;
            // Apply the active format
            updateColorValueFormat();
            // Auto-copy if enabled
            if (settings.autoCopy) {
                navigator.clipboard.writeText(colorValue.textContent);
                showNotification('Color copied to clipboard!');
            }
            // Save color
            saveColor(color);
        }
    });


    function saveColor(color) {
        chrome.storage.local.get(['savedColors'], (result) => {
            let savedColors = result.savedColors || [];
            // Prevent duplicates
            if (!savedColors.includes(color)) {
                savedColors.unshift(color); // Add new colors at the beginning
                // Enforce max palette size
                if (settings.maxPaletteSize && savedColors.length > settings.maxPaletteSize) {
                    savedColors = savedColors.slice(0, settings.maxPaletteSize);
                }
                chrome.storage.local.set({ savedColors }, () => {
                    renderSavedColors(savedColors);
                });
            }
        });
    }


    // Delete Color
    function deleteColor(colorToDelete) {
        chrome.storage.local.get(['savedColors'], (result) => {
            const savedColors = result.savedColors || [];
            const updatedColors = savedColors.filter(color => color !== colorToDelete);
            chrome.storage.local.set({ savedColors: updatedColors }, () => {
                renderSavedColors(updatedColors);
            });
        });
    }


    // Export Functions and options
    // Export options
    document.getElementById('exportJson').addEventListener('click', exportAsJson);
    document.getElementById('exportCss').addEventListener('click', exportAsCss);
    document.getElementById('exportImage').addEventListener('click', exportAsImage);
    // Export as JSON
    function exportAsJson() {
        chrome.storage.local.get(['savedColors'], (result) => {
            const savedColors = result.savedColors || [];
            const dataStr = JSON.stringify(savedColors, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileName = 'color-palette.json';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileName);
            linkElement.click();

            exportPaletteModal.style.display = 'none';
            showNotification('Palette exported as JSON!');
        });
    }
    // Export as CSS Variables
    function exportAsCss() {
        chrome.storage.local.get(['savedColors'], (result) => {
            const savedColors = result.savedColors || [];
            let cssVars = ':root {\n';
            savedColors.forEach((color, index) => {
                // Convert all colors to hex for CSS
                const hexColor = color.startsWith('#') ? color : rgbToHex(color);
                cssVars += `  --color-${index + 1}: ${hexColor};\n`;
            });
            cssVars += '}';
            const dataUri = 'data:text/css;charset=utf-8,' + encodeURIComponent(cssVars);
            const exportFileName = 'color-variables.css';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileName);
            linkElement.click();
            exportPaletteModal.style.display = 'none';
            showNotification('Palette exported as CSS variables!');
        });
    }
    // Export as Image
    function exportAsImage() {
        chrome.storage.local.get(['savedColors'], (result) => {
            const savedColors = result.savedColors || [];
            if (savedColors.length === 0) {
                showNotification('No colors to export!');
                exportPaletteModal.style.display = 'none';
                return;
            }
            // Create canvas for the palette image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const colorSize = 50; // Size of each color square
            const padding = 10;
            const cols = Math.min(5, savedColors.length);
            const rows = Math.ceil(savedColors.length / cols);
            canvas.width = cols * colorSize + padding * 2;
            canvas.height = rows * colorSize + padding * 2;
            // Fill background
            ctx.fillStyle = '#121212';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw color squares
            savedColors.forEach((color, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                ctx.fillStyle = color;
                ctx.fillRect(
                    padding + col * colorSize,
                    padding + row * colorSize,
                    colorSize - 2,
                    colorSize - 2
                );
            });
            // Export canvas as PNG
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = 'color-palette.png';
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                exportPaletteModal.style.display = 'none';
                showNotification('Palette exported as image!');
            });
        });
    }


    // Render Saved Colors
    function renderSavedColors(colors) {
        savedColorsList.innerHTML = '';
        if (colors.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.classList.add('empty-state');
            emptyState.innerHTML = '<span style="display: inline-block; white-space: nowrap; font-weight: 600">No colors saved yet. Pick a color To start</span>';
            savedColorsList.appendChild(emptyState);
            return;
        }
        colors.forEach(color => {
            const colorDiv = document.createElement('div');
            colorDiv.classList.add('saved-color');
            colorDiv.style.backgroundColor = color;
            colorDiv.setAttribute('data-color', color);
            // Add delete button
            const deleteBtn = document.createElement('span');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the click from bubbling to the parent
                deleteColor(color);
                showNotification('Color removed!');
            });
            colorDiv.appendChild(deleteBtn);
            // Click to select color and copy
            colorDiv.addEventListener('click', () => {
                // Update the color preview
                colorPreview.style.backgroundColor = color;
                // Update color value with active format
                updateColorValueFormat();
                // Copy to clipboard
                navigator.clipboard.writeText(colorValue.textContent);
                showNotification('Color copied to clipboard!');
            });
            savedColorsList.appendChild(colorDiv);
        });
    }


    // Save settings
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    function saveSettings() {
        const defaultFormat = document.querySelector('input[name="defaultFormat"]:checked').value;
        const maxPaletteSize = parseInt(document.getElementById('maxPaletteSize').value);
        const autoCopy = document.getElementById('autoCopy').checked;
        settings = {
            defaultFormat,
            maxPaletteSize,
            autoCopy
        };
        chrome.storage.local.set({ settings }, () => {
            settingsModal.style.display = 'none';
            showNotification('Settings saved!');

            // Apply default format immediately
            activateFormatChip(defaultFormat.toUpperCase());
            updateColorValueFormat();
        });
    }


    // Save theme settings
    document.getElementById('saveThemeSettingsBtn').addEventListener('click', saveThemeSettings);
    function saveThemeSettings() {
        const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
        chrome.storage.local.set({ theme: selectedTheme }, () => {
            themesModal.style.display = 'none';
            showNotification('Theme saved!');
            // Apply theme
            applyTheme(selectedTheme);
        });
    }


    // Apply theme
    function applyTheme(theme) {
        const root = document.documentElement;
        // Reset to default theme
        root.style.setProperty('--primary', '#8a2be2');
        root.style.setProperty('--secondary', '#00bfff');
        root.style.setProperty('--accent', '#ff1414');
        root.style.setProperty('--background', '#121212');
        root.style.setProperty('--text', '#ffffff');
        root.style.setProperty('--card', '#1e1e1e');
        root.style.setProperty('--hover', '#f5e0e0');
        // Apply theme-specific colors
        if (theme === 'light') {
            root.style.setProperty('--background', '#f5f5f5');
            root.style.setProperty('--text', '#333333');
            root.style.setProperty('--card', '#e0e0e0');
            root.style.setProperty('--hover', '#d0d0d0');
        } else if (theme === 'blue') {
            root.style.setProperty('--primary', '#1e88e5');
            root.style.setProperty('--secondary', '#64b5f6');
            root.style.setProperty('--accent', '#ff6d00');
            root.style.setProperty('--background', '#0a1929');
            root.style.setProperty('--card', '#102a43');
        }
    }
})