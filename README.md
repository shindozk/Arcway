<div align="center">

<img src="https://iili.io/CaXQof2.png" alt="Arcway Logo" width="120" />

# Arcway

**A modern app store for Arch Linux.**

Flatpak · AUR · Paru — all in one place.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/built%20with-Tauri%202-FFC131?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)

</div>

---

## Screenshots

<div align="center">

| Home | Package Details | Search |
|:---:|:---:|:---:|
| ![Home](https://iili.io/CaXZT1p.png) | ![Details](https://iili.io/Cahz8be.png) | ![Search](https://iili.io/CahISYN.png) |

</div>

---

## Features

- 🔍 **Unified search** — Flathub + AUR in one results page
- 📦 **Package management** — Install, update, and remove packages
- 🎨 **Material Design 3** — Modern, adaptive UI
- 🌍 **i18n** — 21 languages
- 🔐 **User accounts** — Sync settings across devices
- ⌨️ **Keyboard shortcuts** — `Ctrl+K` search, `Ctrl+1-5` navigate
- 💬 **Ratings & comments** — Community-driven package reviews
- 📱 **AppImage support** — Install and manage AppImages

## Requirements

- **Arch Linux** (or Arch-based distro)
- `base-devel`
- `nodejs`, `npm`
- `flatpak-builder` *(for Flatpak builds)*

## Install

### AppImage

```bash
# Download the latest .AppImage from Releases
chmod +x Arcway-*.AppImage
./Arcway-*.AppImage
```

### Flatpak

```bash
flatpak install Arcway-*.flatpak
flatpak run com.arcway.app
```

## Development

```bash
git clone https://github.com/arcway-app/arcway
cd arcway
npm install
npm run tauri dev
```

## Build

```bash
# Build both AppImage and Flatpak
./build.sh

# Or build individually
./build.sh appimage
./build.sh flatpak
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Rust, Tauri 2 |
| UI | Material Design 3 |
| State | Zustand |
| Package managers | Flatpak, AUR (yay/paru) |

## License

MIT © 2026 ShindoZk and Arcway Contributors
