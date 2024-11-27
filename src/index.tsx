/* @refresh reload */
import { render } from "solid-js/web";

declare global{
  interface Window {
    CloseAllPopups: (() => void)[]
    OS: string;
  }
}

window.CloseAllPopups = [];

window.oncontextmenu = ( e ) => e.preventDefault(); 

import "./styles.css";
import App from "./Components/App";
import { invoke } from "@tauri-apps/api/core";

(async () => {
  window.OS = await invoke('get_os');

  render(() => <App />, document.getElementById("root") as HTMLElement);
  
  let f =  new FontFace('Rubik', 'url(https://cdn.phaz.uk/fonts/rubik/Rubik-VariableFont_wght.ttf)');
  
  f.load().then((font) => {
    document.fonts.add(font);
  });
})();
