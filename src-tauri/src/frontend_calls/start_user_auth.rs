#[tauri::command]
pub fn start_user_auth() {
  open::that("https://photos.phazed.xyz/api/v1/auth").unwrap();
}