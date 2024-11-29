use tauri::{ AppHandle, Emitter };

pub fn handle_deeplink( url: String, handle: &AppHandle ) {
  let mut command: u8 = 0;
  let mut index: u8 = 0;

  for part in url.split('/').into_iter() {
    index += 1;

    if index == 3 && part == "auth-callback" {
      command = 1;
    }

    if index == 3 && part == "auth-denied" {
      handle.emit("auth-denied", "null").unwrap();
    }

    if index == 4 && command == 1 {
      handle.emit("auth-callback", part).unwrap();
    }
  }
}
