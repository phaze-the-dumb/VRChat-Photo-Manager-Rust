import { For, Show, createEffect, onMount } from "solid-js";
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import anime from 'animejs';

class PhotoViewerProps{
  currentPhotoView!: () => any;
  setCurrentPhotoView!: ( view: any ) => any;
  setPhotoNavChoice!: ( view: any ) => any;
  setConfirmationBox!: ( text: string, cb: () => void ) => void;
  storageInfo!: () => { storage: number, used: number, sync: boolean };
  loggedIn!: () => { loggedIn: boolean, username: string, avatar: string, id: string, serverVersion: string };
}

class WorldCache{
  expiresOn!: number;
  worldData!: {
    id: string,
    name: string,
    author: string,
    authorId: string,
    desc: string,
    img: string,
    maxUsers: number,
    visits: number,
    favourites: number,
    tags: any,
    from: string,
    fromSite: string,
    found: boolean
  }
}

let worldCache: WorldCache[] = JSON.parse(localStorage.getItem('worldCache') || "[]");

let PhotoViewer = ( props: PhotoViewerProps ) => {
  let viewer: HTMLElement;
  let imageViewer: HTMLImageElement;
  let isOpen = false;
  let trayOpen = false;

  let trayButton: HTMLElement;

  let photoTray: HTMLElement;
  let photoControls: HTMLElement;
  let photoTrayCloseBtn: HTMLElement;

  let worldInfoContainer: HTMLElement;
  let photoPath: string;

  let viewerContextMenu: HTMLElement;
  let viewerContextMenuButtons: HTMLElement[] = [];

  let openTray = () => {
    if(trayOpen)return;
    trayOpen = true;

    window.CloseAllPopups.forEach(p => p());
    anime({ targets: photoTray, bottom: '0px', duration: 500 });

    anime({
      targets: photoControls,
      bottom: '160px',
      scale: '0.75',
      opacity: 0,
      duration: 500,
      complete: () => {
        photoControls.style.display = 'none';
      }
    });

    photoTrayCloseBtn.style.display = 'flex';
    anime({
      targets: photoTrayCloseBtn,
      bottom: '160px',
      opacity: 1,
      scale: 1,
      duration: 500
    })
  }

  let closeTray = () => {
    if(!trayOpen)return;

    window.CloseAllPopups.forEach(p => p());
    anime({ targets: photoTray, bottom: '-150px', duration: 500 });

    anime({
      targets: photoTrayCloseBtn,
      bottom: '10px',
      scale: '0.75',
      opacity: 0,
      duration: 500,
      complete: () => {
        photoTrayCloseBtn.style.display = 'none';
        trayOpen = false;
      }
    });

    photoControls.style.display = 'flex';
    anime({
      targets: photoControls,
      bottom: '10px',
      opacity: 1,
      scale: 1,
      duration: 500,
    })
  }

  onMount(() => {
    anime.set(photoControls, { translateX: '-50%' });
    anime.set(photoTrayCloseBtn, { translateX: '-50%', opacity: 0, scale: '0.75', bottom: '10px' });

    let contextMenuOpen = false;
    window.CloseAllPopups.push(() => {
      contextMenuOpen = false;
      anime.set(viewerContextMenu, { opacity: 1, rotate: '0deg' });

      anime({
        targets: viewerContextMenu,
        opacity: 0,
        easing: 'easeInOutQuad',
        rotate: '30deg',
        duration: 100,
        complete: () => {
          viewerContextMenu.style.display = 'none';
        }
      })
    });

    viewerContextMenuButtons[0].onclick = async () => {
      window.CloseAllPopups.forEach(p => p());
      // Context Menu -> Open file location

      let path = await invoke('get_user_photos_path') + '\\' + props.currentPhotoView().path;
      invoke('open_folder', { url: path });
    }

    viewerContextMenuButtons[1].onclick = () => {
      window.CloseAllPopups.forEach(p => p());
      // Context Menu -> Copy image

      let canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d')!;

      canvas.width = props.currentPhotoView().width;
      canvas.height = props.currentPhotoView().height;

      ctx.drawImage(imageViewer, 0, 0);

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
    }

    imageViewer.oncontextmenu = ( e ) => {
      if(contextMenuOpen){
        contextMenuOpen = false;

        anime.set(viewerContextMenu, { opacity: 1, rotate: '0deg' });

        anime({
          targets: viewerContextMenu,
          opacity: 0,
          rotate: '30deg',
          easing: 'easeInOutQuad',
          duration: 100,
          complete: () => {
            viewerContextMenu.style.display = 'none';
          }
        })
      } else{
        contextMenuOpen = true;

        viewerContextMenu.style.top = e.clientY + 'px';
        viewerContextMenu.style.left = e.clientX + 'px';
        viewerContextMenu.style.display = 'block';

        anime.set(viewerContextMenu, { opacity: 0, rotate: '-30deg' });
  
        anime({
          targets: viewerContextMenu,
          opacity: 1,
          rotate: '0deg',
          easing: 'easeInOutQuad',
          duration: 100
        })
      }
    }

    createEffect(() => {
      let photo = props.currentPhotoView();

      imageViewer.style.opacity = '0';

      if(photo){
        (async () => {
          if(!photoPath)
            photoPath = await invoke('get_user_photos_path') + '/';

          imageViewer.src = 'http://photo.localhost/' + (photoPath + props.currentPhotoView().path).split('\\').join('/') + "?full";
          imageViewer.crossOrigin = 'anonymous';
        })();

        anime({
          targets: imageViewer,
          opacity: 1,
          delay: 50,
          duration: 150,
          easing: 'easeInOutQuad'
        })

        if(photo.metadata){
          let meta = JSON.parse(photo.metadata);
          let worldData = worldCache.find(x => x.worldData.id === meta.world.id);

          photoTray.innerHTML = '';
          photoTray.appendChild(
            <div class="photo-tray-columns">
              <div class="photo-tray-column" style={{ width: '20%' }}><br />
                <div class="tray-heading">People</div>

                <For each={meta.players}>
                  {( item ) =>
                    <div>
                      { item.displayName }
                      <Show when={item.id}>
                        <i onClick={() => invoke('open_url', { url: 'https://vrchat.com/home/user/' + item.id })} style={{ "margin-left": '10px', "font-size": '12px', 'color': '#bbb', cursor: 'pointer' }} class="fa-solid fa-arrow-up-right-from-square"></i>
                      </Show>
                    </div>
                  }
                </For><br />
              </div>
              <div class="photo-tray-column"><br />
                <div class="tray-heading">World</div>

                <div ref={( el ) => worldInfoContainer = el}>Loading World Data...</div>
              </div>
            </div> as Node
          );


          if(!worldData){
            console.log('Fetching new world data');

            invoke('find_world_by_id', { worldId: meta.world.id });
          } else if(worldData.expiresOn < Date.now()){
            console.log('Fetching new world data since cache has expired');

            worldCache = worldCache.filter(x => x !== worldData)
            invoke('find_world_by_id', { worldId: meta.world.id });
          } else
            loadWorldData(worldData);

          trayButton.style.display = 'flex';
        } else{
          trayButton.style.display = 'none';
          closeTray();
        }
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

  let loadWorldData = ( data: WorldCache ) => {
    let meta = props.currentPhotoView().metadata;
    if(!meta)return;

    worldInfoContainer.innerHTML = '';
    worldInfoContainer.appendChild(
      <div>
        <Show when={ data.worldData.found == false && meta }>
          <div>
            <div class="world-name">{ JSON.parse(meta).world.name } <i onClick={() => invoke('open_url', { url: 'https://vrchat.com/home/world/' + data.worldData.id })} style={{ "margin-left": '0px', "font-size": '12px', 'color': '#bbb', cursor: 'pointer' }} class="fa-solid fa-arrow-up-right-from-square"></i></div>
            <div style={{ width: '75%', margin: 'auto' }}>Could not fetch world information... Is the world private?</div>
          </div>
        </Show>
        <Show when={ data.worldData.found == true }>
          <div class="world-name">{ data.worldData.name } <i onClick={() => invoke('open_url', { url: 'https://vrchat.com/home/world/' + data.worldData.id })} style={{ "margin-left": '0px', "font-size": '12px', 'color': '#bbb', cursor: 'pointer' }} class="fa-solid fa-arrow-up-right-from-square"></i></div>
          <div style={{ width: '75%', margin: 'auto' }}>{ data.worldData.desc }</div>

          <br />
          <div class="world-tags">
            <For each={JSON.parse(data.worldData.tags.split('\\\\').join("").split('\\').join("").slice(1, -1))}>
              {( tag ) =>
                <div>{ tag.replace("author_tag_", "").replace("system_", "") }</div>
              }
            </For>
          </div><br />
        </Show>
      </div> as Node
    )
  }

  listen('world_data', ( event: any ) => {
    let worldData = {
      expiresOn: Date.now() + 1.2096E+09,
      worldData: {
        id: event.payload.id,
        name: event.payload.name.split('\\').join('').slice(1, -1),
        author: event.payload.author.split('\\').join('').slice(1, -1),
        authorId: event.payload.authorId.split('\\').join('').slice(1, -1),
        desc: event.payload.desc.split('\\').join('').slice(1, -1),
        img: event.payload.img.split('\\').join('').slice(1, -1),
        maxUsers: event.payload.maxUsers,
        visits: event.payload.visits,
        favourites: event.payload.favourites,
        tags: event.payload.tags,
        from: event.payload.from,
        fromSite: event.payload.fromSite,
        found: event.payload.found
      }
    }

    worldCache.push(worldData);
    localStorage.setItem("worldCache", JSON.stringify(worldCache));

    loadWorldData(worldData);
  })

  return (
    <div class="photo-viewer" ref={( el ) => viewer = el}>
      <div class="photo-context-menu" ref={( el ) => viewerContextMenu = el}>
        <div ref={( el ) => viewerContextMenuButtons.push(el)}>Open file location</div>
        <div ref={( el ) => viewerContextMenuButtons.push(el)}>Copy image</div>
      </div>

      <div class="viewer-close viewer-button" onClick={() => props.setCurrentPhotoView(null)}>
        <div class="icon" style={{ width: '10px', margin: '0' }}>
          <img draggable="false" src="/icon/x-solid.svg"></img>
        </div>
      </div>
      <img class="image-container" ref={( el ) => imageViewer = el} />

      <div class="prev-button" onClick={() => {
        window.CloseAllPopups.forEach(p => p());
        props.setPhotoNavChoice('prev');
      }}>
        <div class="icon" style={{ width: '15px', margin: '0' }}>
          <img draggable="false" src="/icon/arrow-left-solid.svg"></img>
        </div>
      </div>

      <div class="next-button" onClick={() => {
        window.CloseAllPopups.forEach(p => p());
        props.setPhotoNavChoice('next');
      }}>
        <div class="icon" style={{ width: '15px', margin: '0' }}>
          <img draggable="false" src="/icon/arrow-right-solid.svg"></img>
        </div>
      </div>

      <div class="photo-tray" ref={( el ) => photoTray = el}></div>

      <div class="photo-tray-close"
        onClick={() => closeTray()}
        ref={( el ) => photoTrayCloseBtn = el}
      >
        <div class="icon" style={{ width: '12px', margin: '0' }}>
          <img draggable="false" src="/icon/angle-down-solid.svg"></img>
        </div>
      </div>

      <div class="control-buttons" ref={( el ) => photoControls = el}>
        <div class="viewer-button"
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
          onClick={() => {
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d')!;

            canvas.width = props.currentPhotoView().width;
            canvas.height = props.currentPhotoView().height;

            ctx.drawImage(imageViewer, 0, 0);

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
          <div class="icon" style={{ width: '12px', margin: '0' }}>
            <img draggable="false" src="/icon/copy-solid.svg"></img>
          </div>
        </div>
        <div class="viewer-button" style={{ width: '50px' }}
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '70px', height: '30px', 'margin-left': '10px', 'margin-right': '10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '50px', height: '30px', 'margin-left': '20px', 'margin-right': '20px' })}
          ref={( el ) => trayButton = el}
          onClick={() => openTray()}
        >
          <div class="icon" style={{ width: '12px', margin: '0' }}>
            <img draggable="false" src="/icon/angle-up-solid.svg"></img>
          </div>
        </div>
        <div class="viewer-button"
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
          onClick={() => props.setConfirmationBox("Are you sure you want to delete this photo?", () => { invoke("delete_photo", {
            path: props.currentPhotoView().path,
            token: localStorage.getItem("token") || "none",
            isSyncing: props.loggedIn().loggedIn ? props.storageInfo().sync : false
          });
        })}>
          <div class="icon" style={{ width: '12px', margin: '0' }}>
            <img draggable="false" src="/icon/trash-solid.svg"></img>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotoViewer