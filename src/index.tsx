/* @refresh reload */
import { render } from "solid-js/web";

declare global{
  interface Window {
    LoadingManager: LoadingManager;
    PhotoManager: PhotoManager;
    ConfirmationBoxManager: ConfirmationBoxManager;
    PhotoViewerManager: PhotoViewerManager;
    WorldCacheManager: WorldCacheManager;
    PhotoListRenderingManager: PhotoListRenderingManager;
    SyncManager: SyncManager;
    ViewManager: ViewManager;

    CloseAllPopups: (() => void)[];
    OS: string;

  }
}

window.CloseAllPopups = [];

window.oncontextmenu = ( e ) => e.preventDefault(); 

import "./styles.css";
import App from "./Components/App";
import { invoke } from "@tauri-apps/api/core";

import { LoadingManager } from "./Components/Managers/LoadingManager";
import { PhotoManager } from "./Components/Managers/PhotoManager";
import { ConfirmationBoxManager } from "./Components/Managers/ConfirmationBoxManager";
import { PhotoViewerManager } from "./Components/Managers/PhotoViewerManager";
import { WorldCacheManager } from "./Components/Managers/WorldCacheManager";
import { PhotoListRenderingManager } from "./Components/Managers/PhotoListRenderingManager";
import { SyncManager } from "./Components/Managers/SyncManager";
import { ViewManager } from "./Components/Managers/ViewManager";

window.LoadingManager = new LoadingManager();
window.PhotoManager = new PhotoManager();
window.ConfirmationBoxManager = new ConfirmationBoxManager();
window.PhotoViewerManager = new PhotoViewerManager();
window.WorldCacheManager = new WorldCacheManager();
window.PhotoListRenderingManager = new PhotoListRenderingManager();
window.SyncManager = new SyncManager();
window.ViewManager = new ViewManager();

(async () => {
  window.OS = await invoke('get_os');

  render(() => <App />, document.getElementById("root") as HTMLElement);
  
  let f =  new FontFace('Rubik', 'url(https://cdn.phaz.uk/fonts/rubik/Rubik-VariableFont_wght.ttf)');
  
  f.load().then((font) => {
    document.fonts.add(font);
  });
})();
