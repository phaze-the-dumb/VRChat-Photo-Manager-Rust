import { createSignal, createEffect, Switch, Match, onMount } from "solid-js";
import { listen } from '@tauri-apps/api/event';
import { fetch, ResponseType } from "@tauri-apps/api/http"
import anime from "animejs";
import { invoke } from '@tauri-apps/api/tauri';

import NavBar from "./NavBar";
import PhotoList from "./PhotoList";
import PhotoViewer from "./PhotoViewer";
import SettingsMenu from "./SettingsMenu";

function App() {
  if(!localStorage.getItem('start-in-bg')){
    invoke('close_splashscreen')
  }

  let [ loggedIn, setLoggedIn ] = createSignal({ loggedIn: false, username: '', avatar: '', id: '', serverVersion: '0.0' });
  let [ storageInfo, setStorageInfo ] = createSignal({ storage: 0, used: 0, sync: false });
  let [ loadingType, setLoadingType ] = createSignal('load');
  let [ currentPhotoView, setCurrentPhotoView ] = createSignal<any>(null);
  let [ photoNavChoice, setPhotoNavChoice ] = createSignal<string>('');

  let [ confirmationBoxText, setConfirmationBoxText ] = createSignal<string>('');
  let confirmationBoxCallback = () => {}

  let [ photoCount, setPhotoCount ] = createSignal(0);
  let [ photoSize, setPhotoSize ] = createSignal(0);

  let [ requestPhotoReload, setRequestPhotoReload ] = createSignal(false);

  let [ isPhotosSyncing, setIsPhotosSyncing ] = createSignal(false);

  let setConfirmationBox = ( text: string, cb: () => void ) => {
    setConfirmationBoxText(text);
    confirmationBoxCallback = cb;
  }

  if(localStorage.getItem('token')){
    fetch<any>('https://photos.phazed.xyz/api/v1/account?token='+localStorage.getItem('token'), {
      method: 'GET',
      responseType: ResponseType.JSON
    })
      .then(data => {
        if(!data.data.ok){
          return console.error(data);
        }

        console.log(data.data);
        setLoggedIn({ loggedIn: true, username: data.data.user.username, avatar: data.data.user.avatar, id: data.data.user._id, serverVersion: data.data.user.serverVersion });
        setStorageInfo({ storage: data.data.user.storage, used: data.data.user.used, sync: data.data.user.settings.enableSync });

        if(!isPhotosSyncing() && data.data.user.settings.enableSync){
          setIsPhotosSyncing(true);
          invoke('sync_photos', { token: localStorage.getItem('token') });
        }
      })
      .catch(e => {
        console.error(e);
      })
  }

  setTimeout(() => {
    setLoadingType('none');
  }, 500);

  let loadingBlackout: HTMLElement;
  let loadingShown = false;

  let confirmationBox: HTMLElement;

  createEffect(() => {
    if(confirmationBoxText() !== ''){
      confirmationBox.style.display = 'block';

      setTimeout(() => {
        confirmationBox.style.opacity = '1';
      }, 1);
    } else{
      confirmationBox.style.opacity = '0';

      setTimeout(() => {
        confirmationBox.style.display = 'none';
      }, 250);
    }
  })

  createEffect(() => {
    let type = loadingType();

    if(loadingShown != (type != 'none')){
      loadingShown = (type != 'none');

      if(loadingShown){
        loadingBlackout.style.display = 'flex';
        anime({
          targets: loadingBlackout,
          opacity: 1,
          easing: 'easeInOutQuad',
          duration: 250
        })
      } else{
        anime({
          targets: loadingBlackout,
          opacity: 0,
          easing: 'easeInOutQuad',
          duration: 250,
          complete: () => {
            loadingBlackout.style.display = 'none';
          }
        })
      }
    }
  })

  listen('auth-callback', ( event: any ) => {
    let token = event.payload;

    fetch<any>('https://photos.phazed.xyz/api/v1/account?token='+token, {
      method: 'GET',
      responseType: ResponseType.JSON
    })
      .then(data => {
        if(!data.data.ok){
          console.error(data);
          return setLoadingType('none');
        }

        console.log(data.data);
        localStorage.setItem('token', token);

        setLoadingType('none');
        setLoggedIn({ loggedIn: true, username: data.data.user.username, avatar: data.data.user.avatar, id: data.data.user._id, serverVersion: data.data.user.serverVersion });
        setStorageInfo({ storage: data.data.user.storage, used: data.data.user.used, sync: data.data.user.settings.enableSync });

        if(!isPhotosSyncing() && data.data.user.settings.enableSync){
          setIsPhotosSyncing(true);
          invoke('sync_photos', { token: localStorage.getItem('token') });
        }
      })
      .catch(e => {
        setLoadingType('none');
        console.error(e);
      })
  })

  listen('auth-denied', () => {
    setLoadingType('none');
    console.warn('Authetication Denied');
  })

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
        setLoadingType={setLoadingType}
        loggedIn={loggedIn}
        setStorageInfo={setStorageInfo}
        setIsPhotosSyncing={setIsPhotosSyncing} />

      <PhotoList
        storageInfo={storageInfo}
        isPhotosSyncing={isPhotosSyncing}
        setIsPhotosSyncing={setIsPhotosSyncing}
        setCurrentPhotoView={setCurrentPhotoView}
        currentPhotoView={currentPhotoView}
        photoNavChoice={photoNavChoice}
        setPhotoNavChoice={setPhotoNavChoice}
        setConfirmationBox={setConfirmationBox}
        loggedIn={loggedIn}
        setPhotoCount={setPhotoCount}
        setPhotoSize={setPhotoSize}
        requestPhotoReload={requestPhotoReload}
        setRequestPhotoReload={setRequestPhotoReload} />

      <PhotoViewer
        setPhotoNavChoice={setPhotoNavChoice}
        currentPhotoView={currentPhotoView}
        setCurrentPhotoView={setCurrentPhotoView}
        setConfirmationBox={setConfirmationBox} />

      <SettingsMenu
        setLoggedIn={setLoggedIn}
        setLoadingType={setLoadingType}
        photoCount={photoCount}
        photoSize={photoSize}
        setRequestPhotoReload={setRequestPhotoReload}
        loggedIn={loggedIn}
        storageInfo={storageInfo}
        setStorageInfo={setStorageInfo}
        setConfirmationBox={setConfirmationBox} />

      <div class="copy-notif">Image Copied!</div>

      <div class="loading" ref={( el ) => loadingBlackout = el}>
        <Switch>
          <Match when={loadingType() === 'auth'}>
            <p>Waiting for authentication in browser.</p>
          </Match>
          <Match when={loadingType() === 'load'}>
            <p>Loading App...</p>
          </Match>
        </Switch>
      </div>

      <div class="confirmation-box" ref={( el ) => confirmationBox = el}>
        <div class="confirmation-box-container">
          { confirmationBoxText() }<br /><br />

          <div class="button-danger" onClick={() => { confirmationBoxCallback(); setConfirmationBoxText('') }}>Confirm</div>
          <div class="button" onClick={() => setConfirmationBoxText('') }>Deny</div>
        </div>
      </div>
    </div>
  );
}

export default App;
