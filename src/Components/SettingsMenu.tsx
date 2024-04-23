import { createSignal, onMount, Show } from "solid-js";
import { bytesToFormatted } from "../utils";
import { relaunch } from '@tauri-apps/api/process';
import { invoke } from '@tauri-apps/api/tauri';
import anime from "animejs";
import { fetch, ResponseType } from "@tauri-apps/api/http"

class SettingsMenuProps{
  photoCount!: () => number;
  photoSize!: () => number;
  setRequestPhotoReload!: ( val: boolean ) => boolean;
  loggedIn!: () => { loggedIn: boolean, username: string, avatar: string, id: string, serverVersion: string };
  storageInfo!: () => { storage: number, used: number, sync: boolean };
  setStorageInfo!: ( info: { storage: number, used: number, sync: boolean } ) => { storage: number, used: number, sync: boolean };
  setConfirmationBox!: ( text: string, cb: () => void ) => void;
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

  onMount(() => {
    if(localStorage.getItem('transparent')){
      localStorage.setItem('transparent', 'true');

      anime({ targets: document.body, background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
      anime({ targets: '.settings', background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
    } else{
      localStorage.removeItem('transparent')

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

  let refreshAccount = () => {
    fetch<any>('https://photos.phazed.xyz/api/v1/account', {
      method: 'GET',
      headers: { auth: localStorage.getItem('token')! },
      responseType: ResponseType.JSON
    })
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
  }

  return (
    <div class="settings">
      <div class="settings-container" ref={( el ) => settingsContainer = el}>
        <div class="settings-block">
          <h1>Storage Settings</h1>
          <p>{ props.photoCount() } Photos ({ bytesToFormatted(props.photoSize(), 0) })</p>

          <div class="selector">
            <input type="checkbox" id="start-in-bg-check" ref={( el ) => {
              el.checked = localStorage.getItem('start-in-bg') ? true : false;
            }} onChange={( el ) => {
              if(el.target.checked){
                localStorage.setItem('start-in-bg', 'true');
              } else{
                localStorage.removeItem('start-in-bg')
              }
            }} />
            Start in background

            <label for="start-in-bg-check">
              <div class="selection-box">
                <i class="fa-solid fa-check"></i>
              </div>
            </label>
          </div>

          <div class="selector">
            <input type="checkbox" id="start-with-win-check" ref={( el ) => {
              el.checked = localStorage.getItem('start-with-win') ? true : false;
            }} onChange={( el ) => {
              if(el.target.checked){
                localStorage.setItem('start-with-win', 'true');
                invoke("start_with_win", { start: true });
              } else{
                localStorage.removeItem('start-with-win')
                invoke("start_with_win", { start: false });
              }
            }} />
            Start with windows

            <label for="start-with-win-check">
              <div class="selection-box">
                <i class="fa-solid fa-check"></i>
              </div>
            </label>
          </div>

          <div class="selector">
            <input type="checkbox" id="transparent-check" ref={( el ) => {
              el.checked = localStorage.getItem('transparent') ? true : false;
            }} onChange={( el ) => {
              if(el.target.checked){
                localStorage.setItem('transparent', 'true');

                anime({ targets: document.body, background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
                anime({ targets: '.settings', background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
              } else{
                localStorage.removeItem('transparent')

                anime({ targets: document.body, background: 'rgba(0, 0, 0, 1)', easing: 'linear', duration: 100 });
                anime({ targets: '.settings', background: 'rgba(0, 0, 0, 0)', easing: 'linear', duration: 100 });
              }
            }} />
            Window Transparency

            <label for="transparent-check">
              <div class="selection-box">
                <i class="fa-solid fa-check"></i>
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
                await relaunch();

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
              }}><i class="fa-solid fa-check"></i></span>

              <span class="path" style={{ color: 'red' }} onClick={() => {
                finalPathData = finalPathPreviousData;
                finalPathInput.innerHTML = finalPathPreviousData;
                finalPathConfirm.style.display = 'none';
              }}><i class="fa-solid fa-xmark"></i></span>
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

          <Show when={props.loggedIn().loggedIn}>
            <div class="account-profile">
              <div class="account-pfp" style={{ background: `url('https://cdn.phazed.xyz/id/avatars/${props.loggedIn().id}/${props.loggedIn().avatar}.png')` }}></div>
              <div class="account-desc">
                <div class="reload-photos" onClick={() => refreshAccount()}><i class="fa-solid fa-arrows-rotate"></i></div>
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
                <div class="button-danger" onClick={() => props.setConfirmationBox("You are about to delete all your photos from the cloud, and disable syncing. This will NOT delete any local files.", () => {
                  props.setStorageInfo({ used: 0, storage: 0, sync: false });
                  setDeletingPhotos(true);

                  fetch<any>('https://photos.phazed.xyz/api/v1/allphotos', {
                    method: 'DELETE',
                    headers: { auth: localStorage.getItem("token")! },
                    responseType: ResponseType.JSON
                  })
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