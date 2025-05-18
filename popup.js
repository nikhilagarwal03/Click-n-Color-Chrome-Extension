document.addEventListener('DOMContentLoaded', () => {
    const pickColorBtn = document.getElementById('pickColorBtn');
    const colorPreview = document.getElementById('colorPreview');
    const colorValue = document.getElementById('colorValue');
    const savedColorsList = document.getElementById('savedColorsList');
    const notification = document.getElementById('notification');
    const copyBtn = document.querySelector('.copy-btn');
    const formatChips = document.querySelectorAll('.format-chip');
    const clearAllBtn = document.querySelector('.action-btn');
    const exportBtn = document.getElementById('exportBtn');
    const settingsBtn = document.getElementById('settingsBtn');

    // Default settings
    let settings = {
        defaultFormat: 'RGB',
        maxPaletteSize: 50,
        autoCopy: true
    };

    // Load user settings first
    chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
            settings = result.settings;
            
            // Apply default format on load
            const formatToActivate = settings.defaultFormat.toUpperCase();
            formatChips.forEach(chip => {
                if (chip.textContent === formatToActivate) {
                    formatChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                }
            });
        }
        // Then load saved colors
        chrome.storage.local.get(['savedColors'], (result) => {
            const savedColors = result.savedColors || [];
            renderSavedColors(savedColors);
        });
    });

    // Pick Color Button Handler
    pickColorBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            // First, inject the content script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Then, capture the screenshot and send it to content script
            chrome.tabs.captureVisibleTab(null, { format: "png" }, (imageUri) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    return;
                }

                chrome.tabs.sendMessage(tab.id, { type: 'screenshot', imageUri });
            });
        } catch (error) {
            console.error('Color picking error:', error);
        }
    });

    // Copy functionality
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(colorValue.textContent);
        showNotification('Color copied to clipboard!');
    });

    // Format switching
    formatChips.forEach(chip => {
        chip.addEventListener('click', () => {
            formatChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Convert current color to selected format
            const currentColor = getComputedStyle(colorPreview).backgroundColor;
            const format = chip.textContent;

            if (format === 'RGB') {
                colorValue.textContent = currentColor;
            } else if (format === 'HEX') {
                colorValue.textContent = rgbToHex(currentColor);
            } else if (format === 'HSL') {
                colorValue.textContent = rgbToHsl(currentColor);
            }
        });
    });

    // Add Clear All functionality
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

    // Helper functions for color conversion
    function rgbToHex(rgb) {
        // Extract RGB values
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return rgb;

        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

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

    // Listen for color picked message
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'colorPicked') {
            const color = message.color;

            // Update UI
            colorPreview.style.backgroundColor = color;
            colorValue.textContent = color;

            // Apply the active format
            const activeFormat = document.querySelector('.format-chip.active').textContent;
            if (activeFormat === 'RGB') {
                colorValue.textContent = color;
            } else if (activeFormat === 'HEX') {
                colorValue.textContent = rgbToHex(color);
            } else if (activeFormat === 'HSL') {
                colorValue.textContent = rgbToHsl(color);
            }

            // Auto-copy if enabled
            if (settings.autoCopy) {
                navigator.clipboard.writeText(colorValue.textContent);
                showNotification('Color copied to clipboard!');
            }

            // Auto-save color
            saveColor(color);
        }
    });

    // Save Color Function
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

    // Render Saved Colors
    function renderSavedColors(colors) {
        savedColorsList.innerHTML = '';

        if (colors.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.classList.add('empty-state');
            emptyState.innerHTML = '<p>No colors saved yet.</p>';
            savedColorsList.appendChild(emptyState);
            return;
        }

        colors.forEach(color => {
            const colorDiv = document.createElement('div');
            colorDiv.classList.add('saved-color');
            colorDiv.style.backgroundColor = color;
            colorDiv.setAttribute('data-color', color);

            // delete button (× mark)
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
                // Update the color preview and value
                colorPreview.style.backgroundColor = color;

                // Get the active format
                const activeFormat = document.querySelector('.format-chip.active').textContent;

                // Convert and display the color in the active format
                if (activeFormat === 'RGB') {
                    colorValue.textContent = color;
                } else if (activeFormat === 'HEX') {
                    colorValue.textContent = rgbToHex(color);
                } else if (activeFormat === 'HSL') {
                    colorValue.textContent = rgbToHsl(color);
                }

                // Copy to clipboard
                navigator.clipboard.writeText(colorValue.textContent);
                showNotification('Color copied to clipboard!');
            });

            // Right-click to delete
            colorDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                deleteColor(color);
            });

            savedColorsList.appendChild(colorDiv);
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

    // Export Palette functionality
    exportBtn.addEventListener('click', () => {
        // Create a modal for export options
        const exportModal = document.createElement('div');
        exportModal.classList.add('modal');

        exportModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Export Palette</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="setting-group">
                    <label>Choose Export Format</label>
                    <div class="export-options">
                        <button id="exportJson" class="footer-btn">Export as JSON</button>
                        <button id="exportCss" class="footer-btn">Export as CSS Variables</button>
                        <button id="exportImage" class="footer-btn">Export as Image</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(exportModal);
    // Style the export options
    const exportOptions = exportModal.querySelector('.export-options');
    exportOptions.style.display = 'flex';
    exportOptions.style.flexDirection = 'column';
    exportOptions.style.gap = '10px';
    exportOptions.style.marginTop = '10px';

    // Make buttons more prominent
    const exportButtons = exportOptions.querySelectorAll('.footer-btn');
    exportButtons.forEach(btn => {
        btn.style.padding = '10px';
        btn.style.backgroundColor = 'var(--card)';
        btn.style.border = '1px solid var(--secondary)';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s ease';
    });

    // Close modal when clicking X or outside
    const closeModal = exportModal.querySelector('.close-modal');
    closeModal.addEventListener('click', () => {
        exportModal.remove();
    });

    window.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.remove();
        }
    });

    // Export as JSON
    document.getElementById('exportJson').addEventListener('click', () => {
        chrome.storage.local.get(['savedColors'], (result) => {
            const savedColors = result.savedColors || [];
            const dataStr = JSON.stringify(savedColors, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'color-palette.json';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            exportModal.remove();
            showNotification('Palette exported as JSON!');
        });
    });

    // Export as CSS Variables
    document.getElementById('exportCss').addEventListener('click', () => {
        chrome.storage.local.get(['savedColors'], (result) => {
            const savedColors = result.savedColors || [];
            let cssVars = ':root {\n';
            
            savedColors.forEach((color, index) => {
                // Convert all colors to hex for CSS
                const hexColor = color.startsWith('#') ? color : rgbToHex(color);
                cssVars += `  --color-${index + 1}: ${hexColor};\n`;
            });
            
            cssVars += '}';
            
            const dataUri = 'data:text/css;charset=utf-8,'+ encodeURIComponent(cssVars);
            const exportFileDefaultName = 'color-variables.css';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            exportModal.remove();
            showNotification('Palette exported as CSS variables!');
        });
    });

    // Export as Image
    document.getElementById('exportImage').addEventListener('click', () => {
        chrome.storage.local.get(['savedColors'], (result) => {
            const savedColors = result.savedColors || [];
            if (savedColors.length === 0) {
                showNotification('No colors to export!');
                exportModal.remove();
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

                exportModal.remove();
                showNotification('Palette exported as image!');
                });
            });
        });
    });

    // Settings functionality
    settingsBtn.addEventListener('click', () => {
        // Create a modal for settings
        const settingsModal = document.createElement('div');
        settingsModal.classList.add('modal');

        settingsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Settings</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="setting-group">
                        <label>Default Color Format</label>
                        <div class="setting-options">
                            <label><input type="radio" name="defaultFormat" value="rgb" checked> RGB</label>
                            <label><input type="radio" name="defaultFormat" value="hex"> HEX</label>
                            <label><input type="radio" name="defaultFormat" value="hsl"> HSL</label>
                        </div>
                    </div>
                    <div class="setting-group">
                        <label>Maximum Palette Size</label>
                        <input type="number" id="maxPaletteSize" min="10" max="100" value="50">
                    </div>
                    <div class="setting-group">
                        <label>Auto-copy on Pick</label>
                        <label class="switch">
                            <input type="checkbox" id="autoCopy" checked>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveSettings" class="footer-btn">Save Settings</button>
                </div>
            </div>
        `;

        document.body.appendChild(settingsModal);

        // Close modal when clicking X or outside
        const closeModal = document.querySelector('.close-modal');
        closeModal.addEventListener('click', () => {
            settingsModal.remove();
        });

        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.remove();
            }
        });

        // Load current settings
        document.querySelector(`input[name="defaultFormat"][value="${settings.defaultFormat}"]`).checked = true;
        document.getElementById('maxPaletteSize').value = settings.maxPaletteSize;
        document.getElementById('autoCopy').checked = settings.autoCopy;

        // Save settings
        document.getElementById('saveSettings').addEventListener('click', () => {
            const defaultFormat = document.querySelector('input[name="defaultFormat"]:checked').value;
            const maxPaletteSize = document.getElementById('maxPaletteSize').value;
            const autoCopy = document.getElementById('autoCopy').checked;

            settings = {
                defaultFormat,
                maxPaletteSize,
                autoCopy
            };

            chrome.storage.local.set({ settings }, () => {
                settingsModal.remove();
                showNotification('Settings saved!');

                // Apply default format immediately
                formatChips.forEach(chip => {
                    if (chip.textContent === defaultFormat) {
                        formatChips.forEach(c => c.classList.remove('active'));
                        chip.classList.add('active');
                        
                        // Update color value display to match new format
                        const currentColor = getComputedStyle(colorPreview).backgroundColor;
                        if (defaultFormat === 'RGB') {
                            colorValue.textContent = currentColor;
                        } else if (defaultFormat === 'HEX') {
                            colorValue.textContent = rgbToHex(currentColor);
                        } else if (defaultFormat === 'HSL') {
                            colorValue.textContent = rgbToHsl(currentColor);
                        }
                    }
                });
            });
        });
    });
});
