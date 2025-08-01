#!/bin/bash

VERSION=0.2.5

# Linux builds
NO_STRIP=true pnpm tauri build

# Windows builds
pnpm tauri build --target x86_64-pc-windows-gnu
pnpm tauri build --debug --target x86_64-pc-windows-gnu

# Move Files

mkdir builds
mkdir builds/$VERSION

mv src-tauri/target/release/bundle/appimage/vrchat-photo-manager_0.0.1_amd64.AppImage builds/$VERSION/vrchat-photo-manager_linux_amd64.AppImage
mv src-tauri/target/release/bundle/deb/vrchat-photo-manager_0.0.1_amd64.deb builds/$VERSION/vrchat-photo-manager_linux_amd64.deb
mv src-tauri/target/release/bundle/rpm/vrchat-photo-manager-0.0.1-1.x86_64.rpm builds/$VERSION/vrchat-photo-manager_linux_x86_64.rpm

mv src-tauri/target/x86_64-pc-windows-gnu/release/VRChatPhotoManager.exe builds/$VERSION/vrcpm-$VERSION.exe
mv src-tauri/target/x86_64-pc-windows-gnu/debug/VRChatPhotoManager.exe builds/$VERSION/vrcpm-$VERSION-debug.exe