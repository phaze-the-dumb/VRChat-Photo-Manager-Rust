import { onMount } from "solid-js";
import anime from "animejs";

import NavBar from "./NavBar";
import PhotoList from "./PhotoList";
import PhotoViewer from "./PhotoViewer";
import SettingsMenu from "./SettingsMenu";

let App = () => {
  onMount(() => {
    anime.set('.settings',
    {
      display: 'none',
      opacity: 0,
      translateX: '500px'
    })
  })

  return (
    <div class="container">
      <NavBar />

      <PhotoList />
      <PhotoViewer />

      <SettingsMenu />

      <div class="copy-notif">Image Copied!</div>
    </div>
  );
}

export default App;
