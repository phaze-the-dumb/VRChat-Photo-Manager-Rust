import { onMount } from "solid-js";
import { invoke } from '@tauri-apps/api/tauri';

const PHOTO_HEIGHT = 200;
const MAX_IMAGE_LOAD = 1;

let PhotoList = () => {
  let canvas: HTMLCanvasElement;
  let hasLoadedPhotoMeta = false;
  let hasLoadedPhotos = false;
  let amountLoaded = 0;
  let imagesLoading = 0;

  let loadingImage: HTMLImageElement = document.createElement('img');
  loadingImage.src = 'https://cdn.phazed.xyz/vrcpm/loader.png';

  class PhotoMetadata{
    width!: number;
    height!: number;
    metadata!: string;
  }

  class Photo{
    path: string;
    loaded: boolean = false;
    loading: boolean = false;
    image?: HTMLCanvasElement;
    width?: number;
    height?: number;
    loadingRotate: number = 0;
    metadata: any;

    x: number = 0;
    y: number = 0;
    shown: boolean = false;
    row: number = 0;

    scaledWidth?: number;
    scaledHeight?: number;
    loadFrames: number = 0;
    
    constructor( path: string ){
      this.path = path;

      invoke<PhotoMetadata>('load_photo_meta', { photo: this.path })
        .then(data => {
          this.width = data.width;
          this.height = data.height;

          let scale = PHOTO_HEIGHT / this.height;

          this.scaledWidth = this.width * scale;
          this.scaledHeight = PHOTO_HEIGHT;

          this.metadata = data.metadata.split('\u0000').filter(x => x !== '')[1];
          amountLoaded++;
        });
    }

    loadImage(){
      if(this.loading || this.loaded || imagesLoading >= MAX_IMAGE_LOAD)return;
      this.loading = true;

      imagesLoading++;

      let img = document.createElement('img');
      img.src = 'https://photo.localhost/' + this.path;

      img.onload = () => {
        this.image = document.createElement('canvas');

        this.image.width = this.scaledWidth!;
        this.image.height = this.scaledHeight!;

        this.image.getContext('2d')!.drawImage(img, 0, 0, this.scaledWidth!, this.scaledHeight!);

        this.loaded = true;
        this.loading = false;

        imagesLoading--;
      }
    }

    draw(x: number, y: number, ctx: CanvasRenderingContext2D){
      if(this.loaded){
        ctx.globalAlpha = this.loadFrames / 10;
        ctx.drawImage(this.image!, x, y);

        if(this.loadFrames < 10)
          this.loadFrames++;
      } else{
        ctx.save();
        ctx.translate(x + this.scaledWidth! / 2, y + this.scaledHeight! / 2);
        ctx.rotate(this.loadingRotate);
        ctx.drawImage(loadingImage, -32, -32, 64, 64);
        ctx.restore();

        this.loadingRotate += 0.05;
      }
    }
  }

  let photos: Photo[] = [];

  let loadPhotos = async () => {
    let photoPaths = (await invoke<string[]>('load_photos')).reverse();

    photoPaths.forEach(path => {
      let photo = new Photo(path);
      photos.push(photo);
    })

    hasLoadedPhotos = true;
  }

  onMount(() => {
    loadPhotos();
    let scroll = 0;
    let targetScroll = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    })

    canvas.addEventListener('wheel', ( e ) => {
      targetScroll += e.deltaY;

      if(targetScroll < 0)
        targetScroll = 0;
    })

    let ctx = canvas.getContext('2d')!;

    let f = new FontFace('Rubik', 'url(https://cdn.phazed.xyz/fonts/rubik/Rubik-VariableFont_wght.ttf)');

    f.load().then(font => {
      document.fonts.add(font);
      ctx.font = '20px Rubik';
    })

    let render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      scroll = scroll + ( targetScroll - scroll ) * 0.1;

      if(!hasLoadedPhotos){
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';

        ctx.fillText('Scanning Photo Tree...', canvas.width / 2, canvas.height / 2);
      } else if(!hasLoadedPhotoMeta){
        ctx.fillStyle = '#999';

        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 15, 300, 5);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';

        ctx.fillText('Loading Photo Metadata...', canvas.width / 2, canvas.height / 2);
        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 15, 300 * ( amountLoaded / photos.length ), 5);

        if(amountLoaded / photos.length == 1){
          hasLoadedPhotoMeta = true;
          scroll = 0;
        }
      } else{
        let currentRow = 0;
        let rowWidth = 10;
        let maxHeight = 0;

        let rowSizes: any = [];

        photos.forEach(photo => {
          if(rowWidth + photo.scaledWidth! + 10 > canvas.width - 20){
            rowSizes.push(rowWidth);

            currentRow++;
            rowWidth = 10;
          }

          photo.x = rowWidth;
          photo.y = (currentRow * (PHOTO_HEIGHT + 10)) + 60 - scroll;
          photo.row = currentRow;

          if(
            (currentRow * (PHOTO_HEIGHT + 10)) + 60 - scroll < canvas.height &&
            (currentRow * (PHOTO_HEIGHT + 10)) + PHOTO_HEIGHT + 120 - scroll > 0
          ){
            photo.shown = true;

            if(!photo.loaded && !photo.loading)
              photo.loadImage()
          } else if(photo.loadFrames !== 0){
            photo.loadFrames = 0;
            photo.shown = false;
          }

          rowWidth += photo.scaledWidth! + 10;
          maxHeight = photo.y;
        })

        photos.forEach(photo => {
          if(photo.shown)
            photo.draw(canvas.width / 2 + photo.x - rowSizes[photo.row] / 2, photo.y, ctx);
        })

        if(scroll > maxHeight)
          scroll = maxHeight;
      }

      requestAnimationFrame(render);
    }

    render();
  })

  return ( 
    <div class="photo-list">
      <canvas ref={( el ) => canvas = el}></canvas>
    </div>
  )
}

export default PhotoList;