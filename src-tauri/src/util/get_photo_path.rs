use std::{ fs, path };

pub fn get_photo_path() -> path::PathBuf {
  let config_path = dirs::config_dir()
    .unwrap()
    .join("PhazeDev/VRChatPhotoManager/.photos_path");

  match fs::read_to_string(config_path) {
    Ok(path) => {
      if path
        != dirs::picture_dir()
          .unwrap()
          .join("VRChat")
          .to_str()
          .unwrap()
          .to_owned()
      {
        path::PathBuf::from(path)
      } else {
        dirs::picture_dir().unwrap().join("VRChat")
      }
    }
    Err(_) => dirs::picture_dir().unwrap().join("VRChat"),
  }
}