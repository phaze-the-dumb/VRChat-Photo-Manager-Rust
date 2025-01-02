import { Accessor, createSignal, Setter } from "solid-js";
import { Photo } from "../Structs/Photo";

export class PhotoViewerManager{
  public CurrentPhoto: Accessor<Photo | null>;
  private _setCurrentPhoto: Setter<Photo | null>;

  private _currentPhotoIndex = 0;

  constructor(){
    [ this.CurrentPhoto, this._setCurrentPhoto ] = createSignal<Photo | null>(null);
  }

  public NextPhoto(){
    if(!window.PhotoManager.FilteredPhotos[this._currentPhotoIndex + 1])return;
    window.PhotoViewerManager.OpenPhoto(window.PhotoManager.FilteredPhotos[this._currentPhotoIndex + 1]);

    this._currentPhotoIndex++;
  }
  
  public PreviousPhoto(){
    if(!window.PhotoManager.FilteredPhotos[this._currentPhotoIndex - 1])return;
    window.PhotoViewerManager.OpenPhoto(window.PhotoManager.FilteredPhotos[this._currentPhotoIndex - 1]);

    this._currentPhotoIndex--;
  }

  public Close(){
    this._setCurrentPhoto(null);
  }

  public OpenPhoto( photo: Photo ){
    this._setCurrentPhoto(photo);
    this._currentPhotoIndex = window.PhotoManager.FilteredPhotos.indexOf(photo);
  }
}