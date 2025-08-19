use std::process::Command;

#[tauri::command]
pub fn open_folder(url: &str) {
  #[cfg(target_os = "windows")]
  Command::new("explorer.exe").arg(format!("/select,{}", url)).spawn().unwrap();

  #[cfg(target_os = "linux")]
  {
    let path = url.replace("\\", "/");

    let mut dir_path: Vec<_> = path.split("/").collect();
    dir_path.pop();
    let dir_path = dir_path.join("/");

    let commands = vec![
      ( "nautilus", vec![ path.clone() ] ),
      ( "nemo", vec![ path.clone() ] ),
      ( "thunar", vec![ path.clone() ] ),
      ( "caja", vec![ "--select".into(), path.clone() ] ),
      ( "pcmanfm-qt", vec![ dir_path.clone() ] ),
      ( "pcmanfm", vec![ dir_path.clone() ] ),
      ( "dolphin", vec![ "--select".into(), path.clone() ] ),
      ( "konqueror", vec![ "--select".into(), path.clone() ] ),
      ( "xdg-open", vec![ dir_path.clone() ] )
    ];

    for command in commands{
      if Command::new(command.0).args(command.1).spawn().is_ok() { break; } }
  }
}
