use std::env;
use tauri::{ Emitter, Manager };

use super::config::get_config_value_string;

#[tauri::command]
pub fn close_splashscreen( window: tauri::Window ) {
  let args: Vec<String> = env::args().collect();

  let mut show = true;
  for arg in args {
    if arg == "--background" {
      show = false;
    }
  }

  let value: String = match get_config_value_string("start-in-bg".to_owned()) { Some(val) => val, None => "false".to_owned() };
  if value == "true"{
    show = false;
  }

  if show {
    let webview = window.get_webview_window("main").unwrap();

    webview.show().unwrap();
    webview.emit("show-window", 0).unwrap();
  }
}
