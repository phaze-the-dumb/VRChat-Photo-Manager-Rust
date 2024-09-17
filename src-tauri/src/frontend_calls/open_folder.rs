use std::process::Command;

#[tauri::command]
pub fn open_folder(url: &str) {
  Command::new("explorer.exe")
    .arg(format!("/select,{}", url))
    .spawn()
    .unwrap();
}