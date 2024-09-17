use std::process::{ self, Command };

#[tauri::command]
pub fn relaunch() {
  let container_folder = dirs::home_dir()
    .unwrap()
    .join("AppData\\Roaming\\PhazeDev\\VRChatPhotoManager");

  let mut cmd = Command::new(&container_folder.join("./vrchat-photo-manager.exe"));
  cmd.current_dir(container_folder);
  cmd.spawn().expect("Cannot run updater");

  process::exit(0);
}