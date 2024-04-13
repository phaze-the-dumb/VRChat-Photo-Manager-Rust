use std::{ fs, path, time::Duration };
use regex::Regex;
use reqwest::{ self, Error };
use serde::Serialize;
use serde_json::Value;
use tauri::Manager;

#[derive(Clone, Serialize)]
struct PhotoUploadMeta{
  photos_uploading: usize,
  photos_total: usize
}

pub fn sync_photos( token: String, path: path::PathBuf, window: tauri::Window ){
  match fs::metadata(&path){
    Ok(_) => {}
    Err(_) => {
      fs::create_dir(&path).unwrap();
    }
  };

  let mut photos: Vec<String> = Vec::new();

  for folder in fs::read_dir(&path).unwrap() {
    let f = folder.unwrap();

    if f.metadata().unwrap().is_dir() {
      for photo in fs::read_dir(f.path()).unwrap() {
        let p = photo.unwrap();

        let re1 = Regex::new(r"(?m)VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}.png").unwrap();
        let re2 = Regex::new(
          r"(?m)/VRChat_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}.[0-9]{3}_[0-9]{4}x[0-9]{4}_wrld_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}.png/gm").unwrap();

        if
          re1.is_match(p.file_name().to_str().unwrap()) ||
          re2.is_match(p.file_name().to_str().unwrap())
        {
          photos.push(p.file_name().into_string().unwrap());
        }
      }
    }
  }

  let body: Value = reqwest::blocking::get(format!("https://photos.phazed.xyz/api/v1/photos/exists?token={}", &token)).unwrap()
    .json().unwrap();

  let mut photos_to_upload: Vec<String> = Vec::new();
  let uploaded_photos = body["files"].as_array().unwrap();

  let photos_len = photos.len();

  for photo in photos{
    let mut found_photo = false;

    for uploaded_photo in uploaded_photos{
      if photo == uploaded_photo.as_str().unwrap(){
        found_photo = true;
        break;
      }
    }

    if !found_photo {
      photos_to_upload.push(photo);
    }
  }

  window.emit_all("photos-upload-meta", PhotoUploadMeta { photos_uploading: photos_to_upload.len(), photos_total: photos_len }).unwrap();
  let mut photos_left = photos_to_upload.len();

  let client = reqwest::blocking::Client::new();

  loop {
    match photos_to_upload.pop(){
      Some(photo) => {
        let folder_name = photo.clone().replace("VRChat_", "");
        let mut folder_name = folder_name.split("-");
        let folder_name = format!("{}-{}", folder_name.nth(0).unwrap(), folder_name.nth(0).unwrap());

        let full_path = format!("{}\\{}\\{}", path.to_str().unwrap(), folder_name, photo);
        let file = fs::File::open(full_path).unwrap();

        let res: Result<Value, Error> = client.put(format!("https://photos.phazed.xyz/api/v1/photos?token={}", &token))
          .header("Content-Type", "image/png")
          .header("filename", photo)
          .body(file)
          .timeout(Duration::from_secs(120))
          .send().unwrap().json();

        match res {
          Ok(res) => {
            if !res["ok"].as_bool().unwrap(){
              println!("Failed to upload: {}", res["error"].as_str().unwrap());
              window.emit_all("sync-failed", res["error"].as_str().unwrap()).unwrap();
              break;
            }
          }
          Err(err) => {
            dbg!(err);
          }
        }

        photos_left -= 1;
        window.emit_all("photos-upload-meta", PhotoUploadMeta { photos_uploading: photos_left, photos_total: photos_len }).unwrap();
      }
      None => {
        break;
      }
    }
  }

  window.emit_all("sync-finished", "h").unwrap();
  println!("Finished Uploading.");
}