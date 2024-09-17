use tauri::{ AppHandle, Emitter };

pub fn setup_deeplink( handle: &AppHandle ){
  let handle = handle.clone();

  // Register "deep link" for authentication via vrcpm://
  tauri_plugin_deep_link::register("vrcpm", move |request| {
    let mut command: u8 = 0;
    let mut index: u8 = 0;

    for part in request.split('/').into_iter() {
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
  })
  .unwrap();
}