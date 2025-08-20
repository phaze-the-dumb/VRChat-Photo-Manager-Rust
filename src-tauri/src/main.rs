#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod frontend_calls;
mod pngmeta;
mod util;
mod worldscraper;

use core::time;
use arboard::Clipboard;
use frontend_calls::*;

use notify::{ EventKind, RecursiveMode, Watcher };
use pngmeta::PNGImage;
use regex::Regex;
use util::{ cache::Cache, get_photo_path::get_photo_path };
use std::{ env, fs, sync::Mutex, thread };
use tauri::{ Emitter, Manager, State, WindowEvent };
use tauri_plugin_deep_link::DeepLinkExt;

use crate::frontend_calls::config::{get_config_value_string, Config};

fn main() {
  #[cfg(target_os = "linux")]
  std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1"); // Fix webkitgtk being shit

  let cache = Cache::new();

  // Double check the app has an install directory
  let container_folder = dirs::config_dir()
    .unwrap()
    .join("PhazeDev/VRChatPhotoManager");

  match fs::metadata(&container_folder) {
    Ok(meta) => {
      if meta.is_file() {
        panic!("Cannot launch app as the container path is a file not a directory");
      }
    }
    Err(_) => {
      let folder = dirs::config_dir().unwrap();
      match fs::metadata(&folder) {
        Ok(meta) => {
          if meta.is_file() {
            panic!("Cannot launch app as the container path is a file not a directory");
          }
        }
        Err(_) => {
          fs::create_dir(&folder).unwrap();
        }
      }

      let phaz_folder = dirs::config_dir().unwrap().join("PhazeDev");
      match fs::metadata(&phaz_folder) {
        Ok(meta) => {
          if meta.is_file() {
            panic!("Cannot launch app as the container path is a file not a directory");
          }
        }
        Err(_) => {
          fs::create_dir(&phaz_folder).unwrap();
        }
      }

      fs::create_dir(&container_folder).unwrap();
    }
  }

  let sync_lock_path = dirs::config_dir()
    .unwrap()
    .join("PhazeDev/VRChatPhotoManager/.sync_lock");

  match fs::metadata(&sync_lock_path) {
    Ok(_) => {
      fs::remove_file(&sync_lock_path).unwrap();
    }
    Err(_) => {}
  }

  println!("Loading App...");
  let photos_path = util::get_photo_path::get_photo_path();

  cache.insert("photo-path".into(), photos_path.to_str().unwrap().to_owned());

  match fs::metadata(&photos_path) {
    Ok(_) => {}
    Err(_) => {
      fs::create_dir(&photos_path).unwrap();
    }
  };

  // Listen for file updates, store each update in an mpsc channel and send to the frontend
  let (sender, receiver) = std::sync::mpsc::channel();
  let mut watcher = notify::recommended_watcher(move | res: Result<notify::Event, notify::Error> | {
    match res {
      Ok(event) => {
        match event.kind{
          EventKind::Remove(_) => {
            let path = event.paths.first().unwrap();
            let name = path.file_name().unwrap().to_str().unwrap().to_owned();

            let re1 = Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}.png").unwrap();
            let re2 = Regex::new(r"(?m)/VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png/gm").unwrap();

            if
              re1.is_match(&name) ||
              re2.is_match(&name)
            {
              sender.send((2, path.strip_prefix(get_photo_path()).unwrap().to_str().unwrap().to_owned())).unwrap();
            }
          },
          EventKind::Create(_) => {
            let path = event.paths.first().unwrap();
            let name = path.file_name().unwrap().to_str().unwrap().to_owned();

            let re1 = Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}.png").unwrap();
            let re2 = Regex::new(r"(?m)/VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png/gm").unwrap();

            if
              re1.is_match(&name) ||
              re2.is_match(&name)
            {
              thread::sleep(time::Duration::from_millis(1000));
              sender.send((1, path.strip_prefix(get_photo_path()).unwrap().to_str().unwrap().to_owned())).unwrap();
            }
          },
          _ => {}
        }
      },
      Err(e) => println!("watch error: {:?}", e),
    }
  }).unwrap();

  println!("Watching dir: {:?}", util::get_photo_path::get_photo_path());
  watcher
    .watch(
      &util::get_photo_path::get_photo_path(),
      RecursiveMode::Recursive,
    )
    .unwrap();

  let clipboard = Clipboard::new().unwrap();

  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(| app, _argv, _cwd | {
      app.get_webview_window("main").unwrap().show().unwrap();
    }))
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_shell::init())
    .register_asynchronous_uri_scheme_protocol("photo", |ctx, req, res| {
      let cache: State<Cache> = ctx.app_handle().state();
      util::handle_uri_proto::handle_uri_proto(req, res, cache);
    })
    .on_window_event(|window, event| match event {
      WindowEvent::CloseRequested { api,   .. } => {
        let config: State<Config> = window.state();

        let val = get_config_value_string("close-to-tray".into(), config.clone());
        if val.is_none() || val.unwrap() != "true"{
          config.save();
          return;
        }

        window.hide().unwrap();
        api.prevent_close();
      }
      _ => {}
    })
    .manage(Config::new())
    .manage(cache)
    .manage(Mutex::new(clipboard))
    .setup(|app| {
      let handle = app.handle();

      app.deep_link().register("vrcpm").unwrap();
      util::setup_traymenu::setup_traymenu(handle);

      // reads the file update mpsc channel and sends the events to the frontend
      let window = app.get_webview_window("main").unwrap();
      thread::spawn(move || {
        thread::sleep(time::Duration::from_millis(100));

        for event in receiver {
          match event.0 {
            1 => {
              window.emit("photo_create", event.1).unwrap();
            }
            2 => {
              window.emit("photo_remove", event.1).unwrap();
            }
            _ => {}
          }
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      load_photos::load_photos,
      close_splashscreen::close_splashscreen,
      load_photo_meta::load_photo_meta,
      delete_photo::delete_photo,
      open_url::open_url,
      open_folder::open_folder,
      find_world_by_id::find_world_by_id,
      #[cfg(windows)]
      start_with_win::start_with_win,
      get_user_photos_path::get_user_photos_path,
      change_final_path::change_final_path,
      util::get_version::get_version,
      config::set_config_value_string,
      config::get_config_value_string,
      config::set_config_value_int,
      config::get_config_value_int,
      get_os::get_os,
      copy_image::copy_image
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
