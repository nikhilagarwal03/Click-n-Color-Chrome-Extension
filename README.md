<p align="center">
    <img src="icon.png" alt="Click-n-Color Logo" width="120">
</p>

<h1 align="center">🎨 Click-n-Color</h1>
<h2 align="center">A DAILY UTILITY FOR DEV!!</h2>

<p align="center">
    A smart and stylish Chrome extension to pick, save, and manage colors directly from any website.
</p>

<p align="center">
    <img src="https://img.shields.io/badge/version-1.0-blueviolet?style=flat-square">
    <img src="https://img.shields.io/badge/manifest-v3-orange?style=flat-square">
    <img src="https://img.shields.io/badge/built%20with-JavaScript%20%7C%20HTML%20%7C%20CSS-informational?style=flat-square">
    <img src="https://img.shields.io/github/license/nikhilagarwal03/Click-n-Color-Chrome-Extension?style=flat-square">
</p>

---

## 📦 Features

- 🖱️ **Pick colors** --> directly from any website.
- 💾 **Save favorite colors** --> to a palette.
- 🔁 **Copy color values** --> in RGB, HEX, or HSL.
- 📤 **Export palettes** as:
  - JSON
  - CSS Variables
  - PNG Image

- ⚙️ **Custom Settings**:
  - Default color format(RGB)
  - Max palette size(50)
  - Auto-copy toggle(Enabled)

- 🎨 **Theme Selection**:
  - Dark (default)
  - Light
  - Blue
  - I Recommend Blue Theme(Yes it is my Favourite Color!!)

---

## 📁 Project Structure
click-n-color/
  - ├── background.js   # Initializes storage on install
  - ├── content.js   # (Required for color picking functionality)
  - ├── popup.html   # Extension popup UI
  - ├── popup.css   # Fully themed, responsive styling
  - ├── popup.js   # Event handling & color logic
  - ├── manifest.json   # Chrome extension config (V3)
  - ├── icon.png   # Icon for the extension


--- 

## 🚀 Getting Started

1. Clone/download this repository.
2. Go to `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Pin the extension and start picking colors!!

---

## 🧠 How It Works

- Injects a content script to capture a screen pixel.
- Displays the selected color in your desired format.
- Stores colors persistently using `chrome.storage.local`.
- Lets you export the color palette for reuse.

---

## 🧑‍💻 Author

Made with 💙 by 'Nikhil Agarwal'

---

## 📝 License

This project is licensed under the MIT License.  
Feel free to use, modify, and share it.

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on [GitHub](https://github.com/nikhilagarwal03/Click-n-Color-Chrome-Extension)!




