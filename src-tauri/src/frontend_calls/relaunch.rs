use std::process::{ self, Command };

#[tauri::command]
pub fn relaunch() {
  #[cfg(windows)]
  {
    let container_folder = dirs::config_dir()
      .unwrap()
      .join("PhazeDev/VRChatPhotoManager");

    let mut cmd = Command::new(&container_folder.join("./vrchat-photo-manager.exe"));
    cmd.current_dir(container_folder);
    cmd.spawn().expect("Cannot run updater");

    process::exit(0);
  }
}
