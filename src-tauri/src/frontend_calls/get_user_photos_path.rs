use tauri::State;

use crate::util::cache::Cache;

// Check if the photo config file exists
// if not just return the default vrchat path
#[tauri::command]
pub fn get_user_photos_path( cache: State<Cache> ) -> String {
  let photo_path = cache.get("photo-path".into());
  photo_path.unwrap()
}
