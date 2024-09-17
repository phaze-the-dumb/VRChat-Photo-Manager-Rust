use std::thread;
use crate::worldscraper::World;
use tauri::Emitter;

// Load vrchat world data
#[tauri::command]
pub fn find_world_by_id(world_id: String, window: tauri::Window) {
  thread::spawn(move || {
    let world = World::new(world_id);
    window.emit("world_data", world).unwrap();
  });
}