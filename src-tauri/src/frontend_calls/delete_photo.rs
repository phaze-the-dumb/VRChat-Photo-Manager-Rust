use crate::util::get_photo_path::get_photo_path;
use std::{fs, thread, time::Duration};

// Delete a photo when the users confirms the prompt in the ui
#[tauri::command]
pub fn delete_photo(path: String, token: String, is_syncing: bool) {
  thread::spawn(move || {
    let p = get_photo_path().join(&path);
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
