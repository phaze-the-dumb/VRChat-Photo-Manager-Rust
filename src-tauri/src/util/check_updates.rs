use std::{ env, fs, path, process::{ self, Command }, thread, time::Duration };
use crate::util;

pub fn check_updates( container_folder: path::PathBuf ){
  let args: Vec<String> = env::args().collect();

  let mut update = true;
  for arg in args {
    if arg == "--no-update" {
      update = false;
    }
  }

  if update {
    // Auto update
    thread::spawn(move || {
      let client = reqwest::blocking::Client::new();

      let latest_version = client
        .get("https://cdn.phaz.uk/vrcpm/latest")
        .send()
        .unwrap()
        .text()
        .unwrap();

      if latest_version != util::get_version::get_version() {
        match fs::metadata(&container_folder.join("./updater.exe")) {
          Ok(_) => {}
          Err(_) => {
            let latest_installer = client
              .get("https://cdn.phaz.uk/vrcpm/vrcpm-installer.exe")
              .timeout(Duration::from_secs(120))
              .send()
              .unwrap()
              .bytes()
              .unwrap();

            fs::write(&container_folder.join("./updater.exe"), latest_installer)
              .unwrap();
          }
        }

        let mut cmd = Command::new(&container_folder.join("./updater.exe"));
        cmd.current_dir(container_folder);
        cmd.spawn().expect("Cannot run updater");

        process::exit(0);
      }
    });
  }
}