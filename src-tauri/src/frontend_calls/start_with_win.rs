use std::{ thread, fs };
use mslnk::ShellLink;

// When the user changes the start with windows toggle
// create and delete the shortcut from the startup folder
#[tauri::command]
pub fn start_with_win(start: bool) {
  thread::spawn(move || {
    if start {
      let target = dirs::home_dir()
        .unwrap()
        .join("AppData\\Roaming\\PhazeDev\\VRChatPhotoManager\\vrchat-photo-manager.exe");

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
}