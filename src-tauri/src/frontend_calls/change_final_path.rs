use std::fs;

#[tauri::command]
pub fn change_final_path(new_path: &str) {
  let config_path = dirs::config_dir()
    .unwrap()
    .join("PhazeDev\\VRChatPhotoManager\\.photos_path");

  fs::write(&config_path, new_path.as_bytes()).unwrap();

  match fs::metadata(&new_path) {
    Ok(_) => {}
    Err(_) => {
      fs::create_dir(&new_path).unwrap();
    }
  };
}