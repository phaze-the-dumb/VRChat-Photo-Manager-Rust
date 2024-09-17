use tauri::{ menu::{ MenuBuilder, MenuItemBuilder }, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}, AppHandle, Manager };

pub fn setup_traymenu( handle: &AppHandle ){
  // Setup the tray icon and menu buttons
  let quit = MenuItemBuilder::new("Quit")
    .id("quit")
    .build(handle)
    .unwrap();

  let hide = MenuItemBuilder::new("Hide / Show")
    .id("hide")
    .build(handle)
    .unwrap();

  let tray_menu = MenuBuilder::new(handle)
    .items(&[&quit, &hide])
    .build()
    .unwrap();

  TrayIconBuilder::with_id("main")
    .icon(tauri::image::Image::from_bytes(include_bytes!("../../icons/32x32.png")).unwrap())
    .menu(&tray_menu)
    .on_menu_event(move |app: &AppHandle, event| match event.id().as_ref() {
        "quit" => {
          std::process::exit(0);
        }
        "hide" => {
          let window = app.get_webview_window("main").unwrap();

          if window.is_visible().unwrap() {
            window.hide().unwrap();
          } else {
            window.show().unwrap();
            window.set_focus().unwrap();
          }
        }
        _ => {}
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
          ..
      } = event
      {
        let window = tray.app_handle().get_webview_window("main").unwrap();

        window.show().unwrap();
        window.set_focus().unwrap();
      }
    })
    .build(handle)
    .unwrap();
}