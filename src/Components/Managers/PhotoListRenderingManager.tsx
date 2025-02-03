import { PhotoListPhoto } from "../Structs/PhotoListElements/PhotoListPhoto";
import { PhotoListText } from "../Structs/PhotoListElements/PhotoListText";
import { PhotoListElementType } from "../Structs/PhotoListElementType";
import { PhotoListRow } from "../Structs/PhotoListRow";

const MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

export class PhotoListRenderingManager{
  private _layout: PhotoListRow[] = [];
  private _canvas!: HTMLCanvasElement;

  constructor(){}

  public SetCanvas( canvas: HTMLCanvasElement ){
    this._canvas = canvas;
  }

  public ComputeLayout(){
    this._layout = [];

    let lastDateString = null;
    let row = new PhotoListRow();
    row.Height = 100;

    for (let i = 0; i < window.PhotoManager.FilteredPhotos.length; i++) {
      let photo = window.PhotoManager.FilteredPhotos[i];

      // If date string has changed since the last photo, we should label the correct date above it
      if(lastDateString !== photo.dateString){
        this._layout.push(row);
        row = new PhotoListRow();

        row.Height = 50;

        let dateParts = photo.dateString.split('-');
        lastDateString = photo.dateString;

        row.Elements = [ new PhotoListText(dateParts[2] + ' ' + MONTHS[parseInt(dateParts[1]) - 1] + ' ' + dateParts[0]) ];

        this._layout.push(row);
        row = new PhotoListRow();
      }

      // Check if the current row width plus another photo is too big to fit, push this row to the
      // layout and add the photo to the next row instead
      if(row.Width + photo.scaledWidth! + 10 > this._canvas.width - 100){
        this._layout.push(row);
        row = new PhotoListRow();
      }

      // We should now add this photo to the current row
      row.Elements.push(new PhotoListPhoto(photo));
      row.Width += photo.scaledWidth! + 10;
    }

    this._layout.push(row);
  }

  public Render( ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scroll: number ){
    let currentY = 0;
    
    // Loop through each row
    for (let i = 0; i < this._layout.length; i++) {
      let row = this._layout[i];

      // Cull rows that are out of frame
      if(currentY - scroll > canvas.height){
        // Reset frames for out of frame rows so they fade back in
        row.Elements.forEach(el => {
          if(el.Type === PhotoListElementType.PHOTO){
            (el as PhotoListPhoto).Photo.frames = 0;
            (el as PhotoListPhoto).Photo.shown = false;
          }
        });

        return;
      }

      if(currentY - scroll < -row.Height){
        // Reset frames for out of frame rows so they fade back in
        row.Elements.forEach(el => {
          if(el.Type === PhotoListElementType.PHOTO){
            (el as PhotoListPhoto).Photo.frames = 0;
            (el as PhotoListPhoto).Photo.shown = false;
          }
        });

        currentY += row.Height + 10;
        continue;
      }
      
      // === DEBUG ===
      // ctx.strokeStyle = '#f00';
      // ctx.strokeRect((canvas.width / 2) - row.Width / 2, currentY - 5 - scroll, row.Width, row.Height + 10);

      // Loop through all elements in the row
      let rowXPos = 10;
      for (let j = 0; j < row.Elements.length; j++) {
        let el = row.Elements[j];

        switch(el.Type){
          case PhotoListElementType.TEXT:
            // If it is a text element we should centre the text in the middle of the canvas
            // and then render that text

            // === DEBUG ===
            // ctx.strokeStyle = '#f00';
            // ctx.strokeRect(0, currentY - scroll, canvas.width, row.Height);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.font = '30px Rubik';

            ctx.fillText((el as PhotoListText).Text, canvas.width / 2, currentY - scroll + 25);
            break;
          case PhotoListElementType.PHOTO:
            let photo = (el as PhotoListPhoto).Photo;

            // === DEBUG ===
            // ctx.strokeStyle = '#f00';
            // ctx.strokeRect((rowXPos - row.Width / 2) + canvas.width / 2, currentY - scroll, photo.scaledWidth!, row.Height);

            if(!photo.loaded)
              // If the photo is not loaded, start a new task and load it in that task
              setTimeout(() => photo.loadImage(), 1);
            else{
              photo.shown = true;

              photo.x = (rowXPos  - row.Width / 2) + canvas.width / 2;
              photo.y = currentY - scroll;

              // Photo is already loaded so we should draw it on the application
              ctx.globalAlpha = photo.frames / 100;
              ctx.drawImage(photo.image!, (rowXPos  - row.Width / 2) + canvas.width / 2, currentY - scroll, photo.scaledWidth!, photo.scaledHeight!);

              if(photo.frames < 100)
                photo.frames += 10;
            }
            
            rowXPos += photo.scaledWidth! + 10;
            break;
        }
      }
      
      currentY += row.Height + 10;
    }
  }
}