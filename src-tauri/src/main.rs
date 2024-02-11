#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{ CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, WindowEvent };
use std::{ fs, path };

#[tauri::command]
fn start_user_auth() {
  open::that("https://id.phazed.xyz?oauth=79959294626406").unwrap();
}

#[tauri::command]
fn load_photos() {
  let base_dir = dirs::home_dir().unwrap().join("./Pictures/VRChat");

  let mut photos: Vec<path::PathBuf> = Vec::new();

  for folder in fs::read_dir(base_dir).unwrap() {
    let f = folder.unwrap();

    if f.metadata().unwrap().is_dir() {
      for photo in fs::read_dir(f.path()).unwrap() {
        let p = photo.unwrap();

        if p.metadata().unwrap().is_file() {
          let fname = p.path();
          photos.push(fname);
        }
      }
    }
  }

  println!("{:#?}", photos);
}

fn main() {
  tauri_plugin_deep_link::prepare("uk.phaz.vrcpm");

  let quit = CustomMenuItem::new("quit".to_string(), "Quit");
  let hide = CustomMenuItem::new("hide".to_string(), "Hide / Show");

  let tray_menu = SystemTrayMenu::new()
    .add_item(quit)
    .add_native_item(SystemTrayMenuItem::Separator)
    .add_item(hide);

  let tray = SystemTray::new().with_menu(tray_menu);

  tauri::Builder::default()
    .system_tray(tray)
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::LeftClick {
        position: _,
        size: _,
        ..
      } => {
        let window = app.get_window("main").unwrap();
        window.show().unwrap();
      }
      SystemTrayEvent::MenuItemClick { id, .. } => {
        match id.as_str() {
          "quit" => {
            std::process::exit(0);
          }
          "hide" => {
            let window = app.get_window("main").unwrap();

            if window.is_visible().unwrap() {
              window.hide().unwrap();
            } else{
              window.show().unwrap();
            }
          }
          _ => {}
        }
      }
      _ => {}
    })
    .on_window_event(| event | match event.event() {
      WindowEvent::CloseRequested { api, .. } => {
        event.window().hide().unwrap();
        api.prevent_close();
      }
      _ => {}
    })
    .setup(|app| {
      let handle = app.handle();

      tauri_plugin_deep_link::register(
        "vrcpm",
        move | request | {
          let mut command: u8 = 0;
          let mut index: u8 = 0;

          for part in request.split('/').into_iter() {
            index += 1;
            println!("Index {}, is {}", index, part);

            if index == 3 && part == "auth-callback"{
              command = 1;
            }

            if index == 3 && part == "auth-denied"{
              handle.emit_all("auth-denied", "null").unwrap();
            }

            if index == 4 && command == 1 {
              handle.emit_all("auth-callback", part).unwrap();
            }
          }
        }
      ).unwrap();

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![start_user_auth,load_photos])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}