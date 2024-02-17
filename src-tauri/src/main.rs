#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod pngmeta;

use tauri::{ CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, WindowEvent, http::ResponseBuilder };
use std::{ fs, io::Read, path };
use regex::Regex;
use pngmeta::PNGImage;

#[tauri::command]
async fn close_splashscreen(window: tauri::Window) {
  window.get_window("main").unwrap().show().unwrap();
}

#[tauri::command]
fn start_user_auth() {
  open::that("https://id.phazed.xyz?oauth=79959294626406").unwrap();
}

#[tauri::command]
fn load_photos() -> Vec<path::PathBuf> {
  let base_dir = dirs::home_dir().unwrap().join("Pictures\\VRChat");

  let mut photos: Vec<path::PathBuf> = Vec::new();

  for folder in fs::read_dir(base_dir).unwrap() {
    let f = folder.unwrap();

    if f.metadata().unwrap().is_dir() {
      for photo in fs::read_dir(f.path()).unwrap() {
        let p = photo.unwrap();

        if p.metadata().unwrap().is_file() {
          let fname = p.path();

          let re1 = Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}.png").unwrap();
          let re2 = Regex::new(
            r"(?m)/VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png/gm").unwrap();
          
          if
            re1.is_match(p.file_name().to_str().unwrap()) ||
            re2.is_match(p.file_name().to_str().unwrap())
          {
            let path = fname.to_path_buf().clone();
            let path = path.strip_prefix(dirs::home_dir().unwrap().join("Pictures\\VRChat")).unwrap().to_path_buf();

            photos.push(path);
          }
        }
      }
    }
  }

  photos
}

#[tauri::command]
fn load_photo_meta( photo: &str ) -> PNGImage{
  let mut base_dir = dirs::home_dir().unwrap().join("Pictures\\VRChat");
  base_dir.push(photo);

  let mut file =  fs::File::open(base_dir.clone()).expect("Cannot read image file.");
  let mut buffer = Vec::new();

  let _out = file.read_to_end(&mut buffer);
  PNGImage::new(buffer)
}

fn main() {
  std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--ignore-gpu-blacklist");

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
    .register_uri_scheme_protocol("photo", | _app, request | {
      let uri = request.uri();

      if request.method() != "GET" {
        return ResponseBuilder::new()
        .status(404)
        .body(Vec::new());
      }

      let path = uri.replace("photo://localhost/", "");

      let mut base_dir = dirs::home_dir().unwrap().join("Pictures\\VRChat");
      base_dir.push(path);
    
      let mut file = fs::File::open(base_dir).expect("Cannot read image file.");
      let mut buffer = Vec::new();
    
      let _out = file.read_to_end(&mut buffer);

      ResponseBuilder::new()
        .status(200)
        .body(buffer)
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
    .invoke_handler(tauri::generate_handler![start_user_auth, load_photos, close_splashscreen, load_photo_meta])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}