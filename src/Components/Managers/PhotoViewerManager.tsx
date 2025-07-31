import { Accessor, createSignal, Setter } from "solid-js";
import { Photo } from "../Structs/Photo";
import { ViewState } from "./ViewManager";

export class PhotoViewerManager{
  public CurrentPhoto: Accessor<Photo | null>;
  private _setCurrentPhoto: Setter<Photo | null>;

  private _currentPhotoIndex = 0;

  constructor(){
    [ this.CurrentPhoto, this._setCurrentPhoto ] = createSignal<Photo | null>(null);
  }

  public NextPhoto(){
    if(!window.PhotoManager.FilteredPhotos[this._currentPhotoIndex + 1])return;
    this._currentPhotoIndex++;

    window.PhotoViewerManager.OpenPhoto(window.PhotoManager.FilteredPhotos[this._currentPhotoIndex]);
  }
  
  public PreviousPhoto(){
    if(!window.PhotoManager.FilteredPhotos[this._currentPhotoIndex - 1])return;
    this._currentPhotoIndex--;

    window.PhotoViewerManager.OpenPhoto(window.PhotoManager.FilteredPhotos[this._currentPhotoIndex]);
  }

  public Close(){
    window.ViewManager.ChangeState(ViewState.PHOTO_LIST);
    this._setCurrentPhoto(null);
  }

  public OpenPhoto( photo: Photo ){
    window.ViewManager.ChangeState(ViewState.PHOTO_VIEWER);

    this._setCurrentPhoto(photo);
    this._currentPhotoIndex = window.PhotoManager.FilteredPhotos.indexOf(photo);
  }
}