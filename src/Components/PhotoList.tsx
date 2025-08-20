import { onCleanup, onMount } from "solid-js";
import { listen } from '@tauri-apps/api/event';
import { Window } from "@tauri-apps/api/window";

import FilterMenu from "./FilterMenu";
import { ViewState } from "./Managers/ViewManager";
import { invoke } from "@tauri-apps/api/core";
import { animate, utils } from "animejs";

enum ListPopup{
  FILTERS,
  NONE
}

let PhotoList = () => {
  let scrollToTop: HTMLElement;
  let scrollToTopActive = false;

  let photoContainer: HTMLCanvasElement;

  let filterContainer: HTMLDivElement;

  let ctx: CanvasRenderingContext2D;

  let scroll: number = 0;
  let targetScroll: number = 0;

  let quitRender: boolean = true;

  let currentPopup = ListPopup.NONE;

  Window.getCurrent().isVisible().then(visible => {
    quitRender = !visible;
  })


  window.ViewManager.OnStateTransition(ViewState.PHOTO_LIST, ViewState.SETTINGS, () => {
    animate(photoContainer, { opacity: 0.5, filter: 'blur(10px)', easing: 'easeInOutQuad', duration: 100 });
    animate('.filter-options', { opacity: 0, easing: 'easeInOutQuad', duration: 100 });
    animate('.scroll-to-top', { opacity: 0, easing: 'easeInOutQuad', duration: 100 });
  });

  window.ViewManager.OnStateTransition(ViewState.SETTINGS, ViewState.PHOTO_LIST, () => {
    animate(photoContainer, { opacity: 1, filter: 'blur(0px)', easing: 'easeInOutQuad', duration: 100, onComplete: () => photoContainer.style.filter = '' });
    animate('.filter-options', { opacity: 1, easing: 'easeInOutQuad', duration: 100 });
    animate('.scroll-to-top', { opacity: 1, easing: 'easeInOutQuad', duration: 100 });
  });


  window.ViewManager.OnStateTransition(ViewState.PHOTO_LIST, ViewState.PHOTO_VIEWER, () => {
    animate(photoContainer, { opacity: 0.5, filter: 'blur(10px)', easing: 'easeInOutQuad', duration: 100 });
    animate('.filter-options', { opacity: 0, easing: 'easeInOutQuad', duration: 100 });
    animate('.scroll-to-top', { opacity: 0, easing: 'easeInOutQuad', duration: 100 });
  });

  window.ViewManager.OnStateTransition(ViewState.PHOTO_VIEWER, ViewState.PHOTO_LIST, () => {
    animate(photoContainer, { opacity: 1, filter: 'blur(0px)', easing: 'easeInOutQuad', duration: 100, onComplete: () => photoContainer.style.filter = '' });
    animate('.filter-options', { opacity: 1, easing: 'easeInOutQuad', duration: 100 });
    animate('.scroll-to-top', { opacity: 1, easing: 'easeInOutQuad', duration: 100 });
  });


  let closeWithKey = ( e: KeyboardEvent ) => {
    if(e.key === 'Escape'){
      closeCurrentPopup();
    }
  }

  let onResize = () => {
    photoContainer.width = window.innerWidth;
    photoContainer.height = window.innerHeight;

    window.PhotoListRenderingManager.ComputeLayout();
  }

  let closeCurrentPopup = () => {
    switch(currentPopup){
      case ListPopup.FILTERS:
        animate(filterContainer!, {
          opacity: 0,
          translateY: '10px',
          easing: 'easeInOutQuad',
          duration: 100,
          onComplete: () => {
            filterContainer!.style.display = 'none';
            currentPopup = ListPopup.NONE;
          }
        });

        break;
    }
  }

  let render = () => {
    if(!quitRender)
      requestAnimationFrame(render);
    else
      return quitRender = false;

    if(!scrollToTopActive && scroll > photoContainer.height){
      scrollToTop.style.display = 'flex';
      animate(scrollToTop, { opacity: 1, translateY: '0px', easing: 'easeInOutQuad', duration: 100 });

      scrollToTopActive = true;
    } else if(scrollToTopActive && scroll < photoContainer.height){
      animate(scrollToTop, { opacity: 0, translateY: '-10px', onComplete: () => scrollToTop.style.display = 'none', easing: 'easeInOutQuad', duration: 100 });

      scrollToTopActive = false;
    }

    if(!ctx)return;
    ctx.clearRect(0, 0, photoContainer.width, photoContainer.height);

    scroll = scroll + (targetScroll - scroll) * 0.1;

    window.PhotoListRenderingManager.Render(ctx, photoContainer!, scroll);

    if(window.PhotoManager.FilteredPhotos.length == 0){
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = '40px Rubik';

      ctx.fillText("It's looking empty in here! You have no photos :O", photoContainer.width / 2, photoContainer.height / 2);
    }
  }

  listen('hide-window', () => {
    quitRender = true;
    console.log('Hide Window');
  })

  listen('show-window', () => {
    if(quitRender)quitRender = false;
    console.log('Shown Window');

    photoContainer.width = window.innerWidth;
    photoContainer.height = window.innerHeight;

    if(window.PhotoManager.HasFirstLoaded){
      requestAnimationFrame(render);
      window.PhotoManager.HasFirstLoaded = false;
    }
  })

  window.PhotoManager.OnLoadingFinished(() => {
    invoke('close_splashscreen');

    animate('.reload-photos', {
      opacity: 1,
      duration: 150,
      easing: 'easeInOutQuad'
    })

    window.PhotoListRenderingManager.SetCanvas(photoContainer!);
    render();
  });

  onMount(() => {
    ctx = photoContainer.getContext('2d')!;

    window.PhotoManager.Load();

    utils.set(scrollToTop, { opacity: 0, translateY: '-10px', display: 'none' });

    photoContainer.onwheel = ( e: WheelEvent ) => {
      targetScroll += e.deltaY * 2;

      if(targetScroll < 0)
        targetScroll = 0;
    };

    window.addEventListener('keyup', closeWithKey);
    window.addEventListener('resize', onResize);

    photoContainer.width = window.innerWidth;
    photoContainer.height = window.innerHeight;

    photoContainer.onclick = ( e: MouseEvent ) => {
      let photo = window.PhotoManager.FilteredPhotos.find(x =>
        e.clientX > x.x &&
        e.clientY > x.y &&
        e.clientX < x.x + x.scaledWidth! &&
        e.clientY < x.y + x.scaledHeight! &&
        x.shown
      );

      if(photo)
        window.PhotoViewerManager.OpenPhoto(photo);
      // else
      //   currentPhotoIndex = -1;
    }
  })

  onCleanup(() => {
    photoContainer.onwheel = () => {};
    photoContainer.onclick = () => {};

    window.removeEventListener('keyup', closeWithKey);
    window.removeEventListener('resize', onResize);
  })

  return (
    <div class="photo-list">
      <div ref={filterContainer!} class="filter-container">
        <FilterMenu />
      </div>

      <div class="scroll-to-top" ref={( el ) => scrollToTop = el} onClick={() => targetScroll = 0}>
        <div class="icon">
          <img draggable="false" src="/icon/angle-up-solid.svg"></img>
        </div>
      </div>

      <div class="filter-options">
        <div>
          <div onClick={() => {
            if(currentPopup != ListPopup.NONE)return closeCurrentPopup();
            currentPopup = ListPopup.FILTERS;

            filterContainer!.style.display = 'block';

            animate(filterContainer!, {
              opacity: 1,
              translateY: 0,
              easing: 'easeInOutQuad',
              duration: 100
            });
          }} class="icon">
            <img draggable="false" style={{ width: "20px", height: "20px" }} src="/icon/sliders-solid.svg"></img>
          </div>
          <div class="icon-label">Filters</div>
        </div>

        <div>
          <div onClick={() => {
            window.location.reload();
          }} class="icon">
            <img draggable="false" style={{ width: "20px", height: "20px" }} src="/icon/arrows-rotate-solid.svg"></img>
          </div>
          <div class="icon-label">Reload Photos</div>
        </div>

        <div>
          <div onClick={() => {
            utils.set('.settings', { display: 'block' });
            animate('.settings', {
              opacity: 1,
              translateX: '0px',
              easing: 'easeInOutQuad',
              duration: 250
            })

            window.ViewManager.ChangeState(ViewState.SETTINGS);
          }} class="icon">
            <img draggable="false" style={{ width: "20px", height: "20px" }} src="/icon/gear-solid-full.svg"></img>
          </div>
          <div class="icon-label">Settings</div>
        </div>
      </div>

      <canvas class="photo-container" ref={( el ) => photoContainer = el}></canvas>
    </div>
  )
}

export default PhotoList;