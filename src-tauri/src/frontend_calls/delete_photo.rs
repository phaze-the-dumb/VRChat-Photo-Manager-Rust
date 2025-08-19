use tauri::State;

use crate::util::cache::Cache;
use std::{ fs, thread };

// Delete a photo when the users confirms the prompt in the ui
#[tauri::command]
pub fn delete_photo(path: String, cache: State<Cache>) {
  let photo_path = cache.get("photo-path".into());

  thread::spawn(move || {
    let p = photo_path.unwrap() + "/" + &path;
    fs::remove_file(p).unwrap();
  });
}
