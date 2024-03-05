import { createEffect, onMount } from "solid-js";
import anime from 'animejs';

class PhotoViewerProps{
  currentPhotoView!: () => any;
  setCurrentPhotoView!: ( view: any ) => any;
  setPhotoNavChoice!: ( view: any ) => any;
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
    </div>
  )
}

export default PhotoViewer