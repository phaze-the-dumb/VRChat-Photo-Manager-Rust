import { onCleanup, onMount, Show } from "solid-js";
import { bytesToFormatted } from "../utils";
import { invoke } from '@tauri-apps/api/core';
import { ViewState } from "./Managers/ViewManager";
import { animate, utils } from "animejs";

let SettingsMenu = () => {
  let sliderBar: HTMLElement;
  let settingsContainer: HTMLElement;
  let currentButton = 0;
  let lastClickedButton = -1;
  let finalPathConfirm: HTMLElement;
  let finalPathInput: HTMLElement;
  let finalPathData: string;
  let finalPathPreviousData: string;

  let closeWithKey = ( e: KeyboardEvent ) => {
    if(e.key === 'Escape'){
      window.ViewManager.ChangeState(ViewState.PHOTO_LIST);
      animate('.settings', {
        opacity: 0,
        translateX: '500px',
        easing: 'easeInOutQuad',
        duration: 250,
        onComplete: () => {
          utils.set('.settings', { display: 'none' });
        }
      })
    }
  }

  onMount(async () => {
    if(await invoke('get_config_value_string', { key: 'transparent' }) === "true"){
      invoke('set_config_value_string', { key: 'transparent', value: 'true' });

      animate(document.body, { background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
      animate('.settings', { background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
    } else{
      invoke('set_config_value_string', { key: 'transparent', value: 'false' });

      animate(document.body, { background: 'rgba(0, 0, 0, 1)', easing: 'linear', duration: 100 });
      animate('.settings', { background: 'rgba(0, 0, 0, 0)', easing: 'linear', duration: 100 });
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
        utils.set(sliderBar, { translateX: sliderPos });

        settingsContainer.style.left = (sliderPos - (width / 2 - buttons[0])) * sliderScale + 'px';
      }
    }

    render();
    utils.set(sliderBar, { translateX: sliderPos });

    sliderBar.addEventListener('touchstart', ( e: TouchEvent ) => {
      sliderMouseDown = true;
      mouseStartX = e.touches[0].clientX;
    })

    window.addEventListener('touchmove', ( e: TouchEvent ) => {
      if(sliderMouseDown){
        utils.set(sliderBar, { translateX: sliderPos - (mouseStartX - e.touches[0].clientX) });
        settingsContainer.style.left = (sliderPos - (mouseStartX - e.touches[0].clientX) - (width / 2 - buttons[0])) * sliderScale + 'px';
      }
    })

    window.addEventListener('keyup', closeWithKey);

    window.addEventListener('touchend', ( e: TouchEvent ) => {
      if(sliderMouseDown){
        sliderPos = sliderPos - (mouseStartX - e.touches[0].clientX);

        utils.set(sliderBar, { translateX: sliderPos - (mouseStartX - e.touches[0].clientX) });
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
        utils.set(sliderBar, { translateX: sliderPos - (mouseStartX - e.clientX) });
        settingsContainer.style.left = sliderPos - (mouseStartX - e.clientX) + 'px';
        settingsContainer.style.left = (sliderPos - (mouseStartX - e.clientX) - (width / 2 - buttons[0])) * sliderScale + 'px';
      }
    })

    window.addEventListener('mouseup', ( e: MouseEvent ) => {
      if(sliderMouseDown){
        sliderPos = sliderPos - (mouseStartX - e.clientX);

        utils.set(sliderBar, { translateX: sliderPos - (mouseStartX - e.clientX) });
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

      utils.set(sliderBar, { translateX: sliderPos  });
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

  return (
    <div class="settings">
      <div class="settings-close" onClick={() => {
        window.ViewManager.ChangeState(ViewState.PHOTO_LIST);
        animate('.settings',
          {
            opacity: 0,
            translateX: '500px',
            easing: 'easeInOutQuad',
            duration: 250,
            onComplete: () => {
              utils.set('.settings', { display: 'none' });
            }
          })
      }}>
        <div class="icon"><img draggable="false" src="/icon/x-solid.svg"></img></div>
      </div>
      <div class="settings-container" ref={( el ) => settingsContainer = el}>
        <div class="settings-block">
          <h1>Storage Settings</h1>
          <p>{ window.PhotoManager.PhotoCount() } Photos ({ bytesToFormatted(window.PhotoManager.PhotoSize(), 0) })</p>

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
                <div class="icon-small" style={{ margin: '0', display: 'inline-flex' }}>
                  <img draggable="false" width="10" height="10" src="/icon/check-solid.svg"></img>
                </div>
              </div>
            </label>
          </div>

          <Show when={window.OS === 'windows'}>
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
                  <div class="icon-small" style={{ margin: '0', display: 'inline-flex' }}>
                    <img draggable="false" width="10" height="10" src="/icon/check-solid.svg"></img>
                  </div>
                </div>
              </label>
            </div>
          </Show>

          <div class="selector">
            <input type="checkbox" id="transparent-check" ref={async ( el ) => {
              el.checked = await invoke('get_config_value_string', { key: 'transparent' }) === "true" ? true : false;
            }} onChange={( el ) => {
              if(el.target.checked){
                invoke('set_config_value_string', { key: 'transparent', value: 'true' });

                animate(document.body, { background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
                animate('.settings', { background: 'rgba(0, 0, 0, 0.5)', easing: 'linear', duration: 100 });
              } else{
                invoke('set_config_value_string', { key: 'transparent', value: 'false' });

                animate(document.body, { background: 'rgba(0, 0, 0, 1)', easing: 'linear', duration: 100 });
                animate('.settings', { background: 'rgba(0, 0, 0, 0)', easing: 'linear', duration: 100 });
              }
            }} />
            Window Transparency

            <label for="transparent-check">
              <div class="selection-box">
                <div class="icon-small" style={{ margin: '0', display: 'inline-flex' }}>
                  <img draggable="false" width="10" height="10" src="/icon/check-solid.svg"></img>
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
                window.location.reload();

                animate('.settings', {
                  opacity: 0,
                  translateX: '500px',
                  easing: 'easeInOutQuad',
                  duration: 250,
                  onComplete: () => {
                    utils.set('.settings', { display: 'none' });
                  }
                })

                window.location.reload();
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
          <p>WIP</p>
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
          <div class="slider-text" onMouseDown={() => lastClickedButton = 1}>Sync Settings</div>
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