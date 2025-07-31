use std::process::Command;

#[tauri::command]
pub fn open_folder(url: &str) {
  #[cfg(target_os = "windows")]
  Command::new("explorer.exe").arg(format!("/select,{}", url)).spawn().unwrap();

  #[cfg(target_os = "linux")]
  {
    let url = url.replace("\\", "/");
    let mut path: Vec<&str> = url.split("/").collect();

    path.pop();
    Command::new("xdg-open").arg(path.join("/")).spawn().unwrap();
  }
}
