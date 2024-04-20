import { createEffect, onMount } from "solid-js";
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

import anime from "animejs";

const PHOTO_HEIGHT = 200;
const MAX_IMAGE_LOAD = 3;

let months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

class PhotoListProps{
  setCurrentPhotoView!: ( view: any ) => any;
  setPhotoCount!: ( value: any ) => any;
  setPhotoSize!: ( value: any ) => any;
  currentPhotoView!: () => any;
  photoNavChoice!: () => string;
  setPhotoNavChoice!: ( view: any ) => any;
  setConfirmationBox!: ( text: string, cb: () => void ) => void;
  requestPhotoReload!: () => boolean;
  setRequestPhotoReload!: ( val: boolean ) => boolean;
  storageInfo!: () => { storage: number, used: number, sync: boolean };
  loggedIn!: () => { loggedIn: boolean, username: string, avatar: string, id: string, serverVersion: string };
  isPhotosSyncing!: () => boolean;
  setIsPhotosSyncing!: ( syncing: boolean ) => boolean;
}

let PhotoList = ( props: PhotoListProps ) => {
  let amountLoaded = 0;
  let imagesLoading = 0;

  let photoTreeLoadingContainer: HTMLElement;
  let photoMetaDataLoadingContainer: HTMLElement;
  let photoMetaDataLoadingBar: HTMLElement;

  let scrollToTop: HTMLElement;
  let scrollToTopActive = false;

  let photoContainer: HTMLCanvasElement;
  let photoContainerBG: HTMLCanvasElement;

  let ctx: CanvasRenderingContext2D;
  let ctxBG: CanvasRenderingContext2D;

  let photos: Photo[] = [];
  let currentPhotoIndex: number = -1;

  let scroll: number = 0;
  let targetScroll: number = 0;

  let quitRender: boolean = false;
  let photoPath: string;

  let finishedFirstLoad = false;

  createEffect(() => {
    if(props.requestPhotoReload()){
      props.setRequestPhotoReload(false);
      reloadPhotos();
    }
  })

  class PhotoMetadata{
    width!: number;
    height!: number;
    metadata!: string;
    path!: string;
  }

  class Photo{
    path: string;
    loaded: boolean = false;
    loading: boolean = false;
    metaLoaded: boolean = false;
    image?: HTMLCanvasElement;
    imageEl?: HTMLImageElement;
    width?: number;
    height?: number;
    loadingRotate: number = 0;
    metadata: any;

    frames: number = 0;
    shown: boolean = false;

    x: number = 0;
    y: number = 0;
    scaledWidth?: number;
    scaledHeight?: number;

    dateString: string;

    constructor( path: string ){
      this.path = path;
      this.dateString = this.path.split('_')[1];

      invoke('load_photo_meta', { photo: this.path });
    }

    loadImage(){
      if(this.loading || this.loaded || !this.metaLoaded || imagesLoading >= MAX_IMAGE_LOAD)return;
      this.loading = true;

      imagesLoading++;

      this.image = document.createElement('canvas');

      this.imageEl = document.createElement('img');
      this.imageEl.crossOrigin = 'anonymous';
      this.imageEl.src = 'https://photo.localhost/' + photoPath + this.path;

      this.imageEl.onload = () => {
        this.image!.width = this.scaledWidth!;
        this.image!.height = this.scaledHeight!;

        this.image!.getContext('2d')!.drawImage(this.imageEl!, 0, 0, this.scaledWidth!, this.scaledHeight!);

        this.loaded = true;
        this.loading = false;

        imagesLoading--;
      }
    }
  }

  createEffect(() => {
    let action = props.photoNavChoice();

    switch(action){
      case 'prev':
        if(!photos[currentPhotoIndex - 1])break;
        props.setCurrentPhotoView(photos[currentPhotoIndex - 1]);

        currentPhotoIndex--;
        break;
      case 'next':
        if(!photos[currentPhotoIndex + 1])break;
        props.setCurrentPhotoView(photos[currentPhotoIndex + 1]);

        currentPhotoIndex++;
        break;
    }

    props.setPhotoNavChoice('');
  })

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

    let currentRow: Photo[] = [];
    let currentRowWidth = 0;
    let currentRowIndex = -1;

    scroll = scroll + (targetScroll - scroll) * 0.2;

    let lastPhoto;
    for (let i = 0; i < photos.length; i++) {
      let p = photos[i];

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

      if(currentRowWidth + p.scaledWidth! + 10 < photoContainer.width - 20){
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

    if(photos.length == 0){
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = '50px Rubik';

      ctx.fillText("You have no bitches", photoContainer.width / 2, photoContainer.height / 2);
    }

    ctxBG.filter = 'blur(100px)';
    ctxBG.drawImage(photoContainer, 0, 0);
  }

  listen('photo_meta_loaded', ( event: any ) => {
    let data: PhotoMetadata = event.payload;

    let photo = photos.find(x => x.path === data.path);
    if(!photo)return;

    photo.width = data.width;
    photo.height = data.height;

    let scale = PHOTO_HEIGHT / photo.height;

    photo.scaledWidth = photo.width * scale;
    photo.scaledHeight = PHOTO_HEIGHT;

    photo.metadata = data.metadata.split('\u0000').filter(x => x !== '')[1];
    amountLoaded++;

    photoMetaDataLoadingBar.style.width = (amountLoaded / photos.length) * 100 + '%';
    photo.metaLoaded = true;

    if(amountLoaded / photos.length === 1 && !finishedFirstLoad){
      finishedFirstLoad = true;
      render();

      anime({
        targets: photoMetaDataLoadingContainer,
        height: 0,
        easing: 'easeInOutQuad',
        duration: 500,
        opacity: 0,
        complete: () => {
          photoMetaDataLoadingContainer.style.display = 'none';
        }
      })

      anime({
        targets: '.reload-photos',
        opacity: 1,
        duration: 150,
        easing: 'easeInOutQuad'
      })
    }
  })

  listen('photo_create', ( event: any ) => {
    let photo = new Photo(event.payload);
    photos.splice(0, 0, photo);

    if(!props.isPhotosSyncing() && props.storageInfo().sync){
      props.setIsPhotosSyncing(true);
      invoke('sync_photos', { token: localStorage.getItem('token') });
    }
  })

  listen('photo_remove', ( event: any ) => {
    photos = photos.filter(x => x.path !== event.payload);

    if(event.payload === props.currentPhotoView().path){
      currentPhotoIndex = -1;
      props.setCurrentPhotoView(null);
    }
  })

  let reloadPhotos = async () => {
    photoPath = await invoke('get_user_photos_path') + '/';

    photoTreeLoadingContainer.style.opacity = '1';
    photoTreeLoadingContainer.style.height = '100%';
    photoTreeLoadingContainer.style.display = 'flex';

    photoMetaDataLoadingContainer.style.opacity = '1';
    photoMetaDataLoadingContainer.style.height = '100%';
    photoMetaDataLoadingContainer.style.display = 'flex';

    photoMetaDataLoadingBar.style.width = '0%';
    quitRender = true;

    amountLoaded = 0;
    scroll = 0;
    photos = [];

    anime({
      targets: '.reload-photos',
      opacity: 0,
      duration: 150,
      easing: 'easeInOutQuad'
    })

    invoke('load_photos');
  }

  let loadPhotos = async () => {
    photoPath = await invoke('get_user_photos_path') + '/';
    invoke('load_photos')

    listen('photos_loaded', ( event: any ) => {
      let photoPaths = event.payload.photos.reverse();

      props.setPhotoCount(photoPaths.length);
      props.setPhotoSize(event.payload.size);

      photoPaths.forEach(( path: string ) => {
        let photo = new Photo(path);
        photos.push(photo);
      })

      if(photoPaths.length == 0){
        anime.set(photoMetaDataLoadingContainer, { height: 0, opacity: 0, display: 'none' });
        render();

        anime({
          targets: '.reload-photos',
          opacity: 1,
          duration: 150,
          easing: 'easeInOutQuad'
        })
      }

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
    })
  }

  onMount(() => {
    ctx = photoContainer.getContext('2d')!;
    ctxBG = photoContainerBG.getContext('2d')!;
    loadPhotos();


    anime.set(scrollToTop, { opacity: 0, translateY: '-10px', display: 'none' });

    photoContainer.addEventListener('wheel', ( e: WheelEvent ) => {
      targetScroll += e.deltaY;

      if(targetScroll < 0)
        targetScroll = 0;
    });

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
      let photo = photos.find(x =>
        e.clientX > x.x &&
        e.clientY > x.y &&
        e.clientX < x.x + x.scaledWidth! &&
        e.clientY < x.y + x.scaledHeight! &&
        x.shown
      );

      if(photo){
        props.setCurrentPhotoView(photo);
        currentPhotoIndex = photos.indexOf(photo);
      } else
        currentPhotoIndex = -1;
    })
  })

  return ( 
    <div class="photo-list">
      <div class="photo-tree-loading" ref={( el ) => photoTreeLoadingContainer = el}>Scanning Photo Tree...</div>
      <div class="photo-tree-loading" ref={( el ) => photoMetaDataLoadingContainer = el}>
        <div>
          Loading MetaData...
          <div class="loading-bar"><div class="loading-bar-inner" ref={( el ) => photoMetaDataLoadingBar = el}></div></div>
        </div>
      </div>

      <div class="scroll-to-top" ref={( el ) => scrollToTop = el} onClick={() => targetScroll = 0}><i class="fa-solid fa-angle-up"></i></div>
      <div class="reload-photos" onClick={() => props.setConfirmationBox("Are you sure you want to reload all photos? This can cause the application to slow down while it is loading...", reloadPhotos)}><i class="fa-solid fa-arrows-rotate"></i></div>

      <canvas class="photo-container" ref={( el ) => photoContainer = el}></canvas>
      <canvas class="photo-container-bg" ref={( el ) => photoContainerBG = el}></canvas>
    </div>
  )
}

export default PhotoList;