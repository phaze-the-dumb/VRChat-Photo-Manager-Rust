import { PhotoListElement } from "../PhotoListElement";
import { PhotoListElementType } from "../PhotoListElementType";

export class PhotoListText extends PhotoListElement{
  public Text!: string;

  constructor( text: string ){ 
    super(); 
    this.Type = PhotoListElementType.TEXT;
    this.Text = text;
  }
}