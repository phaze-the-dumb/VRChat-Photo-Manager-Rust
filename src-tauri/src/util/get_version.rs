const VERSION: &str = env!("CARGO_PKG_VERSION");

#[tauri::command]
pub fn get_version() -> String {
  String::from(VERSION)
}
