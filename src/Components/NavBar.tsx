import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { fetch } from "@tauri-apps/plugin-http";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import anime from 'animejs';
import { Show, createSignal, onMount } from 'solid-js';
const appWindow = getCurrentWebviewWindow()

class NavBarProps{
  setLoadingType!: ( type: string ) => string;
  loggedIn!: () => { loggedIn: boolean, username: string, avatar: string, id: string, serverVersion: string };
  setStorageInfo!: ( info: { storage: number, used: number, sync: boolean } ) => { storage: number, used: number, sync: boolean };
  setIsPhotosSyncing!: ( syncing: boolean ) => boolean;
}

let NavBar = ( props: NavBarProps ) => {
  let dropdownVisible = false;
  let inAnimation = false;
  let dropdown: HTMLElement;

  let [ isSyncing, setIsSyncing ] = createSignal(false);
  let [ syncPhotoTotal, setSyncPhotoTotal ] = createSignal(0);
  let [ syncPhotoUploading, setSyncPhotoUploading ] = createSignal(0);
  let [ syncError, setSyncError ] = createSignal("");
  let [ syncType, setSyncType ] = createSignal("Upload");

  onMount(() => {
    anime.set(dropdown, { opacity: 0,  translateX: -10 });
    dropdown.style.display = 'none';
  })

  listen('photos-upload-meta', ( e: any ) => {
    setIsSyncing(true);
    setSyncPhotoTotal(e.payload.photos_total);
    setSyncPhotoUploading(e.payload.photos_total - e.payload.photos_uploading);
    setSyncType('Upload');

    console.log(e.payload)
  })

  listen('photos-download-meta', ( e: any ) => {
    setIsSyncing(true);
    setSyncPhotoTotal(e.payload.photos_total);
    setSyncPhotoUploading(e.payload.photos_total - e.payload.photos_uploading);
    setSyncType('Download');

    console.log(e.payload)
  })

  listen('sync-finished', () => {
    props.setIsPhotosSyncing(false);
    setIsSyncing(false);
  })

  let setDropdownVisibility = ( visible: boolean ) => {
    if(inAnimation)return;

    if(dropdownVisible !== visible){
      dropdownVisible = visible;
      inAnimation = true;

      if(visible){
        dropdown.style.display = 'block';

        anime({
          targets: dropdown,
          opacity: 1,
          translateX: 0,
          easing: 'easeInOutQuad',
          duration: 250,
          complete: () => {
            inAnimation = false;
          }
        })
      } else{
        anime({
          targets: dropdown,
          opacity: 0,
          translateX: -10,
          easing: 'easeInOutQuad',
          duration: 250,
          complete: () => {
            inAnimation = false;
            dropdown.style.display = 'none';
          }
        })
      }
    }
  }


  listen('sync-failed', ( e: any ) => {
    setSyncError(e.payload);
  })

  window.CloseAllPopups.push(() => setDropdownVisibility(false));

  return (
    <>
      <div class="navbar" data-tauri-drag-region>
        <div class="tabs" data-tauri-drag-region >
          <div class="nav-tab" onClick={() => {
            anime(
              {
                targets: '.settings',
                opacity: 0,
                translateX: '500px',
                easing: 'easeInOutQuad',
                duration: 250,
                complete: () => {
                  anime.set('.settings', { display: 'none' });
                }
              })
          }}>Photos</div>
        </div>
        <div class="nav-tab" style={{ width: '200px', "text-align": 'center', background: 'transparent' }} data-tauri-drag-region>
          <Show when={isSyncing()}>
            <Show when={ syncError() == "" } fallback={ "Error: " + syncError() }>
              <div style={{ width: '100%', "text-align": 'center', 'font-size': '14px' }}>
                { syncType() }ing: { syncPhotoUploading() } / { syncPhotoTotal() }<br />
                <div style={{ width: '80%', height: '2px', margin: 'auto', "margin-top": '5px', background: '#111' }}>
                  <div style={{ height: '2px', width: (syncPhotoUploading() / syncPhotoTotal()) * 100 + '%', background: '#00ccff' }}></div>
                </div>
              </div>
            </Show>
          </Show>
        </div>
        <div class="account" onClick={() => setDropdownVisibility(!dropdownVisible)}>
          <Show when={props.loggedIn().loggedIn}>
            <div class="user-pfp" style={{ background: `url('https://cdn.phazed.xyz/id/avatars/${props.loggedIn().id}/${props.loggedIn().avatar}.png')` }}></div>
          </Show>
          <div class="icon">
            <img draggable="false" src="/icon/caret-down-solid.svg"></img>
          </div>
        </div>
        <div class="control-lights">
          <div class="light" onClick={() => appWindow.minimize()}>
            <img draggable="false" src="/icon/minus-solid.svg"></img>
          </div>
          <div class="light" onClick={() => appWindow.toggleMaximize()}>
            <img draggable="false" src="/icon/square-regular.svg"></img>
          </div>
          <div class="light" onClick={() => appWindow.hide()}>
            <img draggable="false" src="/icon/x-solid.svg"></img>
          </div>
        </div>
      </div>

      <div class="dropdown" ref={( el ) => dropdown = el}>
        <div class="dropdown-button" onClick={() => {
          anime.set('.settings', { display: 'block' });
          anime({
            targets: '.settings',
            opacity: 1,
            translateX: '0px',
            easing: 'easeInOutQuad',
            duration: 250
          })

          fetch('https://photos.phazed.xyz/api/v1/account?token='+localStorage.getItem('token')!)
            .then(data => data.json())
            .then(data => {
              if(!data.data.ok){
                console.error(data);
                return;
              }

              console.log(data.data);
              props.setStorageInfo({ storage: data.data.user.storage, used: data.data.user.used, sync: data.data.user.settings.enableSync });
            })
            .catch(e => {
              console.error(e);
            })

          setDropdownVisibility(false);
        }}>Settings</div>

        <Show when={props.loggedIn().loggedIn == false} fallback={
          <div class="dropdown-button" onClick={() => {
            fetch('https://photos.phazed.xyz/api/v1/deauth?token='+localStorage.getItem('token')!)
              .then(data => data.json())
              .then(data => {
                console.log(data);

                localStorage.removeItem('token');
                window.location.reload();

                setDropdownVisibility(false);
              })
              .catch(e => {
                console.error(e);

                localStorage.removeItem('token');
                window.location.reload();

                setDropdownVisibility(false);
              })
          }}>Sign Out</div>
        }>
          <div class="dropdown-button" onClick={() => {
            props.setLoadingType('auth');

            setTimeout(() => {
              props.setLoadingType('none');
            }, 5000);

            invoke('start_user_auth');
            setDropdownVisibility(false); 
          }}>Sign In</div>
        </Show>
      </div>
    </>
  )
}

export default NavBar;