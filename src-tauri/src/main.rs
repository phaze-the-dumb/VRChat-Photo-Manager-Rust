#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod pngmeta;
mod worldscraper;

use tauri::{ CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, WindowEvent, http::ResponseBuilder };
use core::time;
use std::{ fs, io::Read, path, thread };
use regex::Regex;
use pngmeta::PNGImage;
use worldscraper::World;
use mslnk::ShellLink;
use notify::{ EventKind, RecursiveMode, Watcher };

#[derive(Clone, serde::Serialize)]
struct PhotoLoadResponse{
  data: String,
  path: String,
}

#[tauri::command]
async fn close_splashscreen(window: tauri::Window) {
  window.get_window("main").unwrap().show().unwrap();
}

#[tauri::command]
fn start_user_auth() {
  open::that("https://id.phazed.xyz?oauth=79959294626406").unwrap();
}

#[tauri::command]
fn open_url( url: &str ) {
  open::that(url).unwrap();
}

#[tauri::command]
fn start_with_win( start: bool, window: tauri::Window ){
  thread::spawn(move || {
    if start{
      let target = dirs::home_dir().unwrap().join("AppData\\Roaming\\PhazeDev\\VRChatPhotoManager\\vrchat-photo-manager.exe");
      match fs::metadata(&target){
        Ok(_) => {
          let lnk = dirs::home_dir().unwrap().join("AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\VRChat Photo Manager.lnk");

          let sl = ShellLink::new(target).unwrap();
          sl.create_lnk(lnk).unwrap();
        },
        Err(_) => {}
      }
    } else{
      let lnk = dirs::home_dir().unwrap().join("AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\VRChat Photo Manager.lnk");
      fs::remove_file(lnk).unwrap();
    }
  });
}

// Load vrchat world data
#[tauri::command]
fn find_world_by_id( world_id: String, window: tauri::Window ){
  thread::spawn(move || {
    let world = World::new(world_id);
    window.emit("world_data", world).unwrap();
  });
}

// Scans all files under the "Pictures/VRChat" path
// then sends the list of photos to the frontend
#[derive(Clone, serde::Serialize)]
struct PhotosLoadedResponse{
  photos: Vec<path::PathBuf>,
  size: usize
}

#[tauri::command]
fn load_photos(window: tauri::Window) {
  thread::spawn(move || {
    let base_dir = dirs::home_dir().unwrap().join("Pictures\\VRChat");

    let mut photos: Vec<path::PathBuf> = Vec::new();
    let mut size: usize = 0;

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
              let metadata = fs::metadata(&path).unwrap();

              if metadata.is_file() {
                size += metadata.len() as usize;

                let path = path.strip_prefix(dirs::home_dir().unwrap().join("Pictures\\VRChat")).unwrap().to_path_buf();
                photos.push(path);
              }
            }
          }
        }
      }
    }

    window.emit("photos_loaded", PhotosLoadedResponse{ photos, size }).unwrap();
  });
}

// Reads the PNG file and loads the image metadata from it
// then sends the metadata to the frontend, returns width, height, colour depth and so on... more info "pngmeta.rs"
#[tauri::command]
fn load_photo_meta( photo: &str, window: tauri::Window ){
  let photo = photo.to_string();

  thread::spawn(move || {
    let mut base_dir = dirs::home_dir().unwrap().join("Pictures\\VRChat");
    base_dir.push(&photo);
  
    let mut file =  fs::File::open(base_dir.clone()).expect("Cannot read image file.");
    let mut buffer = Vec::new();
  
    let _out = file.read_to_end(&mut buffer);
    window.emit("photo_meta_loaded", PNGImage::new(buffer, photo)).unwrap();
  });
}

// Delete a photo when the users confirms the prompt in the ui
#[tauri::command]
fn delete_photo( path: &str ){
  let p = dirs::home_dir().unwrap().join("Pictures\\VRChat").join(path);
  fs::remove_file(p).unwrap();
}

fn main() {
  std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--ignore-gpu-blacklist");

  tauri_plugin_deep_link::prepare("uk.phaz.vrcpm");

  // Setup the tray icon and menu buttons
  let quit = CustomMenuItem::new("quit".to_string(), "Quit");
  let hide = CustomMenuItem::new("hide".to_string(), "Hide / Show");

  let tray_menu = SystemTrayMenu::new()
    .add_item(quit)
    .add_native_item(SystemTrayMenuItem::Separator)
    .add_item(hide);

  let tray = SystemTray::new().with_menu(tray_menu);

  // Listen for file updates, store each update in an mpsc channel and send to the frontend
  let (sender, receiver) = std::sync::mpsc::channel();
  let mut watcher = notify::recommended_watcher(move | res: Result<notify::Event, notify::Error> | {
    match res {
       Ok(event) => {
        match event.kind{
          EventKind::Remove(_) => {
            let path = event.paths.first().unwrap();

            let re1 = Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}.png").unwrap();
            let re2 = Regex::new(r"(?m)/VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png/gm").unwrap();

            if
              re1.is_match(path.to_str().unwrap()) ||
              re2.is_match(path.to_str().unwrap())
            {
              sender.send((2, path.clone().strip_prefix(dirs::home_dir().unwrap().join("Pictures\\VRChat")).unwrap().to_path_buf())).unwrap();
            }
          },
          EventKind::Create(_) => {
            let path = event.paths.first().unwrap();

            let re1 = Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}.png").unwrap();
            let re2 = Regex::new(r"(?m)/VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png/gm").unwrap();

            if
              re1.is_match(path.to_str().unwrap()) ||
              re2.is_match(path.to_str().unwrap())
            {
              sender.send((1, path.clone().strip_prefix(dirs::home_dir().unwrap().join("Pictures\\VRChat")).unwrap().to_path_buf())).unwrap();
            }
          },
          _ => {}
        }
      },
      Err(e) => println!("watch error: {:?}", e),
    }
  }).unwrap();

  watcher.watch(&dirs::home_dir().unwrap().join("Pictures\\VRChat"), RecursiveMode::Recursive).unwrap();

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
      // Loads the requested image file, sends data back to the user
      let uri = request.uri();

      if request.method() != "GET" {
        return ResponseBuilder::new()
        .status(404)
        .header("Access-Control-Allow-Origin", "*")
        .body(Vec::new());
      }

      let path = uri.replace("photo://localhost/", "");

      let mut base_dir = dirs::home_dir().unwrap().join("Pictures\\VRChat");
      base_dir.push(path);

      let file = fs::File::open(base_dir);

      match file{
        Ok(mut file) => {
          let mut buffer = Vec::new();

          let _out = file.read_to_end(&mut buffer);

          ResponseBuilder::new()
            .status(200)
            .header("Access-Control-Allow-Origin", "*")
            .body(buffer)
        },
        Err(_) => {
          ResponseBuilder::new()
            .status(404)
            .header("Access-Control-Allow-Origin", "*")
            .body("File Not Found".into())
        }
      }
    })
    .setup(|app| {
      let handle = app.handle();

      // Register "deep link" for authentication via vrcpm://
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

      // I hate this approach but i have no clue how else to do this...
      // reads the mpsc channel and sends the events to the frontend
      let window = app.get_window("main").unwrap();
      thread::spawn(move || {
        thread::sleep(time::Duration::from_millis(100));

        for event in receiver {
          match event.0 {
            1 => {
              window.emit("photo_create", event.1).unwrap();
            },
            2 => {
              window.emit("photo_remove", event.1).unwrap();
            },
            _ => {}
          }
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![start_user_auth, load_photos, close_splashscreen, load_photo_meta, delete_photo, open_url, find_world_by_id, start_with_win])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}