use std::{ path, /*fs*/ };
// use regex::Regex;

pub fn sync_photos( _token: String, _path: path::PathBuf ){
  // match fs::metadata(&path){
  //   Ok(_) => {}
  //   Err(_) => {
  //     fs::create_dir(&path).unwrap();
  //   }
  // };

  // let mut photos: Vec<path::PathBuf> = Vec::new();
  // let mut size: usize = 0;

  // for folder in fs::read_dir(&path).unwrap() {
  //   let f = folder.unwrap();

  //   if f.metadata().unwrap().is_dir() {
  //     for photo in fs::read_dir(f.path()).unwrap() {
  //       let p = photo.unwrap();

  //       dbg!(p.file_name());
  //     }
  //   }
  // }
}