import { onCleanup, onMount } from "solid-js";
import { listen } from '@tauri-apps/api/event';
import { Window } from "@tauri-apps/api/window";

import anime from "animejs";
import FilterMenu from "./FilterMenu";
import { ViewState } from "./Managers/ViewManager";
import { invoke } from "@tauri-apps/api/core";

enum ListPopup{
  FILTERS,
  NONE
}

let PhotoList = () => {
  let photoTreeLoadingContainer: HTMLElement;

  let scrollToTop: HTMLElement;
  let scrollToTopActive = false;

  let photoContainer: HTMLCanvasElement;
  let photoContainerBG: HTMLCanvasElement;

  let filterContainer: HTMLDivElement;

  let ctx: CanvasRenderingContext2D;
  let ctxBG: CanvasRenderingContext2D;

  let scroll: number = 0;
  let targetScroll: number = 0;

  let quitRender: boolean = true;

  let currentPopup = ListPopup.NONE;

  Window.getCurrent().isVisible().then(visible => {
    quitRender = !visible;
  })


  window.ViewManager.OnStateTransition(ViewState.PHOTO_LIST, ViewState.SETTINGS, () => {
    anime({ targets: photoContainer, opacity: 0, easing: 'easeInOutQuad', duration: 100 });
  });

  window.ViewManager.OnStateTransition(ViewState.SETTINGS, ViewState.PHOTO_LIST, () => {
    anime({ targets: photoContainer, opacity: 1, easing: 'easeInOutQuad', duration: 100 });
  });


  window.ViewManager.OnStateTransition(ViewState.PHOTO_LIST, ViewState.PHOTO_VIEWER, () => {
    anime({ targets: photoContainer, opacity: 0, easing: 'easeInOutQuad', duration: 100 });
    anime({ targets: '.filter-options', opacity: 0, easing: 'easeInOutQuad', duration: 100 });
    anime({ targets: '.reload-photos', opacity: 0, easing: 'easeInOutQuad', duration: 100 });
  });

  window.ViewManager.OnStateTransition(ViewState.PHOTO_VIEWER, ViewState.PHOTO_LIST, () => {
    anime({ targets: photoContainer, opacity: 1, easing: 'easeInOutQuad', duration: 100 });
    anime({ targets: '.filter-options', opacity: 1, easing: 'easeInOutQuad', duration: 100 });
    anime({ targets: '.reload-photos', opacity: 1, easing: 'easeInOutQuad', duration: 100 });
  });


  let closeWithKey = ( e: KeyboardEvent ) => {
    if(e.key === 'Escape'){
      closeCurrentPopup();
    }
  }

  let onResize = () => {
    photoContainer.width = window.innerWidth;
    photoContainer.height = window.innerHeight;

    photoContainerBG.width = window.innerWidth;
    photoContainerBG.height = window.innerHeight;

    window.PhotoListRenderingManager.ComputeLayout();
  }

  let closeCurrentPopup = () => {
    switch(currentPopup){
      case ListPopup.FILTERS:
        anime({
          targets: filterContainer!,
          opacity: 0,
          easing: 'easeInOutQuad',
          duration: 100,
          complete: () => {
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
      anime({ targets: scrollToTop, opacity: 1, translateY: '0px', easing: 'easeInOutQuad', duration: 100 });

      scrollToTopActive = true;
    } else if(scrollToTopActive && scroll < photoContainer.height){
      anime({ targets: scrollToTop, opacity: 0, translateY: '-10px', complete: () => scrollToTop.style.display = 'none', easing: 'easeInOutQuad', duration: 100 });
      scrollToTopActive = false;
    }

    if(!ctx || !ctxBG)return;
    ctx.clearRect(0, 0, photoContainer.width, photoContainer.height);
    ctxBG.clearRect(0, 0, photoContainerBG.width, photoContainerBG.height);

    scroll = scroll + (targetScroll - scroll) * 0.2;

    window.PhotoListRenderingManager.Render(ctx, photoContainer!, scroll);

    if(window.PhotoManager.FilteredPhotos.length == 0){
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = '40px Rubik';

      ctx.fillText("It's looking empty in here! You have no photos :O", photoContainer.width / 2, photoContainer.height / 2);
    }

    ctxBG.drawImage(photoContainer, 0, 0);
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

    photoContainerBG.width = window.innerWidth;
    photoContainerBG.height = window.innerHeight;

    if(window.PhotoManager.HasFirstLoaded){
      requestAnimationFrame(render);
      window.PhotoManager.HasFirstLoaded = false;
    }
  })

  window.PhotoManager.OnLoadingFinished(() => {
    invoke('close_splashscreen');

    anime({
      targets: photoTreeLoadingContainer,
      height: 0,
      easing: 'easeInOutQuad',
      duration: 500,
      opacity: 0,
      complete: () => {
        photoTreeLoadingContainer.style.display = 'none';
      }
    })

    anime({
      targets: '.reload-photos',
      opacity: 1,
      duration: 150,
      easing: 'easeInOutQuad'
    })

    window.PhotoListRenderingManager.SetCanvas(photoContainer!);
    window.PhotoListRenderingManager.ComputeLayout();

    render();
  });

  onMount(() => {
    ctx = photoContainer.getContext('2d')!;
    ctxBG = photoContainerBG.getContext('2d')!;

    window.PhotoManager.Load();

    anime.set(scrollToTop, { opacity: 0, translateY: '-10px', display: 'none' });

    photoContainer.onwheel = ( e: WheelEvent ) => {
      targetScroll += e.deltaY;

      if(targetScroll < 0)
        targetScroll = 0;
    };

    window.addEventListener('keyup', closeWithKey);
    window.addEventListener('resize', onResize);

    photoContainer.width = window.innerWidth;
    photoContainer.height = window.innerHeight;

    photoContainerBG.width = window.innerWidth;
    photoContainerBG.height = window.innerHeight;

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
      <div ref={filterContainer!} class="filter-container" style={{
        height: window.PhotoManager.HasBeenIndexed() ? '83px' : '110px',
        width: window.PhotoManager.HasBeenIndexed() ? '600px' : '650px'
      }}>
        <FilterMenu />
      </div>

      <div class="photo-tree-loading" ref={( el ) => photoTreeLoadingContainer = el}>Scanning Photo Tree...</div>

      <div class="scroll-to-top" ref={( el ) => scrollToTop = el} onClick={() => targetScroll = 0}>
        <div class="icon">
          <img draggable="false" src="/icon/angle-up-solid.svg"></img>
        </div>
      </div>
      <div class="reload-photos" onClick={() => window.ConfirmationBoxManager.SetConfirmationBox("Are you sure you want to reload all photos? This can cause the application to slow down while it is loading...", () => window.location.reload())}>
        <div class="icon" style={{ width: '17px' }}>
          <img draggable="false" width="17" height="17" src="/icon/arrows-rotate-solid.svg"></img>
        </div>
      </div>

      <div class="filter-options">
        <div>
          <div onClick={() => {
            if(currentPopup != ListPopup.NONE)return closeCurrentPopup();
            currentPopup = ListPopup.FILTERS;

            filterContainer!.style.display = 'block';

            anime({
              targets: filterContainer!,
              opacity: 1,
              easing: 'easeInOutQuad',
              duration: 100
            });
          }} class="icon" style={{ width: '20px', height: '20px', padding: '20px' }}>
            <img draggable="false" style={{ width: "20px", height: "20px" }} src="/icon/sliders-solid.svg"></img>
          </div>
          <div class="icon-label">Filters</div>
        </div>
      </div>

      <canvas class="photo-container" ref={( el ) => photoContainer = el}></canvas>
      <canvas class="photo-container-bg" ref={( el ) => photoContainerBG = el}></canvas>
    </div>
  )
}

export default PhotoList;