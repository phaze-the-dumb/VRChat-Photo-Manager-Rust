import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { bytesToFormatted } from "../utils";
import { invoke } from '@tauri-apps/api/core';
import anime from "animejs";
import { fetch } from "@tauri-apps/plugin-http"

class SettingsMenuProps{
  setLoadingType!: ( type: string ) => string;
  photoCount!: () => number;
  photoSize!: () => number;
  setRequestPhotoReload!: ( val: boolean ) => boolean;
  loggedIn!: () => { loggedIn: boolean, username: string, avatar: string, id: string, serverVersion: string };
  storageInfo!: () => { storage: number, used: number, sync: boolean };
  setStorageInfo!: ( info: { storage: number, used: number, sync: boolean } ) => { storage: number, used: number, sync: boolean };
  setConfirmationBox!: ( text: string, cb: () => void ) => void;
  setLoggedIn!: ( val: { loggedIn: boolean, username: string, avatar: string, id: string, serverVersion: string } ) => { loggedIn: boolean, username: string, avatar: string, id: string, serverVersion: string };
}

let SettingsMenu = ( props: SettingsMenuProps ) => {
  let sliderBar: HTMLElement;
  let settingsContainer: HTMLElement;
  let currentButton = 0;
  let lastClickedButton = -1;
  let finalPathConfirm: HTMLElement;
  let finalPathInput: HTMLElement;
  let finalPathData: string;
  let finalPathPreviousData: string;

  let [ deletingPhotos, setDeletingPhotos ] = createSignal(false);

  let closeWithKey = ( e: KeyboardEvent ) => {
    if(e.key === 'Escape'){
      anime({
        targets: '.settings',
        opacity: 0,
        translateX: '500px',
        easing: 'easeInOutQuad',
        duration: 250,
        complete: () => {
          anime.set('.settings', { display: 'none' });
        }
      })
    }
  }

  onMount(async () => {
    if(await invoke('get_config_value_string', { key: 'transparent' }) === "true"){
      invoke('set_config_value_string', { key: 'transparent', value: 'true' });

      anime({ targets: document.body, background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
      anime({ targets: '.settings', background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
    } else{
      invoke('set_config_value_string', { key: 'transparent', value: 'false' });

      anime({ targets: document.body, background: 'rgba(0, 0, 0, 1)', easing: 'linear', duration: 100 });
      anime({ targets: '.settings', background: 'rgba(0, 0, 0, 0)', easing: 'linear', duration: 100 });
    }

    let sliderMouseDown = false;
    let mouseStartX = 0;

    let width = window.innerWidth;
    let buttons = [ 370, 680 ];

    let sliderPos = width / 2 - buttons[currentButton];
    let sliderScale = width / (buttons[1] - buttons[0]);

    let render = () => {
      requestAnimationFrame(render);

      if(!sliderMouseDown){
        sliderPos = sliderPos + (width / 2 - buttons[currentButton] - sliderPos) * 0.25;
        anime.set(sliderBar, { translateX: sliderPos });

        settingsContainer.style.left = (sliderPos - (width / 2 - buttons[0])) * sliderScale + 'px';
      }
    }

    render();
    anime.set(sliderBar, { translateX: sliderPos });

    sliderBar.addEventListener('touchstart', ( e: TouchEvent ) => {
      sliderMouseDown = true;
      mouseStartX = e.touches[0].clientX;
    })

    window.addEventListener('touchmove', ( e: TouchEvent ) => {
      if(sliderMouseDown){
        anime.set(sliderBar, { translateX: sliderPos - (mouseStartX - e.touches[0].clientX) });
        settingsContainer.style.left = (sliderPos - (mouseStartX - e.touches[0].clientX) - (width / 2 - buttons[0])) * sliderScale + 'px';
      }
    })

    window.addEventListener('keyup', closeWithKey);

    window.addEventListener('touchend', ( e: TouchEvent ) => {
      if(sliderMouseDown){
        sliderPos = sliderPos - (mouseStartX - e.touches[0].clientX);

        anime.set(sliderBar, { translateX: sliderPos - (mouseStartX - e.touches[0].clientX) });
        sliderMouseDown = false;

        if(Math.abs(mouseStartX - e.touches[0].clientX) > 50){
          let shortestDistance = 0;
          let selectedButton = -1;

          buttons.forEach(( pos, indx ) => {
            let dis = Math.abs(sliderPos - (width / 2 - pos));

            if(selectedButton === -1){
              shortestDistance = dis;
              selectedButton = indx;
            } else if(shortestDistance > dis){
              shortestDistance = dis;
              selectedButton = indx;
            }
          })

          currentButton = selectedButton;
        } else if(lastClickedButton != -1){
          currentButton = lastClickedButton;
          lastClickedButton = -1
        }
      }
    })

    sliderBar.addEventListener('mousedown', ( e: MouseEvent ) => {
      sliderMouseDown = true;
      mouseStartX = e.clientX;
    });

    window.addEventListener('mousemove', ( e: MouseEvent ) => {
      if(sliderMouseDown){
        anime.set(sliderBar, { translateX: sliderPos - (mouseStartX - e.clientX) });
        settingsContainer.style.left = sliderPos - (mouseStartX - e.clientX) + 'px';
        settingsContainer.style.left = (sliderPos - (mouseStartX - e.clientX) - (width / 2 - buttons[0])) * sliderScale + 'px';
      }
    })

    window.addEventListener('mouseup', ( e: MouseEvent ) => {
      if(sliderMouseDown){
        sliderPos = sliderPos - (mouseStartX - e.clientX);

        anime.set(sliderBar, { translateX: sliderPos - (mouseStartX - e.clientX) });
        sliderMouseDown = false;

        if(Math.abs(mouseStartX - e.clientX) > 50){
          let shortestDistance = 0;
          let selectedButton = -1;

          buttons.forEach(( pos, indx ) => {
            let dis = Math.abs(sliderPos - (width / 2 - pos));

            if(selectedButton === -1){
              shortestDistance = dis;
              selectedButton = indx;
            } else if(shortestDistance > dis){
              shortestDistance = dis;
              selectedButton = indx;
            }
          })

          currentButton = selectedButton;
        } else if(lastClickedButton != -1){
          currentButton = lastClickedButton;
          lastClickedButton = -1
        }
      }
    })

    window.addEventListener('resize', () => {
      width = window.innerWidth;
      sliderPos = width / 2 - buttons[currentButton];
      sliderScale = width / (buttons[1] - buttons[0]);

      anime.set(sliderBar, { translateX: sliderPos  });
    })

    sliderBar.addEventListener('wheel', ( e: WheelEvent ) => {
      if(e.deltaY > 0){
        if(buttons[currentButton + 1])
          currentButton++;
      } else{
        if(buttons[currentButton - 1])
          currentButton--;
      }
    })
  })

  onCleanup(() => {
    window.removeEventListener('keyup', closeWithKey);
  })

  let refreshAccount = async () => {
    fetch('https://photos.phazed.xyz/api/v1/account?token='+(await invoke('get_config_value_string', { key: 'token' }))!)
      .then(data => data.json())
      .then(data => {
        if(!data.ok){
          console.error(data);
          return;
        }

        console.log(data);
        props.setLoggedIn({ loggedIn: true, username: data.user.username, avatar: data.user.avatar, id: data.user._id, serverVersion: data.user.serverVersion });
        props.setStorageInfo({ storage: data.user.storage, used: data.user.used, sync: data.user.settings.enableSync });
      })
      .catch(e => {
        console.error(e);
      })
  }

  return (
    <div class="settings">
      <div class="settings-container" ref={( el ) => settingsContainer = el}>
        <div class="settings-block">
          <h1>Storage Settings</h1>
          <p>{ props.photoCount() } Photos ({ bytesToFormatted(props.photoSize(), 0) })</p>

          <div class="selector">
            <input type="checkbox" id="start-in-bg-check" ref={async ( el ) => {
              el.checked = await invoke('get_config_value_string', { key: 'start-in-bg' }) === "true" ? true : false;
            }} onChange={( el ) => {
              if(el.target.checked){
                invoke('set_config_value_string', { key: 'start-in-bg', value: 'true' });
              } else{
                invoke('set_config_value_string', { key: 'start-in-bg', value: 'false' });
              }
            }} />
            Start in background

            <label for="start-in-bg-check">
              <div class="selection-box">
                <div class="icon" style={{ width: '10px', margin: '0', display: 'inline-flex' }}>
                  <img draggable="false" src="/icon/check-solid.svg"></img>
                </div>
              </div>
            </label>
          </div>

          <div class="selector">
            <input type="checkbox" id="start-with-win-check" ref={async ( el ) => {
              el.checked = await invoke('get_config_value_string', { key: 'start-with-win' }) === "true" ? true : false;
            }} onChange={( el ) => {
              if(el.target.checked){
                invoke('set_config_value_string', { key: 'start-with-win', value: 'true' });
                invoke("start_with_win", { start: true });
              } else{
                invoke('set_config_value_string', { key: 'start-with-win', value: 'false' });
                invoke("start_with_win", { start: false });
              }
            }} />
            Start with windows

            <label for="start-with-win-check">
              <div class="selection-box">
                <div class="icon" style={{ width: '10px', margin: '0', display: 'inline-flex' }}>
                  <img draggable="false" src="/icon/check-solid.svg"></img>
                </div>
              </div>
            </label>
          </div>

          <div class="selector">
            <input type="checkbox" id="transparent-check" ref={async ( el ) => {
              el.checked = await invoke('get_config_value_string', { key: 'transparent' }) === "true" ? true : false;
            }} onChange={( el ) => {
              if(el.target.checked){
                invoke('set_config_value_string', { key: 'transparent', value: 'true' });

                anime({ targets: document.body, background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
                anime({ targets: '.settings', background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
              } else{
                invoke('set_config_value_string', { key: 'transparent', value: 'false' });

                anime({ targets: document.body, background: 'rgba(0, 0, 0, 1)', easing: 'linear', duration: 100 });
                anime({ targets: '.settings', background: 'rgba(0, 0, 0, 0)', easing: 'linear', duration: 100 });
              }
            }} />
            Window Transparency

            <label for="transparent-check">
              <div class="selection-box">
                <div class="icon" style={{ width: '10px', margin: '0', display: 'inline-flex' }}>
                  <img draggable="false" src="/icon/check-solid.svg"></img>
                </div>
              </div>
            </label>
          </div>

          <br />
          <p>
            VRChat Photo Path:
            <span class="path" ref={( el ) =>
              invoke('get_user_photos_path').then(( path: any ) => {
                el.innerHTML = '';
                el.appendChild(<span style={{ outline: 'none' }} ref={( el ) => finalPathInput = el} onInput={( el ) => {
                  finalPathConfirm.style.display = 'inline-block';
                  finalPathData = el.target.innerHTML;
                }} contenteditable>{path}</span> as Node);

                finalPathPreviousData = path;
              })
            }>
              Loading...
            </span>
            <span style={{ display: 'none' }} ref={( el ) => finalPathConfirm = el}>
              <span class="path" style={{ color: 'green' }} onClick={async () => {
                finalPathPreviousData = finalPathData;
                finalPathConfirm.style.display = 'none';

                await invoke('change_final_path', { newPath: finalPathData });
                await invoke('relaunch');

                anime({
                  targets: '.settings',
                  opacity: 0,
                  translateX: '500px',
                  easing: 'easeInOutQuad',
                  duration: 250,
                  complete: () => {
                    anime.set('.settings', { display: 'none' });
                  }
                })

                props.setRequestPhotoReload(true);
              }}>
                Save
              </span>

              <span class="path" style={{ color: 'red' }} onClick={() => {
                finalPathData = finalPathPreviousData;
                finalPathInput.innerHTML = finalPathPreviousData;
                finalPathConfirm.style.display = 'none';
              }}>
                Cancel
              </span>
            </span><br /><br />

            VRCPM Version: <span ref={( el ) => invoke('get_version').then((ver: any) => el.innerHTML = ver)}>Loading...</span>
          </p>

          <br />
          <p>To change the directory VRChat outputs photos to, you can change the "picture_output_folder" key in the <span style={{ color: '#00ccff', cursor: 'pointer' }} onClick={() => invoke('open_url', { url: 'https://docs.vrchat.com/docs/configuration-file#camera-and-screenshot-settings' })}>config.json file</span><br />Alternitavely, you can use VRCX to edit the config file.</p>

          <br />
          <p>VRChat Photo Manager supports photos with extra metadata provided by VRCX.</p>
        </div>
        <div class="settings-block">
          <h1>Account Settings</h1>

          <Show when={props.loggedIn().loggedIn} fallback={
            <div>
              You aren't logged in. To enable cloud sync and sharing features you need to login to your PhazeID.<br /><br />
              <div class="button" onClick={() => {
                props.setLoadingType('auth');

                setTimeout(() => {
                  props.setLoadingType('none');
                }, 5000);
    
                invoke('start_user_auth');
              }}>Login</div>
            </div>
          }>
            <div class="account-profile">
              <div class="account-pfp" style={{ background: `url('https://cdn.phazed.xyz/id/avatars/${props.loggedIn().id}/${props.loggedIn().avatar}.png')` }}></div>
              <div class="account-desc">
                <div class="reload-photos" onClick={() => refreshAccount()} style={{ opacity: 1 }}>
                  <div class="icon" style={{ width: '17px' }}>
                    <img draggable="false" src="/icon/arrows-rotate-solid.svg"></img>
                  </div>
                </div>
                <h2>{ props.loggedIn().username }</h2>

                <Show when={props.storageInfo().sync}>
                  <div class="storage-bar">
                    <div class="storage-bar-inner" style={{ width: ((props.storageInfo().used / props.storageInfo().storage) * 100) + '%' }}></div>
                  </div>

                  <div>
                    { bytesToFormatted(props.storageInfo().used, 0) } / { bytesToFormatted(props.storageInfo().storage, 0) }<br /><br />

                    <span style={{ 'font-size': '10px' }}>Server Version: { props.loggedIn().serverVersion }</span>
                  </div>
                </Show>
              </div>
            </div>

            <div class="account-notice">To enable cloud storage or get more storage please contact "_phaz" on discord</div>

            <div class="account-notice" style={{ display: 'flex' }}>
              <Show when={!deletingPhotos()} fallback={ "We are deleting your photos, please leave this window open while we delete them." }>
                <div class="button-danger" onClick={() => props.setConfirmationBox("You are about to delete all your photos from the cloud, and disable syncing. This will NOT delete any local files.", async () => {
                  props.setStorageInfo({ used: 0, storage: 0, sync: false });
                  setDeletingPhotos(true);

                  fetch('https://photos-cdn.phazed.xyz/api/v1/allphotos', {
                    method: 'DELETE',
                    headers: { auth: (await invoke('get_config_value_string', { key: 'token' }))! }
                  })
                    .then(data => data.json())
                    .then(data => {
                      console.log(data);
                      setDeletingPhotos(false);
                    })
                })}>Delete All Photos.</div> <div>This deletes all photos stored in the cloud and disables syncing.</div>
              </Show>
            </div>
          </Show>
        </div>
      </div>

      <div class="slide-bar-tri"></div>
      <div class="slide-bar">
        <div class="inner-slide-bar" ref={( el ) => sliderBar = el}>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-text" onMouseDown={() => lastClickedButton = 0}>Program Settings</div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-text" onMouseDown={() => lastClickedButton = 1}>Account Settings</div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
        </div>
      </div>
    </div>
  )
}

export default SettingsMenu;