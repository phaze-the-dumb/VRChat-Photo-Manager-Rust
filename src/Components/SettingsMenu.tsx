import { onMount } from "solid-js";
import anime from "animejs";

let SettingsMenu = () => {
  let sliderBar: HTMLElement;
  let settingsContainer: HTMLElement;
  let currentButton = 0;

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
        sliderPos = sliderPos + (width / 2 - buttons[currentButton] - sliderPos) * 0.2;
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

        anime.set(sliderBar, { translateX: sliderPos });
        sliderMouseDown = false;

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

        anime.set(sliderBar, { translateX: sliderPos });
        sliderMouseDown = false;

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
      }
    })

    window.addEventListener('resize', () => {
      width = window.innerWidth;
      sliderPos = width / 2 - buttons[currentButton];
      sliderScale = (buttons[1] - buttons[0]) / width;

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
          <h1>Program Settings</h1>
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
          <div class="slider-text" onClick={() => currentButton = 0}>Program Settings</div>
          <div class="slider-dot"></div>
          <div class="slider-dot"></div>
          <div class="slider-text" onClick={() => currentButton = 1}>Account Settings</div>
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