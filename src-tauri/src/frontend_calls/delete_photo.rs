use tauri::State;

use crate::util::cache::Cache;
use std::{ fs, thread, time::Duration };

// Delete a photo when the users confirms the prompt in the ui
#[tauri::command]
pub fn delete_photo(path: String, token: String, is_syncing: bool, cache: State<Cache>) {
  let photo_path = cache.get("photo-path".into());

  thread::spawn(move || {
    let p = photo_path.unwrap() + "/" + &path;
    fs::remove_file(p).unwrap();

    let photo = path.split("/").last().unwrap();

    if is_syncing {
      let client = reqwest::blocking::Client::new();
      client
        .delete(format!(
          "https://photos-cdn.phazed.xyz/api/v1/photos?token={}&photo={}",
          token, photo
        ))
        .timeout(Duration::from_secs(120))
        .send()
        .unwrap();
    }
  });
}
