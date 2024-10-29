use tauri::Manager;
use std::env;

#[tauri::command]
pub fn close_splashscreen(window: tauri::Window) {
  let args: Vec<String> = env::args().collect();

  let mut show = true;
  for arg in args {
    if arg == "--background" {
      show = false;
    }
  }

  if show{
    window.get_webview_window("main").unwrap().show().unwrap();
  }
}