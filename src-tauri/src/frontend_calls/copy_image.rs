use std::{borrow::Cow, fs::{self, File}, io::BufReader, sync::Mutex};

use arboard::{Clipboard, ImageData};
use image::{codecs::png::PngDecoder, EncodableLayout, GenericImageView, ImageDecoder};
use tauri::State;

use crate::{ frontend_calls::get_user_photos_path::get_user_photos_path, pngmeta::PNGImage, util::cache::Cache };

#[tauri::command]
pub fn copy_image( path: String, clipboard: State<Mutex<Clipboard>>, cache: State<Cache> ) {
  let path = format!("{}/{}", get_user_photos_path(cache), path);
  println!("Copying Image: {}", &path);

  let img = image::open(path).unwrap();
  let size = img.dimensions();

  let img_data = ImageData {
    width: size.0 as usize,
    height: size.1 as usize,
    bytes: Cow::from(img.into_rgba8().to_vec())
  };

  let mut lock = clipboard.lock().unwrap();
  lock.set_image(img_data).unwrap();
}