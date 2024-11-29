use std::{fs, path, sync::RwLock};

static CACHED_PATH: RwLock<Option<path::PathBuf>> = RwLock::new(None);

pub fn get_photo_path() -> path::PathBuf {
  let path = CACHED_PATH.read().unwrap();
  if path.is_none(){
    let config_path = dirs::config_dir()
      .unwrap()
      .join("PhazeDev/VRChatPhotoManager/.photos_path");

    dbg!(&config_path);

    match fs::read_to_string(config_path) {
      Ok(path) => {
        let p = path::PathBuf::from(path);

        let mut wpath = CACHED_PATH.write().unwrap();
        *wpath = Some(p.clone());

        p
      },
      Err(_) => {
        let p = dirs::picture_dir().unwrap().join("VRChat");

        p
      }
    }
  } else{
    path.clone().unwrap()
  }
}
