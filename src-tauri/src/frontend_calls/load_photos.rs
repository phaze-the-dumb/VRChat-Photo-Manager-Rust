use std::{ thread, fs, path };
use crate::util::get_photo_path::get_photo_path;
use regex::Regex;
use tauri::Emitter;

// Scans all files under the "Pictures/VRChat" path
// then sends the list of photos to the frontend
#[derive(Clone, serde::Serialize)]
struct PhotosLoadedResponse {
  photos: Vec<path::PathBuf>,
  size: usize,
}

#[tauri::command]
pub fn load_photos(window: tauri::Window) {
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
  r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png").unwrap();

            if re1.is_match(p.file_name().to_str().unwrap())
              || re2.is_match(p.file_name().to_str().unwrap())
            {
              let path = fname.to_path_buf().clone();
              let metadata = fs::metadata(&path).unwrap();

              if metadata.is_file() {
                size += metadata.len() as usize;

                let path = path.strip_prefix(&base_dir).unwrap().to_path_buf();
                photos.push(path);
              }
            } else {
              println!("Ignoring {:#?} as it doesn't match regex", p.file_name());
            }
          } else {
            println!("Ignoring {:#?} as it is a directory", p.file_name());
          }
        }
      } else {
        println!("Ignoring {:#?} as it isn't a directory", f.file_name());
      }
    }

    println!("Found {} photos", photos.len());
    window
        .emit("photos_loaded", PhotosLoadedResponse { photos, size })
        .unwrap();
  });
}