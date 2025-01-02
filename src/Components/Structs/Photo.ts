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

  public onMetaLoaded: () => void = () => {};

  constructor( path: string, isLegacy: boolean = false ){
    this.path = path;
    this.legacy = isLegacy;

    if(this.legacy)
      this.dateString = this.path.split('_')[2];
    else
      this.dateString = this.path.split('_')[1];

    let splitDateString = this.dateString.split('-');

    this.date = new Date();

    this.date.setFullYear(parseInt(splitDateString[0]));
    this.date.setMonth(parseInt(splitDateString[1]));
    this.date.setDate(parseInt(splitDateString[2]));
  }

  loadMeta(){
    invoke('load_photo_meta', { photo: this.path });
  }

  loadImage(){
    if(this.loading || this.loaded || imagesLoading >= Vars.MAX_IMAGE_LOAD)return;

    this.loadMeta();
    if(!this.metaLoaded)return;

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