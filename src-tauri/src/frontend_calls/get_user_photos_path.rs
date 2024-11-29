use crate::util::get_photo_path::get_photo_path;
use std::path;

// Check if the photo config file exists
// if not just return the default vrchat path
#[tauri::command]
pub fn get_user_photos_path() -> path::PathBuf {
  get_photo_path()
}
