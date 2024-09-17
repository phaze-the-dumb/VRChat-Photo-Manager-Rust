use std::{ thread, fs, io::Read };
use crate::util::get_photo_path::get_photo_path;
use tauri::Emitter;
use crate::PNGImage;

// Reads the PNG file and loads the image metadata from it
// then sends the metadata to the frontend, returns width, height, colour depth and so on... more info "pngmeta.rs"
#[tauri::command]
pub fn load_photo_meta(photo: &str, window: tauri::Window) {
  let photo = photo.to_string();

  thread::spawn(move || {
    let base_dir = get_photo_path().join(&photo);

    let file = fs::File::open(base_dir.clone());

    match file {
      Ok(mut file) => {
        let mut buffer = Vec::new();

        let _out = file.read_to_end(&mut buffer);
        window
          .emit("photo_meta_loaded", PNGImage::new(buffer, photo))
          .unwrap();
      }
      Err(_) => {
        println!("Cannot read image file");
      }
    }
  });
}