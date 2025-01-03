import { listen } from "@tauri-apps/api/event";
import { Accessor, createSignal } from "solid-js";
import { Photo } from "../Structs/Photo";
import { invoke } from "@tauri-apps/api/core";
import { PhotoMetadata } from "../Structs/PhotoMetadata";
import { Vars } from "../Structs/Vars";
import { FilterType } from "../FilterMenu";

export class PhotoManager{
  public PhotoCount: Accessor<number>;
  public PhotoSize: Accessor<number>;

  public Photos: Photo[] = [];
  public FilteredPhotos: Photo[] = [];

  public HasFirstLoaded = false;

  private _amountLoaded = 0;
  private _finishedLoadingCallbacks: (() => void)[] = [];

  private _filterType: FilterType = FilterType.USER;
  private _filter: string = "";

  constructor(){
    let [ photoCount, setPhotoCount ] = createSignal(-1);
    let [ photoSize, setPhotoSize ] = createSignal(-1);

    this.PhotoCount = photoCount;
    this.PhotoSize = photoSize;

    listen('photos_loaded', ( event: any ) => {
      let photoPaths = event.payload.photos.reverse();
      console.log(photoPaths);

      setPhotoCount(photoPaths.length);
      setPhotoSize(event.payload.size);

      let doesHaveLegacy = false;

      photoPaths.forEach(( path: string ) => {
        let photo

        if(path.slice(0, 9) === "legacy://"){
          photo = new Photo(path.slice(9), true);
          doesHaveLegacy = true;
        } else
          photo = new Photo(path, false);

        this.Photos.push(photo);
        photo.loadMeta();
      })

      if(doesHaveLegacy){
        this.Photos = this.Photos.sort(( a, b ) => b.date.valueOf() - a.date.valueOf());
      }

      console.log(this.Photos.length + ' Photos found.');
      if(this.Photos.length === 0){
        console.log('No photos found, Skipping loading stage.');

        this.FilteredPhotos = this.Photos;
        this.HasFirstLoaded = true;

        this._finishedLoadingCallbacks.forEach(cb => cb());
      }
    });

    listen('photo_meta_loaded', ( event: any ) => {
      let data: PhotoMetadata = event.payload;
  
      let photo = this.Photos.find(x => x.path === data.path);
      if(!photo)return;
  
      photo.width = data.width;
      photo.height = data.height;
  
      let scale = Vars.PHOTO_HEIGHT / photo.height;
  
      photo.scaledWidth = photo.width * scale;
      photo.scaledHeight = Vars.PHOTO_HEIGHT;
  
      photo.metadata = data.metadata.split('\u0000').filter(x => x !== '')[1];
      this._amountLoaded++;
  
      photo.metaLoaded = true;
      photo.onMetaLoaded();
  
      this.ReloadFilters();
  
      if(this._amountLoaded === this.Photos.length && !this.HasFirstLoaded){
        this.FilteredPhotos = this.Photos;
        this.HasFirstLoaded = true;
  
        this._finishedLoadingCallbacks.forEach(cb => cb());
      }
    })

    listen('photo_create', async ( event: any ) => {
      let photo = new Photo(event.payload);
  
      this.Photos.splice(0, 0, photo);
      photo.loadMeta();
  
      if(!window.SyncManager.IsSyncing() && window.AccountManager.Storage()?.isSyncing){
        window.SyncManager.TriggerSync();
      }
    })
  
    listen('photo_remove', ( event: any ) => {
      this.Photos = this.Photos.filter(x => x.path !== event.payload);
      this.FilteredPhotos = this.FilteredPhotos.filter(x => x.path !== event.payload);
  
      if(event.payload === window.PhotoViewerManager.CurrentPhoto()?.path)
        window.PhotoViewerManager.Close()
    })
  }

  public SetFilterType( type: FilterType ){
    this._filterType = type;
    this.ReloadFilters();
  }

  public SetFilter( filter: string ){
    this._filter = filter;
    this.ReloadFilters();
  }

  public ReloadFilters(){
    this.FilteredPhotos = [];

    switch(this._filterType){
      case FilterType.USER:
        this.Photos.map(p => {
          if(p.metadata){
            let meta = JSON.parse(p.metadata);
            let photo = meta.players.find(( y: any ) => y.displayName.toLowerCase().includes(this._filter) || y.id === this._filter);
    
            if(photo)this.FilteredPhotos.push(p);
          }
        })
        break;
      case FilterType.WORLD:
        this.Photos.map(p => {
          if(p.metadata){
            let meta = JSON.parse(p.metadata);
            let photo = meta.world.name.toLowerCase().includes(this._filter) || meta.world.id === this._filter;
    
            if(photo)this.FilteredPhotos.push(p);
          }
        })
        break;
    }
  }

  public Load(){
    this.Photos = [];
    this.FilteredPhotos = [];

    this._amountLoaded = 0;

    invoke('load_photos');
  }

  public OnLoadingFinished( cb: () => void ){
    this._finishedLoadingCallbacks.push(cb);
  }
}