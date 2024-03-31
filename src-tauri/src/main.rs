#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod pngmeta;
mod worldscraper;
mod photosync;

use tauri::{ http::ResponseBuilder, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, WindowEvent };
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

// Scans all files under the "Pictures/VRChat" path
// then sends the list of photos to the frontend
#[derive(Clone, serde::Serialize)]
struct PhotosLoadedResponse{
  photos: Vec<path::PathBuf>,
  size: usize
}

pub fn get_photo_path() -> path::PathBuf{
  let config_path = dirs::home_dir().unwrap().join("AppData\\Roaming\\PhazeDev\\VRChatPhotoManager\\.photos_path");

  match fs::read_to_string(config_path){
    Ok(path) => {
      if path != dirs::picture_dir().unwrap().join("VRChat").to_str().unwrap().to_owned(){
        path::PathBuf::from(path)
      } else{
        dirs::picture_dir().unwrap().join("VRChat")
      }
    }
    Err(_) => {
      dirs::picture_dir().unwrap().join("VRChat")
    }
  }
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

// Check if the photo config file exists
// if not just return the default vrchat path
#[tauri::command]
fn get_user_photos_path() -> path::PathBuf {
  get_photo_path()
}

// When the user changes the start with windows toggle
// create and delete the shortcut from the startup folder
#[tauri::command]
fn start_with_win( start: bool ){
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

// On requested sync the photos to the cloud
#[tauri::command]
fn sync_photos( token: String ){
  thread::spawn(move || {
    photosync::sync_photos(token, get_photo_path());
  });
}

#[tauri::command]
fn load_photos(window: tauri::Window) {
  thread::spawn(move || {
    let base_dir = get_photo_path();

    let mut photos: Vec<path::PathBuf> = Vec::new();
    let mut size: usize = 0;

    for folder in fs::read_dir(&base_dir).unwrap() {
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

                let path = path.strip_prefix(&base_dir).unwrap().to_path_buf();
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
    let base_dir = get_photo_path().join(&photo);

    let mut file =  fs::File::open(base_dir.clone()).expect("Cannot read image file.");
    let mut buffer = Vec::new();

    let _out = file.read_to_end(&mut buffer);
    window.emit("photo_meta_loaded", PNGImage::new(buffer, photo)).unwrap();
  });
}

// Delete a photo when the users confirms the prompt in the ui
#[tauri::command]
fn delete_photo( path: &str ){
  let p = get_photo_path().join(path);
  fs::remove_file(p).unwrap();
}

#[tauri::command]
fn change_final_path( new_path: &str ){
  let config_path = dirs::home_dir().unwrap().join("AppData\\Roaming\\PhazeDev\\VRChatPhotoManager\\.photos_path");
  fs::write(&config_path, new_path.as_bytes()).unwrap();

  match fs::metadata(&new_path){
    Ok(_) => {}
    Err(_) => {
      fs::create_dir(&new_path).unwrap();
    }
  };
}

fn main() {
  std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--ignore-gpu-blacklist");
  tauri_plugin_deep_link::prepare("uk.phaz.vrcpm");

  println!("Loading App...");
  let photos_path = get_photo_path();

  match fs::metadata(&photos_path){
    Ok(_) => {}
    Err(_) => {
      fs::create_dir(&photos_path).unwrap();
    }
  };

  // Double check the app has an install directory
  let container_folder = dirs::home_dir().unwrap().join("AppData\\Roaming\\PhazeDev\\VRChatPhotoManager");
  match fs::metadata(&container_folder){
    Ok(meta) => {
      if meta.is_file(){
        panic!("Cannot launch app as the container path is a file not a directory");
      }
    },
    Err(_) => {
      fs::create_dir(&container_folder).unwrap();
    }
  }

  // Do auto update stuff here (once im publishing builds)

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
              sender.send((2, path.clone().strip_prefix(get_photo_path()).unwrap().to_path_buf())).unwrap();
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
              thread::sleep(time::Duration::from_millis(1000));
              sender.send((1, path.clone().strip_prefix(get_photo_path()).unwrap().to_path_buf())).unwrap();
            }
          },
          _ => {}
        }
      },
      Err(e) => println!("watch error: {:?}", e),
    }
  }).unwrap();

  watcher.watch(&get_photo_path(), RecursiveMode::Recursive).unwrap();

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
      let file = fs::File::open(path);

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
    .invoke_handler(tauri::generate_handler![
      start_user_auth, load_photos, close_splashscreen,
      load_photo_meta, delete_photo, open_url,
      find_world_by_id, start_with_win, get_user_photos_path,
      change_final_path, sync_photos
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}