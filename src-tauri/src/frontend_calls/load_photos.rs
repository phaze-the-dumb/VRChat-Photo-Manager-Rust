use crate::util::cache::Cache;
use regex::Regex;
use std::{fs, path, thread};
use tauri::{Emitter, State};

// Scans all files under the "Pictures/VRChat" path
// then sends the list of photos to the frontend
#[derive(Clone, serde::Serialize)]
struct PhotosLoadedResponse {
  photos: Vec<path::PathBuf>,
  size: usize,
}

#[tauri::command]
pub fn load_photos(window: tauri::Window, cache: State<Cache> ) {
  let base_dir = cache.get("photo-path".into()).unwrap();

  thread::spawn(move || {

    let mut photos: Vec<path::PathBuf> = Vec::new();
    let mut size: usize = 0;

    for folder in fs::read_dir(&base_dir).unwrap() {
      let f = folder.unwrap();

      if f.metadata().unwrap().is_dir() {
        for photo in fs::read_dir(f.path()).unwrap() {
          let p = photo.unwrap();

          if p.metadata().unwrap().is_file() {
            let fname = p.path();

            let name = p.file_name();
            let name = name.to_str().unwrap();

            // I know this is janky
            // i'm sorry

            // All regex's are trippled up as some resolutions have shorter names

            let re1_match = // This is the current format used by VRChat
              Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}.png").unwrap().is_match(name) ||
              Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{3}.png").unwrap().is_match(name) ||
              Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{3}x[0-9]{3}.png").unwrap().is_match(name);

            let re2_match = // This is the format VRCX uses if you enable renaming photos
              Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png").unwrap().is_match(name) ||
              Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{3}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png").unwrap().is_match(name) ||
              Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{3}x[0-9]{3}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png").unwrap().is_match(name);

            let re3_match = // This is an old format VRChat used for naming photos
              Regex::new("VRChat_[0-9]{4}x[0-9]{4}_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}.png").unwrap().is_match(name) ||
              Regex::new("VRChat_[0-9]{4}x[0-9]{3}_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}.png").unwrap().is_match(name) ||
              Regex::new("VRChat_[0-9]{3}x[0-9]{3}_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}.png").unwrap().is_match(name);

            if re1_match || re2_match || re3_match {
              let path = fname.to_path_buf().clone();
              let metadata = fs::metadata(&path).unwrap();

              if metadata.is_file() {
                size += metadata.len() as usize;

                let pth = path.strip_prefix(&base_dir).unwrap().to_path_buf();

                if re3_match {
                  photos.push(path::PathBuf::from("legacy://").join(pth));
                } else {
                  photos.push(pth);
                }
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
