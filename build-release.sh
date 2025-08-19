#!/bin/bash

VERSION=0.2.5

# Linux builds
NO_STRIP=true pnpm tauri build

# Windows builds
pnpm tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc
pnpm tauri build --debug --runner cargo-xwin --target x86_64-pc-windows-msvc

# Move Files

mkdir builds
mkdir builds/$VERSION

mv "src-tauri/target/release/bundle/appimage/VRChat Photo Manager_0.0.1_amd64.AppImage" builds/$VERSION/vrcpm-$VERSION.AppImage
mv "src-tauri/target/release/bundle/deb/VRChat Photo Manager_0.0.1_amd64.deb" builds/$VERSION/vrcpm-$VERSION.deb
mv "src-tauri/target/release/bundle/rpm/VRChat Photo Manager-0.0.1-1.x86_64.rpm" builds/$VERSION/vrcpm-$VERSION.rpm

mv src-tauri/target/x86_64-pc-windows-msvc/release/VRChatPhotoManager.exe builds/$VERSION/vrcpm-$VERSION.exe
mv src-tauri/target/x86_64-pc-windows-msvc/debug/VRChatPhotoManager.exe builds/$VERSION/vrcpm-$VERSION-debug.exe

mv "src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/VRChat Photo Manager_0.0.1_x64-setup.exe" builds/$VERSION/vrcpm-$VERSION-setup.exe