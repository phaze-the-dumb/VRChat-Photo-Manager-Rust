import { listen } from "@tauri-apps/api/event";
import { Accessor, createSignal } from "solid-js";
import { Photo } from "../Structs/Photo";
import { invoke } from "@tauri-apps/api/core";
import { PhotoMetadata } from "../Structs/PhotoMetadata";
import { Vars } from "../Structs/Vars";
import { FilterType } from "../FilterMenu";
import { MergeSort } from "../Utils/Sort";

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
  
  private _lastLoaded: number = 0;
  private _onLoadedMeta: any = {};
  private _hasBeenIndexed: Accessor<boolean>;

  constructor(){
    let [ photoCount, setPhotoCount ] = createSignal(-1);
    let [ photoSize, setPhotoSize ] = createSignal(-1);

    this.PhotoCount = photoCount;
    this.PhotoSize = photoSize;

    let setHasBeenIndexed;
    [ this._hasBeenIndexed, setHasBeenIndexed ] = createSignal(false);

    listen('photos_loaded', ( event: any ) => {
      let photoPaths = event.payload.photos.reverse();
      console.log(photoPaths);

      setPhotoCount(photoPaths.length);
      setPhotoSize(event.payload.size);

      if(photoPaths.length <= Vars.MAX_PHOTOS_BULK_LOAD)
        setHasBeenIndexed(true);

      let photoLayers: Photo[] = [];

      photoPaths.forEach(( path: string, i: number ) => {
        let photo

        if(path.slice(0, 9) === "legacy://")
          photo = new Photo(path.slice(9), true, i);
        else
          photo = new Photo(path, false, i);

        if(!photo.legacy && photo.splitPath[4]){
          photoLayers.push(photo);
        } else
          this.Photos.push(photo);

        if(photoPaths.length <= Vars.MAX_PHOTOS_BULK_LOAD)
          photo.loadMeta();
      })

      photoLayers.forEach(photo => {
        let type = photo.splitPath[4];
        photo.splitPath.pop();

        let mainPhotoPath = photo.splitPath.join('_') + '.png';
        let mainPhoto = this.Photos.find(x => x.path === mainPhotoPath);

        if(!mainPhoto)
          this.Photos.push(photo);
        else{
          mainPhoto.isMultiLayer = true;

          switch(type){
            case 'Player.png':
              mainPhoto.playerLayer = photo;
              break;
            case 'Environment.png':
              mainPhoto.environmentLayer = photo;
              break;
          }
        }
      });

      this.Photos = MergeSort(this.Photos);
      console.log(this.Photos);

      console.log(this.Photos.length + ' Photos found.');
      if(this.Photos.length === 0 || photoPaths.length > Vars.MAX_PHOTOS_BULK_LOAD){
        console.log('No photos found or over bulk load limit, Skipping loading stage.');

        this.FilteredPhotos = this.Photos;
        this.HasFirstLoaded = true;

        this._finishedLoadingCallbacks.forEach(cb => cb());
      }
    });

    listen('photo_meta_loaded', ( event: any ) => {
      let data: PhotoMetadata = event.payload;

      let photo = this.Photos.find(x => x.path === data.path);
      if(!photo)return console.error('Cannot find photo.', data);

      this._lastLoaded = photo.index;

      if(this._onLoadedMeta[photo.index]){
        this._onLoadedMeta[photo.index]();
        delete this._onLoadedMeta[photo.index];
      }
  
      photo.width = data.width;
      photo.height = data.height;
  
      let scale = Vars.PHOTO_HEIGHT / photo.height;
  
      photo.scaledWidth = photo.width * scale;
      photo.scaledHeight = Vars.PHOTO_HEIGHT;
  
      photo.metadata = data.metadata.split('\u0000').filter(x => x !== '')[1];
      this._amountLoaded++;
  
      photo.metaLoaded = true;
      photo.onMetaLoaded();

      if(this._amountLoaded === this.Photos.length - 1 && !this.HasFirstLoaded){
        this.FilteredPhotos = this.Photos;
        this.HasFirstLoaded = true;
  
        this._finishedLoadingCallbacks.forEach(cb => cb());
      }
    })

    listen('photo_create', async ( event: any ) => {
      let photo = new Photo(event.payload, false, 0);

      if(photo.splitPath[4]){
        let type = photo.splitPath[4];
        photo.splitPath.pop();

        let mainPhotoPath = photo.splitPath.join('_') + '.png';
        let mainPhoto = this.Photos.find(x => x.path === mainPhotoPath);

        if(!mainPhoto){
          this.Photos.forEach(p => p.index++); // Probably a really dumb way of doing this
          this.Photos.splice(0, 0, photo);
        } else{
          mainPhoto.isMultiLayer = true;

          switch(type){
            case 'Player.png':
              mainPhoto.playerLayer = photo;
              break;
            case 'Environment.png':
              mainPhoto.environmentLayer = photo;
              break;
          }
        }
      } else{
        this.Photos.forEach(p => p.index++); // Probably a really dumb way of doing this
        this.Photos.splice(0, 0, photo);
      }

      photo.onMetaLoaded = () => this.ReloadFilters();
      photo.loadMeta();
    })

    listen('photo_remove', ( event: any ) => {
      this.Photos = this.Photos.filter(x => x.path !== event.payload);

      if(event.payload === window.PhotoViewerManager.CurrentPhoto()?.path)
        window.PhotoViewerManager.Close()

      this.ReloadFilters();
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

  public HasBeenIndexed(){
    return this._hasBeenIndexed();
  }

  public LoadPhotoMetaAndWait( photo: Photo ){
    return new Promise(res => {
      photo.loadMeta();
      this._onLoadedMeta[photo.index] = res;
    })
  }

  public async LoadSomeAndReloadFilters(){
    if(this.Photos.length < this._lastLoaded + 1)return;

    for (let i = 1; i < 10; i++) {
      if(!this.Photos[this._lastLoaded + 1])break;
      await this.LoadPhotoMetaAndWait(this.Photos[this._lastLoaded + 1]);
    }

    this.ReloadFilters();
  }

  public ReloadFilters(){
    this.FilteredPhotos = [];

    if(this._filter === ''){
      this.FilteredPhotos = this.Photos;
      window.PhotoListRenderingManager.ComputeLayout();

      return;
    }

    switch(this._filterType){
      case FilterType.USER:
        this.Photos.map(p => {
          if(p.metadata){
            try{
              let meta = JSON.parse(p.metadata);
              let photo = meta.players.find(( y: any ) =>
                y.displayName.toLowerCase().includes(this._filter) ||
                y.id === this._filter
              );

              if(photo)this.FilteredPhotos.push(p);
            } catch(e){}
          }
        })
        break;
      case FilterType.WORLD:
        this.Photos.map(p => {
          if(p.metadata){
            try{
              let meta = JSON.parse(p.metadata);
              let photo =
                meta.world.name.toLowerCase().includes(this._filter) ||
                meta.world.id === this._filter;

              if(photo)this.FilteredPhotos.push(p);
            } catch(e){}
          }
        })
        break;
    }

    window.PhotoListRenderingManager.ComputeLayout();
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