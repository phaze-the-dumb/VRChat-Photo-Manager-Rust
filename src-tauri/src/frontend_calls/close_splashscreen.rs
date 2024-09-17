use tauri::Manager;

#[tauri::command]
pub fn close_splashscreen(window: tauri::Window) {
  window.get_webview_window("main").unwrap().show().unwrap();
}