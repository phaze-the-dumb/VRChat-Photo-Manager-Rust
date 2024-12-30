import { Accessor, createSignal, Setter } from "solid-js";
import { Photo } from "../Structs/Photo";

export class PhotoViewerManager{
  private _currentPhoto: Accessor<Photo | null>;

  private _setCurrentPhoto: Setter<Photo | null>;

  constructor(){
    [ this._currentPhoto, this._setCurrentPhoto ] = createSignal<Photo | null>(null);
  }

  public Close(){
    this._setCurrentPhoto(null);
  }

  public OpenPhoto( photo: Photo ){
    this._setCurrentPhoto(photo);
  }
}