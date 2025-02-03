import { PhotoListElement } from "./PhotoListElement";
import { Vars } from "./Vars";

export class PhotoListRow{
  public Elements: PhotoListElement[] = [];
  public Height: number = Vars.PHOTO_HEIGHT;
  public Width: number = 10;
}