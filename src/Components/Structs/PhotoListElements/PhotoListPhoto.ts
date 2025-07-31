<<<<<<< HEAD
import { Photo } from "../Photo";
import { PhotoListElement } from "../PhotoListElement";
import { PhotoListElementType } from "../PhotoListElementType";

export class PhotoListPhoto extends PhotoListElement{
  public Photo!: Photo;

  constructor( photo: Photo ){ 
    super(); 
    this.Type = PhotoListElementType.PHOTO;
    this.Photo = photo;
  }
=======
import { Photo } from "../Photo";
import { PhotoListElement } from "../PhotoListElement";
import { PhotoListElementType } from "../PhotoListElementType";

export class PhotoListPhoto extends PhotoListElement{
  public Photo!: Photo;

  constructor( photo: Photo ){ 
    super(); 
    this.Type = PhotoListElementType.PHOTO;
    this.Photo = photo;
  }
>>>>>>> e612756 (stuff)
}