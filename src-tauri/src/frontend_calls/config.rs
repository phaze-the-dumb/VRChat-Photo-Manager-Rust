use std::{fs, path::PathBuf, sync::Mutex};

use serde_json::Value;
use tauri::State;

pub fn get_config_path() -> PathBuf {
  let path = dirs::config_dir()
    .unwrap()
    .join("PhazeDev/VRChatPhotoManager/.config");

  match fs::metadata(&path) {
    Ok(_) => {}
    Err(_) => {
      fs::write(&path, b"{}").unwrap();
    }
  }

  path
}

pub struct Config{
  config: Mutex<Value>
}

impl Config{
  pub fn new() -> Config{
    let path = get_config_path();
    let config: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();

    Config {
      config: Mutex::new(config)
    }
  }

  pub fn set( &self, key: String, value: Value ){
    let mut lock = self.config.lock().unwrap();
    lock[key] = value;
  }

  pub fn get( &self, key: String ) -> Value{
    let lock = self.config.lock().unwrap();
    lock[key].clone()
  }

  pub fn save( &self ){
    let path = get_config_path();
    let string = serde_json::to_string(&self.config).unwrap();

    fs::write(path, string).unwrap();
  }
}

#[tauri::command]
pub fn set_config_value_string( key: String, value: String, config: State<Config> ) {
  config.set(key, Value::from(value));
}

#[tauri::command]
pub fn get_config_value_string( key: String, config: State<Config> ) -> Option<String> {
  let string = config.get(key);
  let string = string.as_str();

  if string.is_some() {
    Some(string.unwrap().to_owned())
  } else {
    None
  }
}

#[tauri::command]
pub fn set_config_value_int( key: String, value: i64, config: State<Config> ) {
  config.set(key, Value::from(value));
}

#[tauri::command]
pub fn get_config_value_int( key: String, config: State<Config> ) -> Option<i64> {
  let string = config.get(key);
  string.as_i64()
}
