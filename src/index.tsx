/* @refresh reload */
import { render } from "solid-js/web";

declare global{
  interface Window {
    AccountManager: AccountManager;
    LoadingManager: LoadingManager;
    PhotoManager: PhotoManager;
    ConfirmationBoxManager: ConfirmationBoxManager;
    PhotoViewerManager: PhotoViewerManager;
    WorldCacheManager: WorldCacheManager;

    CloseAllPopups: (() => void)[];
    OS: string;
  }
}

window.CloseAllPopups = [];

window.oncontextmenu = ( e ) => e.preventDefault(); 

import "./styles.css";
import App from "./Components/App";
import { invoke } from "@tauri-apps/api/core";

import { AccountManager } from "./Components/Managers/AccountManager";
import { LoadingManager } from "./Components/Managers/LoadingManager";
import { PhotoManager } from "./Components/Managers/PhotoManager";
import { ConfirmationBoxManager } from "./Components/Managers/ConfirmationBoxManager";
import { PhotoViewerManager } from "./Components/Managers/PhotoViewerManager";
import { WorldCacheManager } from "./Components/Managers/WorldCacheManager";

window.AccountManager = new AccountManager();
window.LoadingManager = new LoadingManager();
window.PhotoManager = new PhotoManager();
window.ConfirmationBoxManager = new ConfirmationBoxManager();
window.PhotoViewerManager = new PhotoViewerManager();
window.WorldCacheManager = new WorldCacheManager();

(async () => {
  window.OS = await invoke('get_os');

  render(() => <App />, document.getElementById("root") as HTMLElement);
  
  let f =  new FontFace('Rubik', 'url(https://cdn.phaz.uk/fonts/rubik/Rubik-VariableFont_wght.ttf)');
  
  f.load().then((font) => {
    document.fonts.add(font);
  });
})();
