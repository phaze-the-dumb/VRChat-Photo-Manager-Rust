import { onMount } from "solid-js";
import { invoke } from '@tauri-apps/api/tauri';

let PhotoList = () => {
  let canvas: HTMLCanvasElement;
  let hasLoadedPhotos = false;

  let loadPhotos = async () => {
    let photos = await invoke('load_photos');
    hasLoadedPhotos = true;
  }

  onMount(() => {
    loadPhotos();

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    })

    let ctx = canvas.getContext('2d')!;

    let f = new FontFace('Rubik', 'url(https://cdn.phazed.xyz/fonts/rubik/Rubik-VariableFont_wght.ttf)');

    f.load().then(font => {
      document.fonts.add(font);
      ctx.font = '20px Rubik';
    })

    let render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if(!hasLoadedPhotos){
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';

        ctx.fillText('Waiting for photos to load...', canvas.width / 2, canvas.height / 2);
      }

      requestAnimationFrame(render);
    }

    render();
  })

  return ( 
    <div class="photo-list">
      <canvas ref={( el ) => canvas = el}></canvas>
    </div>
  )
}

export default PhotoList;