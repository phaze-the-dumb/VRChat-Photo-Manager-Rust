use std::{ fs, path };

pub fn get_photo_path() -> path::PathBuf {
  let config_path = dirs::config_dir()
    .unwrap()
    .join("PhazeDev/VRChatPhotoManager/.photos_path");

  match fs::read_to_string(config_path) {
    Ok(path) => {
      path::PathBuf::from(path)
    },
    Err(_) => {
      let p = dirs::picture_dir().unwrap().join("VRChat");

      p
    }
  }
}
