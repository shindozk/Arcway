#!/bin/bash
# Arcway Build Script — Arch Linux Only
# Builds AppImage and Flatpak
# Usage: ./build.sh [appimage|flatpak|all]
set -euo pipefail

BUILD_TYPE="${1:-all}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
YELLOW='\033[0;33m'
NC='\033[0m'

# ── Environment fixes ─────────────────────────────────────────────

# Force AppImages to extract-and-run instead of mounting via FUSE
export APPIMAGE_EXTRACT_AND_RUN=1

# Disable strip to avoid linuxdeploy failures
export NO_STRIP=true

# Limit parallelism to prevent Rust compiler ICE (rustc panics with too many threads)
export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-4}"

# Ensure cargo/rustc are in PATH (needed when running via sudo)
CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
if [[ -n "${SUDO_USER:-}" ]]; then
  REAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
  CARGO_HOME="${REAL_HOME}/.cargo"
fi
export PATH="$CARGO_HOME/bin:$PATH"

if ! command -v cargo &>/dev/null; then
  echo -e "${RED}Error: cargo not found. Install Rust: https://rustup.rs${NC}"
  exit 1
fi

# Ensure a default rustup toolchain is set
if command -v rustup &>/dev/null; then
  if ! rustup run stable cargo --version &>/dev/null 2>&1; then
    echo -e "${CYAN}Setting default Rust toolchain to stable...${NC}"
    rustup default stable
  fi
fi

BUNDLE_DIR="$ROOT/src-tauri/target/release/bundle"
APPIMAGE_DIR="$BUNDLE_DIR/appimage"
FLATPAK_BUILD_DIR="$ROOT/flatpak/build-dir"
FLATPAK_REPO_DIR="$ROOT/flatpak/repo"
FLATPAK_BUILD_FILES="$ROOT/flatpak/build-files"
TAURI_RELEASE="$ROOT/src-tauri/target/release"

header() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════╗${NC}"
  echo -e "${CYAN}║      ${BOLD}Arcway Build System${NC}${CYAN}         ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════╝${NC}"
  echo ""
}

step()  { echo -e "${CYAN}[$1/$2]${NC} $3"; }
ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; }
warn()  { echo -e "  ${YELLOW}!${NC} $1"; }

header

# ── Fix root-owned dist/target files (caused by previous sudo build) ──
NEEDS_CHOWN=""
if [[ -d "$ROOT/dist" ]] && [[ -n "$(find "$ROOT/dist" -user root 2>/dev/null | head -1)" ]]; then
  NEEDS_CHOWN="$ROOT/dist"
fi
if [[ -d "$ROOT/src-tauri/target" ]] && [[ -n "$(find "$ROOT/src-tauri/target" -user root 2>/dev/null | head -1)" ]]; then
  NEEDS_CHOWN="${NEEDS_CHOWN:+$NEEDS_CHOWN }$ROOT/src-tauri/target"
fi
if [[ -n "$NEEDS_CHOWN" ]]; then
  echo -e "${RED}Error: Found root-owned files from a previous sudo build:${NC}"
  for dir in $NEEDS_CHOWN; do
    echo "  - $dir"
  done
  echo ""
  echo -e "${YELLOW}Run this command to fix, then try again:${NC}"
  echo "  sudo chown -R \$(whoami):\$(id -gn) $ROOT/dist/ $ROOT/src-tauri/target/"
  exit 1
fi

# ── Clean old builds ──────────────────────────────────────────────
step 1 4 "Cleaning old builds..."

rm -f "$APPIMAGE_DIR"/*.AppImage 2>/dev/null && ok "Removed old AppImages" || ok "No old AppImages"
rm -rf "$FLATPAK_BUILD_DIR" 2>/dev/null && ok "Removed old Flatpak build dir" || ok "No old Flatpak build dir"
rm -rf "$FLATPAK_REPO_DIR" 2>/dev/null && ok "Removed old Flatpak repo" || ok "No old Flatpak repo"
rm -rf "$FLATPAK_BUILD_FILES" 2>/dev/null && ok "Removed old Flatpak build files" || ok "No old Flatpak build files"
rm -f "$ROOT/flatpak"/*.flatpak 2>/dev/null && ok "Removed old .flatpak files" || ok "No old .flatpak files"

# ── Build frontend + Tauri ────────────────────────────────────────
echo ""
step 2 4 "Building Tauri application..."
cd "$ROOT"
# CARGO_BUILD_JOBS is set above to prevent Rust ICE
npx tauri build
ok "Tauri application built"

# ── Build AppImage ─────────────────────────────────────────────────
echo ""
step 3 4 "Verifying AppImage output..."

build_appimage() {
  local appimage
  appimage=$(find "$APPIMAGE_DIR" -name "*.AppImage" -type f 2>/dev/null | head -1)
  if [[ -n "$appimage" ]]; then
    local size
    size=$(du -h "$appimage" | cut -f1)
    ok "AppImage: $(basename "$appimage") ($size)"
  else
    fail "No AppImage found in $APPIMAGE_DIR"
  fi
}

if [[ "$BUILD_TYPE" == "appimage" ]] || [[ "$BUILD_TYPE" == "all" ]]; then
  build_appimage
fi

# ── Build Flatpak ──────────────────────────────────────────────────
echo ""
step 4 4 "Packaging Flatpak..."

build_flatpak() {
  # Check dependencies
  if ! command -v flatpak-builder &>/dev/null; then
    fail "flatpak-builder not installed — skipping Flatpak"
    echo "  Install with: sudo pacman -S flatpak-builder"
    return 1
  fi

  if ! flatpak list --runtime --columns=ref 2>/dev/null | grep -q "org.freedesktop.Platform//24.08"; then
    warn "freedesktop Platform runtime not installed, attempting to install..."
    flatpak install -y --system --runtime flathub org.freedesktop.Platform//24.08 2>/dev/null || {
      fail "Could not install freedesktop runtime"
      return 1
    }
  fi

  if ! flatpak list --sdk --columns=ref 2>/dev/null | grep -q "org.freedesktop.Sdk//24.08"; then
    warn "freedesktop SDK not installed, attempting to install..."
    flatpak install -y --system flathub org.freedesktop.Sdk//24.08 2>/dev/null || {
      fail "Could not install freedesktop SDK"
      return 1
    }
  fi

  # Prepare build-files directory with compiled binary and assets
  mkdir -p "$FLATPAK_BUILD_FILES"

  if [[ -f "$TAURI_RELEASE/arcway" ]]; then
    cp "$TAURI_RELEASE/arcway" "$FLATPAK_BUILD_FILES/arcway"
    chmod 755 "$FLATPAK_BUILD_FILES/arcway"
  else
    fail "Compiled binary not found at $TAURI_RELEASE/arcway"
    return 1
  fi

  # Copy desktop file
  if [[ -f "$ROOT/src-tauri/com.arcway.app.desktop" ]]; then
    cp "$ROOT/src-tauri/com.arcway.app.desktop" "$FLATPAK_BUILD_FILES/com.arcway.app.desktop"
  else
    fail "Desktop file not found"
    return 1
  fi

  # Copy or generate metainfo
  if [[ -f "$ROOT/flatpak/com.arcway.app.metainfo.xml" ]]; then
    cp "$ROOT/flatpak/com.arcway.app.metainfo.xml" "$FLATPAK_BUILD_FILES/com.arcway.app.metainfo.xml"
  elif [[ -f "$ROOT/src-tauri/com.arcway.app.metainfo.xml" ]]; then
    cp "$ROOT/src-tauri/com.arcway.app.metainfo.xml" "$FLATPAK_BUILD_FILES/com.arcway.app.metainfo.xml"
  else
    # Generate a minimal metainfo file
    cat > "$FLATPAK_BUILD_FILES/com.arcway.app.metainfo.xml" << 'METAINFO'
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>com.arcway.app</id>
  <metadata_license>MIT</metadata_license>
  <project_license>MIT</project_license>
  <name>Arcway</name>
  <summary>Arch Linux App Store</summary>
  <description>
    <p>A modern app store for Arch Linux supporting Flatpak, AUR, and Paru.</p>
  </description>
  <url type="homepage">https://github.com/arcway-app/arcway</url>
  <provides>
    <binary>arcway</binary>
  </provides>
  <categories>
    <category>Utility</category>
    <category>System</category>
  </categories>
</component>
METAINFO
    ok "Generated minimal metainfo.xml"
  fi

  # Copy icon (resize to 512x512 max for Flatpak validation)
  if [[ -f "$ROOT/src/assets/logo/arcway_logo.png" ]]; then
    convert "$ROOT/src/assets/logo/arcway_logo.png" -resize 512x512 "$FLATPAK_BUILD_FILES/icon.png"
  elif [[ -f "$ROOT/src-tauri/icons/icon.png" ]]; then
    convert "$ROOT/src-tauri/icons/icon.png" -resize 512x512 "$FLATPAK_BUILD_FILES/icon.png"
  else
    warn "No icon found — Flatpak may not have an icon"
  fi

  ok "Prepared Flatpak build files"

  # Build with flatpak-builder, exporting to a repo
  mkdir -p "$FLATPAK_REPO_DIR"
  flatpak-builder --force-clean \
    --repo="$FLATPAK_REPO_DIR" \
    "$FLATPAK_BUILD_DIR" \
    "$ROOT/flatpak/com.arcway.app.yml" && {
    ok "Flatpak repo built successfully"
  } || {
    fail "Flatpak build failed"
    return 1
  }

  # Export the Flatpak from the repo as a .flatpak file
  local flatpak_file="$ROOT/flatpak/arcway.flatpak"
  flatpak build-bundle "$FLATPAK_REPO_DIR" "$flatpak_file" com.arcway.app && {
    local size
    size=$(du -h "$flatpak_file" | cut -f1)
    ok "Flatpak: arcway.flatpak ($size)"
  } || {
    warn "Could not export .flatpak file, but Flatpak repo was built at $FLATPAK_REPO_DIR"
  }
}

if [[ "$BUILD_TYPE" == "flatpak" ]] || [[ "$BUILD_TYPE" == "all" ]]; then
  build_flatpak
fi

echo ""
echo -e "${GREEN}${BOLD}✓ Build complete!${NC}"
