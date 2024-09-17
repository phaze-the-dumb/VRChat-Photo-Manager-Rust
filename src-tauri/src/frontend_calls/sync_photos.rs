use crate::photosync;
use std::thread;
use crate::util::get_photo_path::get_photo_path;

// On requested sync the photos to the cloud
#[tauri::command]
pub fn sync_photos(token: String, window: tauri::Window) {
  thread::spawn(move || {
    photosync::sync_photos(token, get_photo_path(), window);
  });
}