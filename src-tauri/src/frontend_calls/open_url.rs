#[tauri::command]
pub fn open_url(url: &str) {
  if url.starts_with("https://"){
    open::that(url).unwrap();
  }
}