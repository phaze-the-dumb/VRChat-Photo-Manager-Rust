/* @refresh reload */
import { render } from "solid-js/web";

declare global{
  interface Window {
    CloseAllPopups: (() => void)[]
  }
}

window.CloseAllPopups = [];

import "./styles.css";
import App from "./Components/App";

render(() => <App />, document.getElementById("root") as HTMLElement);

let f =  new FontFace('Rubik', 'url(https://cdn.phaz.uk/fonts/rubik/Rubik-VariableFont_wght.ttf)');

f.load().then((font) => {
  document.fonts.add(font);
});