import { onCleanup, onMount } from "solid-js";
import { listen } from '@tauri-apps/api/event';
import { Window } from "@tauri-apps/api/window";

import anime from "animejs";
import FilterMenu from "./FilterMenu";
import { Photo } from "./Structs/Photo";

let months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

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

  let closeWithKey = ( e: KeyboardEvent ) => {
    if(e.key === 'Escape'){
      closeCurrentPopup();
    }
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
    // TODO: Tidy this up, optimise it more 
    // I am really procrastinating rewriting this...
    
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

    let currentRow: Photo[] = [];
    let currentRowWidth = 0;
    let currentRowIndex = -1;

    scroll = scroll + (targetScroll - scroll) * 0.2;

    let lastPhoto;
    for (let i = 0; i < window.PhotoManager.FilteredPhotos.length; i++) {
      let p = window.PhotoManager.FilteredPhotos[i];

      if(currentRowIndex * 210 - scroll > photoContainer.height){
        p.shown = false;
        continue;
      }

      if(!lastPhoto || (lastPhoto.dateString !== p.dateString)){
        currentRowWidth -= 10;

        let rowXPos = 0;
        currentRow.forEach(photo => {
          if(60 + currentRowIndex * 210 - scroll < -200)return photo.shown = false;

          if(!photo.loaded)
            setTimeout(() => photo.loadImage(), 1);
          else{
            if(!photo.shown){
              photo.frames = 0;
              photo.shown = true;
            }

            ctx.globalAlpha = photo.frames / 100;
            ctx.drawImage(photo.image!, (rowXPos - currentRowWidth / 2) + photoContainer.width / 2, 60 + currentRowIndex * 210 - scroll, photo.scaledWidth!, 200);

            photo.x = (rowXPos - currentRowWidth / 2) + photoContainer.width / 2;
            photo.y = 60 + currentRowIndex * 210 - scroll;

            if(photo.frames < 100)
              photo.frames += 10;
          }

          rowXPos += photo.scaledWidth! + 10;
        })

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = '30px Rubik';

        let dateParts = p.dateString.split('-');
        ctx.fillText(dateParts[2] + ' ' + months[parseInt(dateParts[1]) - 1] + ' ' + dateParts[0], photoContainer.width / 2, 60 + (currentRowIndex + 1.2) * 210 - scroll);

        currentRowWidth = 0;
        currentRow = [];
        currentRowIndex += 1.4;
      }

      if(currentRowWidth + p.scaledWidth! + 10 < photoContainer.width - 100){
        currentRowWidth += p.scaledWidth! + 10;
        currentRow.push(p);
      } else{
        currentRowWidth -= 10;

        let rowXPos = 0;
        currentRow.forEach(photo => {
          if(60 + currentRowIndex * 210 - scroll < -200)return photo.shown = false;

          if(!photo.loaded)
            setTimeout(() => photo.loadImage(), 1);
          else{
            if(!photo.shown){
              photo.frames = 0;
              photo.shown = true;
            }

            ctx.globalAlpha = photo.frames / 100;
            ctx.drawImage(photo.image!, (rowXPos - currentRowWidth / 2) + photoContainer.width / 2, 60 + currentRowIndex * 210 - scroll, photo.scaledWidth!, 200);

            photo.x = (rowXPos - currentRowWidth / 2) + photoContainer.width / 2;
            photo.y = 60 + currentRowIndex * 210 - scroll;

            if(photo.frames < 100)
              photo.frames += 10;
          }

          rowXPos += photo.scaledWidth! + 10;
        })

        currentRowWidth = 0;
        currentRow = [];
        currentRowIndex++;

        currentRowWidth += p.scaledWidth! + 10;
        currentRow.push(p);
      }

      lastPhoto = p;
    }

    if(currentRow.length > 0){
      currentRowWidth -= 10;

      let rowXPos = 0;
      currentRow.forEach(photo => {
        if(60 + currentRowIndex * 210 - scroll < -200)return photo.shown = false;

        if(!photo.loaded)
          setTimeout(() => photo.loadImage(), 1);
        else{
          if(!photo.shown){
            photo.frames = 0;
            photo.shown = true;
          }

          ctx.globalAlpha = photo.frames / 100;
          ctx.drawImage(photo.image!, (rowXPos - currentRowWidth / 2) + photoContainer.width / 2, 60 + currentRowIndex * 210 - scroll, photo.scaledWidth!, 200);

          photo.x = (rowXPos - currentRowWidth / 2) + photoContainer.width / 2;
          photo.y = 60 + currentRowIndex * 210 - scroll;

          if(photo.frames < 100)
            photo.frames += 10;
        }

        rowXPos += photo.scaledWidth! + 10;
      })
    }

    if(window.PhotoManager.FilteredPhotos.length == 0){
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = '40px Rubik';

      ctx.fillText("It's looking empty in here! You have no photos :O", photoContainer.width / 2, photoContainer.height / 2);
    }

    ctxBG.filter = 'blur(100px)';
    ctxBG.drawImage(photoContainer, 0, 0);
  }

  listen('hide-window', () => {
    console.log('Hide Window');
    quitRender = true;
  })

  listen('show-window', () => {
    console.log('Shown Window');
    quitRender = false;

    if(window.PhotoManager.HasFirstLoaded)
      requestAnimationFrame(render);
  })

  window.PhotoManager.OnLoadingFinished(() => {
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

    render();
  });

  onMount(() => {
    ctx = photoContainer.getContext('2d')!;
    ctxBG = photoContainerBG.getContext('2d')!;

    window.PhotoManager.Load();

    anime.set(scrollToTop, { opacity: 0, translateY: '-10px', display: 'none' });

    photoContainer.addEventListener('wheel', ( e: WheelEvent ) => {
      targetScroll += e.deltaY;

      if(targetScroll < 0)
        targetScroll = 0;
    });

    window.addEventListener('keyup', closeWithKey);

    photoContainer.width = window.innerWidth;
    photoContainer.height = window.innerHeight;

    photoContainerBG.width = window.innerWidth;
    photoContainerBG.height = window.innerHeight;

    window.addEventListener('resize', () => {
      photoContainer.width = window.innerWidth;
      photoContainer.height = window.innerHeight;

      photoContainerBG.width = window.innerWidth;
      photoContainerBG.height = window.innerHeight;
    })

    photoContainer.addEventListener('click', ( e: MouseEvent ) => {
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
    })
  })

  onCleanup(() => {
    window.removeEventListener('keyup', closeWithKey);
  })

  return (
    <div class="photo-list">
      <div ref={filterContainer!} class="filter-container">
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
          }} class="icon" style={{ width: '20px', height: '5px', padding: '20px' }}>
            <img draggable="false" width="20" height="20" src="/icon/sliders-solid.svg"></img>
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