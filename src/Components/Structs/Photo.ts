import { invoke } from "@tauri-apps/api/core";
import { Vars } from "./Vars";

let imagesLoading = 0;

export class Photo{
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
  date: Date;

  legacy: boolean = false;
  index: number = 0;

  public onMetaLoaded: () => void = () => {};

  constructor( path: string, isLegacy: boolean = false, i: number ){
    this.path = path;
    this.legacy = isLegacy;
    this.index = i;

    let split = this.path.split('_');

    if(this.legacy)
      this.dateString = split[2];
    else
      this.dateString = split[1];

    let timeString;
    if(this.legacy)
      timeString = split[3];
    else
      timeString = split[2];

    let splitDateString = this.dateString.split('-');
    let splitTimeString = timeString.split('-');

    this.date = new Date();

    this.date.setFullYear(parseInt(splitDateString[0]));
    this.date.setMonth(parseInt(splitDateString[1]));
    this.date.setDate(parseInt(splitDateString[2]));

    this.date.setHours(parseInt(splitTimeString[0]));
    this.date.setMinutes(parseInt(splitTimeString[1]));
    this.date.setSeconds(parseInt(splitTimeString[2]));

    let resSplit;
    if(this.legacy)
      resSplit = split[0].split('x')
    else
      resSplit = split[3].split('x')

    let width = parseInt(resSplit[0]);
    let height = parseInt(resSplit[1]);

    if(!isNaN(width) || !isNaN(height)){
      this.width = width;
      this.height = height;
  
      let scale = Vars.PHOTO_HEIGHT / this.height;
  
      this.scaledWidth = this.width * scale;
      this.scaledHeight = Vars.PHOTO_HEIGHT;
    }
  }

  loadMeta(){
    invoke('load_photo_meta', { photo: this.path });
  }

  loadImage(){
    if(this.loading || this.loaded || imagesLoading >= Vars.MAX_IMAGE_LOAD)return;

    // this.loadMeta();
    if(!this.metaLoaded)return this.loadMeta();

    this.loading = true;

    imagesLoading++;

    this.image = document.createElement('canvas');

    this.imageEl = document.createElement('img');
    this.imageEl.crossOrigin = 'anonymous';

    this.imageEl.src = (window.OS === "windows" ? "http://photo.localhost/" : "photo://localhost/") + this.path + "?downscale";

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