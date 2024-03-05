import { createEffect, onMount } from "solid-js";
import { invoke } from '@tauri-apps/api/tauri';
import anime from 'animejs';

class PhotoViewerProps{
  currentPhotoView!: () => any;
  setCurrentPhotoView!: ( view: any ) => any;
  setPhotoNavChoice!: ( view: any ) => any;
  setConfirmationBox!: ( text: string, cb: () => void ) => void;
}

let PhotoViewer = ( props: PhotoViewerProps ) => {
  let viewer: HTMLElement;
  let imageViewer: HTMLElement;
  let isOpen = false;

  onMount(() => {
    createEffect(() => {
      let photo = props.currentPhotoView();

      imageViewer.style.opacity = '0';

      if(photo){
        imageViewer.style.background = 'url(\'https://photo.localhost/' + props.currentPhotoView().path.replace('\\', '/') +'\')';

        anime({
          targets: imageViewer,
          opacity: 1,
          delay: 50,
          duration: 150,
          easing: 'easeInOutQuad'
        })
      }

      if(photo && !isOpen){
        viewer.style.display = 'block';
  
        anime({
          targets: viewer,
          opacity: 1,
          easing: 'easeInOutQuad',
          duration: 150
        });
  
        anime({
          targets: '.navbar',
          top: '-50px'
        })

        anime.set('.prev-button', { left: '-50px', top: '50%' });
        anime.set('.next-button', { right: '-50px', top: '50%' });

        anime({ targets: '.prev-button', left: '0', easing: 'easeInOutQuad', duration: 100 });
        anime({ targets: '.next-button', right: '0', easing: 'easeInOutQuad', duration: 100 });

        window.CloseAllPopups.forEach(p => p());
      } else if(!photo && isOpen){
        anime({
          targets: viewer,
          opacity: 0,
          easing: 'easeInOutQuad',
          duration: 150,
          complete: () => {
            viewer.style.display = 'none';
          }
        });
  
        anime({
          targets: '.navbar',
          top: '0px'
        })
  
        window.CloseAllPopups.forEach(p => p());

        anime({ targets: '.prev-button', top: '75%', easing: 'easeInOutQuad', duration: 100 });
        anime({ targets: '.next-button', top: '75%', easing: 'easeInOutQuad', duration: 100 });
      }
  
      isOpen = photo != null;
    })
  })

  return (
    <div class="photo-viewer" ref={( el ) => viewer = el}>
      <div class="viewer-close viewer-button" onClick={() => props.setCurrentPhotoView(null)}><i class="fa-solid fa-x"></i></div>
      <div class="image-container" ref={( el ) => imageViewer = el}></div>

      <div class="prev-button" onClick={() => props.setPhotoNavChoice('prev')}><i class="fa-solid fa-arrow-left"></i></div>
      <div class="next-button" onClick={() => props.setPhotoNavChoice('next')}><i class="fa-solid fa-arrow-right"></i></div>

      <div class="control-buttons">
        <div class="viewer-button"
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
          onClick={() => {
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d')!;

            canvas.width = props.currentPhotoView().width;
            canvas.height = props.currentPhotoView().height;

            ctx.drawImage(props.currentPhotoView().imageEl, 0, 0);

            canvas.toBlob(( blob ) => {
              navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob!
                })
              ]);
        
              canvas.remove();

              anime.set('.copy-notif', { translateX: '-50%', translateY: '-100px' });
              anime({
                targets: '.copy-notif',
                opacity: 1,
                translateY: '0px'
              });

              setTimeout(() => {
                anime({
                  targets: '.copy-notif',
                  opacity: 0,
                  translateY: '-100px'
                });
              }, 2000);
            });
          }}
        >
          <i class="fa-solid fa-copy"></i>
        </div>
        <div class="viewer-button"
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
        >
          <i class="fa-solid fa-info"></i>
        </div>
        <div class="viewer-button"
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
        >
          <i class="fa-solid fa-users"></i>
        </div>
        <div class="viewer-button"
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
        >
          <i class="fa-solid fa-file"></i>
        </div>
        <div class="viewer-button"
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
          onClick={() => props.setConfirmationBox("Are you sure you want to delete this photo?", () => { invoke("delete_photo", { path: props.currentPhotoView().path }); })}
        >
          <i class="fa-solid fa-trash"></i>
        </div>
      </div>
    </div>
  )
}

export default PhotoViewer