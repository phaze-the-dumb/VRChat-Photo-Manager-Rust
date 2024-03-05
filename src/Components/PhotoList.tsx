import { createEffect, onMount } from "solid-js";
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event'

import anime from "animejs";

const PHOTO_HEIGHT = 200;
const MAX_IMAGE_LOAD = 1;

let months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

class PhotoListProps{
  setCurrentPhotoView!: ( view: any ) => any;
  photoNavChoice!: () => string;
  setPhotoNavChoice!: ( view: any ) => any;
}

let PhotoList = ( props: PhotoListProps ) => {
  let amountLoaded = 0;
  let imagesLoading = 0;

  let photoTreeLoadingContainer: HTMLElement;
  let photoMetaDataLoadingContainer: HTMLElement;
  let photoMetaDataLoadingBar: HTMLElement;

  let photoContainer: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  let photos: Photo[] = [];
  let currentPhotoIndex: number = -1;

  let scroll: number = 0;
  let targetScroll: number = 0;

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
      if(this.loading || this.loaded || imagesLoading >= MAX_IMAGE_LOAD)return;
      this.loading = true;

      imagesLoading++;

      this.image = document.createElement('canvas');

      this.imageEl = document.createElement('img');
      this.imageEl.src = 'https://photo.localhost/' + this.path;

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
    requestAnimationFrame(render);

    if(!ctx)return;
    ctx.clearRect(0, 0, photoContainer.width, photoContainer.height);

    let currentRow: Photo[] = [];
    let currentRowWidth = 0;
    let currentRowIndex = -1;

    scroll = scroll + (targetScroll - scroll) * 0.2;

    let lastPhoto;
    for (let i = 0; i < photos.length; i++) {
      let p = photos[i];

      if(currentRowIndex * 210 - scroll > photoContainer.height){
        p.shown = false;
        break;
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

    if(amountLoaded / photos.length === 1){
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
    }
  })

  let loadPhotos = async () => {
    invoke('load_photos')

    listen('photos_loaded', ( event: any ) => {
      let photoPaths = event.payload.reverse();

      photoPaths.forEach(( path: string ) => {
        let photo = new Photo(path);
        photos.push(photo);
      })

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
    loadPhotos();

    photoContainer.addEventListener('wheel', ( e: WheelEvent ) => {
      targetScroll += e.deltaY;

      if(targetScroll < 0)
        targetScroll = 0;
    })

    photoContainer.width = window.innerWidth;
    photoContainer.height = window.innerHeight;

    window.addEventListener('resize', () => {
      photoContainer.width = window.innerWidth;
      photoContainer.height = window.innerHeight;
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

      <canvas class="photo-container" ref={( el ) => photoContainer = el}></canvas>
    </div>
  )
}

export default PhotoList;