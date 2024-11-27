use std::{ fs, path::PathBuf };

use serde_json::Value;

pub fn get_config_path() -> PathBuf{
  let path = dirs::config_dir()
    .unwrap()
    .join("PhazeDev/VRChatPhotoManager/.config");

  match fs::metadata(&path){
    Ok(_) => {}
    Err(_) => {
      fs::write(&path, b"{}").unwrap();
    }
  }

  path
}

#[tauri::command]
pub fn set_config_value_string( key: String, value: String ){
  let path = get_config_path();

  let mut config: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
  config[key] = Value::from(value);

  fs::write(path, config.to_string()).unwrap();
}

#[tauri::command]
pub fn get_config_value_string( key: String ) -> Option<String>{
  let config: Value = serde_json::from_str(&fs::read_to_string(get_config_path()).unwrap()).unwrap();
  let string = config[key].as_str();

  if string.is_some(){
    Some(string.unwrap().to_owned())
  } else{
    None
  }
}

#[tauri::command]
pub fn set_config_value_int( key: String, value: i64 ){
  let path = get_config_path();

  let mut config: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
  config[key] = Value::from(value);

  fs::write(path, config.to_string()).unwrap();
}

#[tauri::command]
pub fn get_config_value_int( key: String ) -> Option<i64>{
  let config: Value = serde_json::from_str(&fs::read_to_string(get_config_path()).unwrap()).unwrap();
  config[key].as_i64()
}