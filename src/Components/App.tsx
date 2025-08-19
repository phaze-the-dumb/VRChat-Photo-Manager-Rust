import { onMount } from "solid-js";

import PhotoList from "./PhotoList";
import PhotoViewer from "./PhotoViewer";
import SettingsMenu from "./SettingsMenu";
import { utils } from "animejs";

let App = () => {
  onMount(() => {
    utils.set('.settings',
    {
      display: 'none',
      opacity: 0,
      translateX: '500px'
    })
  })

  return (
    <div class="container">
      <PhotoList />
      <PhotoViewer />

      <SettingsMenu />

      <div class="copy-notif">Image Copied!</div>
    </div>
  );
}

export default App;
