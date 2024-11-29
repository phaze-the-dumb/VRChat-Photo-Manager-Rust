#[tauri::command]
pub fn get_os() -> String {
  #[cfg(windows)]
  return "windows".into();

  #[cfg(unix)]
  return "unix".into();
}
