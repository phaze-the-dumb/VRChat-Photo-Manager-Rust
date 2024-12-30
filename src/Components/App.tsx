import { createSignal, onMount } from "solid-js";
import anime from "animejs";
import { invoke } from '@tauri-apps/api/core';

import NavBar from "./NavBar";
import PhotoList from "./PhotoList";
import PhotoViewer from "./PhotoViewer";
import SettingsMenu from "./SettingsMenu";

// TODO: Clean up frontend files, split up into smaller files PLEASE

function App() {
  invoke('close_splashscreen')

  let [ currentPhotoView, setCurrentPhotoView ] = createSignal<any>(null);
  let [ photoNavChoice, setPhotoNavChoice ] = createSignal<string>('');

  let [ isPhotosSyncing, setIsPhotosSyncing ] = createSignal(false);

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
      <NavBar
        setIsPhotosSyncing={setIsPhotosSyncing} />

      <PhotoList
        isPhotosSyncing={isPhotosSyncing}
        setIsPhotosSyncing={setIsPhotosSyncing}
        setCurrentPhotoView={setCurrentPhotoView}
        currentPhotoView={currentPhotoView}
        photoNavChoice={photoNavChoice}
        setPhotoNavChoice={setPhotoNavChoice} />

      <PhotoViewer
        setPhotoNavChoice={setPhotoNavChoice}
        currentPhotoView={currentPhotoView}
        setCurrentPhotoView={setCurrentPhotoView} />

      <SettingsMenu />

      <div class="copy-notif">Image Copied!</div>
    </div>
  );
}

export default App;
