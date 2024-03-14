import { onMount } from "solid-js";
import { bytesToFormatted } from "../utils";
import { invoke } from '@tauri-apps/api/tauri';
import anime from "animejs";

class SettingsMenuProps{
  photoCount!: () => number;
  photoSize!: () => number;
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

  onMount(() => {
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

          <br />
          <p>VRChat Photo Path: <span class="path" ref={( el ) => invoke('get_user_photos_path').then(( path: any ) => el.innerHTML = path)}>Loading...</span></p>
          <p>
            Final Photo Path:
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
              <span class="path" style={{ color: 'green' }} onClick={() => {
                finalPathPreviousData = finalPathData;
                finalPathConfirm.style.display = 'none';
              }}><i class="fa-solid fa-check"></i></span>

              <span class="path" style={{ color: 'red' }} onClick={() => {
                finalPathData = finalPathPreviousData;
                finalPathInput.innerHTML = finalPathPreviousData;
                finalPathConfirm.style.display = 'none';
              }}><i class="fa-solid fa-xmark"></i></span>
            </span>
          </p>
        </div>
        <div class="settings-block">
          <h1>Account Settings</h1>
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