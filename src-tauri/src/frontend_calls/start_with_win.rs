use std::{ thread, fs };

#[cfg(windows)]
use mslnk::ShellLink;

// When the user changes the start with windows toggle
// create and delete the shortcut from the startup folder
#[cfg(windows)]
#[tauri::command]
pub fn start_with_win(start: bool) {
  if cfg!(windows) {
    thread::spawn(move || {
      if start {
        let target = dirs::config_dir()
          .unwrap()
          .join("PhazeDev\\VRChatPhotoManager\\vrchat-photo-manager.exe");

        match fs::metadata(&target) {
          Ok(_) => {
            let lnk = dirs::home_dir().unwrap().join("AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\VRChat Photo Manager.lnk");

            let sl = ShellLink::new(target).unwrap();
            sl.create_lnk(lnk).unwrap();
          }
          Err(_) => {}
        }
      } else {
        let lnk = dirs::home_dir().unwrap().join("AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\VRChat Photo Manager.lnk");
        fs::remove_file(lnk).unwrap();
      }
    });
  } else {
    panic!("Cannot start with windows... on not windows...");
  }
}