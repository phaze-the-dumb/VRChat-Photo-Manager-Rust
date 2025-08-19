import { For, Show, createEffect, onCleanup, onMount } from "solid-js";
import { invoke } from '@tauri-apps/api/core';
import { WorldCache } from "./Structs/WorldCache";
import { animate, JSAnimation, utils } from "animejs";

let PhotoViewer = () => {
  let viewer: HTMLElement;
  let imageViewer: HTMLImageElement;
  let isOpen = false;
  let trayOpen = false;

  let trayButton: HTMLElement;

  let photoTray: HTMLElement;
  let photoControls: HTMLElement;
  let photoTrayCloseBtn: HTMLElement;

  let worldInfoContainer: HTMLElement;

  let viewerContextMenu: HTMLElement;
  let viewerContextMenuButtons: HTMLElement[] = [];

  let allowedToOpenTray = false;

  let authorProfileButton: HTMLDivElement;

  let switchPhotoWithKey = ( e: KeyboardEvent ) => {
    switch(e.key){
      case 'Escape':
        window.PhotoViewerManager.Close();

        break;
      case 'ArrowUp':
        if(allowedToOpenTray)
          openTray();

        break;
      case 'ArrowDown':
        closeTray();
        break;
      case 'ArrowLeft':
        window.CloseAllPopups.forEach(p => p());
        window.PhotoViewerManager.PreviousPhoto();

        break;
      case 'ArrowRight':
        window.CloseAllPopups.forEach(p => p());
        window.PhotoViewerManager.NextPhoto();

        break;
    }
  }

  let trayAnimation: JSAnimation[] = [];

  let openTray = () => {
    if(trayOpen)return;
    trayOpen = true;

    trayAnimation.forEach(anim => anim.cancel());

    window.CloseAllPopups.forEach(p => p());
    trayAnimation[0] = animate(photoTray, { bottom: '-150px', duration: 500, ease: 'outElastic' });

    trayAnimation[1]  = animate(photoControls, {
      bottom: '160px',
      ease: 'outElastic',
      scale: '0.75',
      opacity: 0,
      duration: 500,
      onComplete: () => {
        photoControls.style.display = 'none';
      }
    });

    photoTrayCloseBtn.style.display = 'flex';
    trayAnimation[2]  = animate(photoTrayCloseBtn, {
      bottom: '160px',
      ease: 'outElastic',
      opacity: 1,
      scale: 1,
      duration: 500
    })
  }

  let copyImage = () => {
    invoke('copy_image', { path: window.PhotoViewerManager.CurrentPhoto()!.path })
      .then(() => {
        utils.set('.copy-notif', { translateX: '-50%', translateY: '-100px' });
        animate('.copy-notif', {
          ease: 'outElastic',
          opacity: 1,
          translateY: '0px'
        });

        setTimeout(() => {
          animate('.copy-notif', {
            ease: 'outElastic',
            opacity: 0,
            translateY: '-100px'
          });
        }, 2000);
      })
  }

  let closeTray = () => {
    if(!trayOpen)return;
    trayOpen = false;

    trayAnimation.forEach(anim => anim.cancel());

    window.CloseAllPopups.forEach(p => p());
    trayAnimation[0] = animate(photoTray, { bottom: '-300px', duration: 500, ease: 'outElastic' });

    trayAnimation[2] = animate(photoTrayCloseBtn, {
      bottom: '10px',
      scale: '0.75',
      ease: 'outElastic',
      opacity: 0,
      duration: 500,
      onComplete: () => {
        photoTrayCloseBtn.style.display = 'none';
      }
    });

    photoControls.style.display = 'flex';
    trayAnimation[1] = animate(photoControls, {
      bottom: '10px',
      ease: 'outElastic',
      opacity: 1,
      scale: 1,
      duration: 500,
    })
  }

  onMount(() => {
    utils.set(photoControls, { translateX: '-50%' });
    utils.set(photoTrayCloseBtn, { translateX: '-50%', opacity: 0, scale: '0.75', bottom: '10px' });

    window.addEventListener('keyup', switchPhotoWithKey);

    let contextMenuOpen = false;
    window.CloseAllPopups.push(() => {
      contextMenuOpen = false;
      utils.set(viewerContextMenu, { opacity: 1, rotate: '0deg' });

      animate(viewerContextMenu, {
        opacity: 0,
        easing: 'easeInOutQuad',
        rotate: '30deg',
        duration: 100,
        onComplete: () => {
          viewerContextMenu.style.display = 'none';
        }
      })
    });

    viewerContextMenuButtons[0].onclick = async () => {
      window.CloseAllPopups.forEach(p => p());
      // Context Menu -> Open file location

      let path = await invoke('get_user_photos_path') + '\\' + window.PhotoViewerManager.CurrentPhoto()?.path;
      invoke('open_folder', { url: path });
    }

    viewerContextMenuButtons[1].onclick = () => {
      window.CloseAllPopups.forEach(p => p());
      // Context Menu -> Copy image
      copyImage();
    }

    imageViewer.oncontextmenu = ( e ) => {
      if(contextMenuOpen){
        contextMenuOpen = false;

        utils.set(viewerContextMenu, { opacity: 1, rotate: '0deg' });

        animate(viewerContextMenu, {
          opacity: 0,
          rotate: '30deg',
          easing: 'easeInOutQuad',
          duration: 100,
          onComplete: () => {
            viewerContextMenu.style.display = 'none';
          }
        })
      } else{
        contextMenuOpen = true;

        viewerContextMenu.style.top = e.clientY + 'px';
        viewerContextMenu.style.left = e.clientX + 'px';
        viewerContextMenu.style.display = 'block';

        utils.set(viewerContextMenu, { opacity: 0, rotate: '-30deg' });
  
        animate(viewerContextMenu, {
          opacity: 1,
          rotate: '0deg',
          easing: 'easeInOutQuad',
          duration: 100
        })
      }
    }

    createEffect(() => {
      let photo = window.PhotoViewerManager.CurrentPhoto();
      allowedToOpenTray = false;

      imageViewer.style.opacity = '0';

      if(photo){
        imageViewer.src = (window.OS === "windows" ? "http://photo.localhost/" : 'photo://localhost/') + window.PhotoViewerManager.CurrentPhoto()?.path.split('\\').join('/') + "?full";
        imageViewer.crossOrigin = 'anonymous';

        animate(imageViewer, {
          opacity: 1,
          delay: 50,
          duration: 150,
          easing: 'easeInOutQuad'
        })

        let handleMetaDataLoaded = () => {
          console.log(photo.metadata);
          if(photo.metadata){
            photo.onMetaLoaded = () => {}

            try{
              // Try JSON format ( VRCX )
              let meta = JSON.parse(photo.metadata);

              allowedToOpenTray = true;
              trayButton.style.display = 'flex';

              authorProfileButton!.style.display = 'none';
    
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
                            <img width="15" src="/icon/up-right-from-square-solid.svg" onClick={() => invoke('open_url', { url: 'https://vrchat.com/home/user/' + item.id })} style={{ "margin-left": '10px', "font-size": '12px', 'color': '#bbb', cursor: 'pointer' }} />
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

              window.WorldCacheManager.getWorldById(meta.world.id)
                .then(worldData => {
                  if(worldData)
                    loadWorldData(worldData);
                });
            } catch(e){
              try{
                // Not json lets try XML (vrc prints)
                let parser = new DOMParser();
                let doc = parser.parseFromString(photo.metadata, "text/xml");

                let id = doc.getElementsByTagName('xmp:Author')[0]!.innerHTML;

                authorProfileButton!.style.display = 'flex';
                authorProfileButton!.onclick = () =>
                  invoke('open_url', { url: 'https://vrchat.com/home/user/' + id });
              } catch(e){
                console.error(e);
                console.log('Couldn\'t decode metadata')

                authorProfileButton!.style.display = 'none';
              }

              trayButton.style.display = 'none';
              closeTray();
            }
          } else{
            trayButton.style.display = 'none';
            closeTray();
          }
        }

        handleMetaDataLoaded();
      }

      if(photo && !isOpen){
        viewer.style.display = 'flex';
  
        animate(viewer, {
          opacity: 1,
          easing: 'easeInOutQuad',
          duration: 150
        });

        utils.set('.prev-button', { left: '-50px', top: '50%' });
        utils.set('.next-button', { right: '-50px', top: '50%' });

        animate('.prev-button', { left: '0', easing: 'easeInOutQuad', duration: 100 });
        animate('.next-button', { right: '0', easing: 'easeInOutQuad', duration: 100 });

        window.CloseAllPopups.forEach(p => p());
      } else if(!photo && isOpen){
        animate(viewer, {
          opacity: 0,
          easing: 'easeInOutQuad',
          duration: 150,
          onComplete: () => {
            viewer.style.display = 'none';
          }
        });

        window.CloseAllPopups.forEach(p => p());

        animate('.prev-button', { top: '75%', easing: 'easeInOutQuad', duration: 100 });
        animate('.next-button', { top: '75%', easing: 'easeInOutQuad', duration: 100 });
      }

      isOpen = photo != null;
    })
  })

  onCleanup(() => {
    window.removeEventListener('keyup', switchPhotoWithKey);
  })

  let loadWorldData = ( data: WorldCache ) => {
    let meta = window.PhotoViewerManager.CurrentPhoto()?.metadata;
    if(!meta)return;

    worldInfoContainer.innerHTML = '';
    worldInfoContainer.appendChild(
      <div>
        <Show when={ data.worldData.found == false && meta }>
          <div>
            <div class="world-name">{ JSON.parse(meta).world.name } <img width="15" src="/icon/up-right-from-square-solid.svg" onClick={() => invoke('open_url', { url: 'https://vrchat.com/home/world/' + data.worldData.id })} style={{ "margin-left": '0px', "font-size": '12px', 'color': '#bbb', cursor: 'pointer' }} /></div>
            <div style={{ width: '75%', margin: 'auto' }}>Could not fetch world information... Is the world private?</div>
          </div>
        </Show>
        <Show when={ data.worldData.found == true }>
          <div class="world-name">{ data.worldData.name } <img width="15" src="/icon/up-right-from-square-solid.svg" onClick={() => invoke('open_url', { url: 'https://vrchat.com/home/world/' + data.worldData.id })} style={{ "margin-left": '0px', "font-size": '12px', 'color': '#bbb', cursor: 'pointer' }} /></div>
          <div style={{ width: '75%', margin: 'auto' }}>{ data.worldData.desc }</div>

          <br />
          <div class="world-tags">
            <For each={data.worldData.tags}>
              {( tag ) =>
                <div>{ tag.replace("author_tag_", "").replace("system_", "") }</div>
              }
            </For>
          </div><br />
        </Show>
      </div> as Node
    )
  }

  return (
    <div class="photo-viewer" ref={( el ) => viewer = el}>
      <div class="photo-context-menu" ref={( el ) => viewerContextMenu = el}>
        <div ref={( el ) => viewerContextMenuButtons.push(el)}>Open file location</div>
        <div ref={( el ) => viewerContextMenuButtons.push(el)}>Copy image</div>
      </div>

      <div class="viewer-close viewer-button" onClick={() => window.PhotoViewerManager.Close()}>
        <div class="icon-small" style={{ width: '10px', margin: '0' }}>
          <img draggable="false" src="/icon/x-solid.svg"></img>
        </div>
      </div>
      <img class="image-container" ref={( el ) => imageViewer = el} />

      <div class="prev-button" onClick={() => {
        window.CloseAllPopups.forEach(p => p());
        window.PhotoViewerManager.PreviousPhoto();
      }}>
        <div class="icon-small" style={{ width: '15px', margin: '0' }}>
          <img draggable="false" src="/icon/arrow-left-solid.svg"></img>
        </div>
      </div>

      <div class="next-button" onClick={() => {
        window.CloseAllPopups.forEach(p => p());
        window.PhotoViewerManager.NextPhoto();
      }}>
        <div class="icon-small" style={{ width: '15px', margin: '0' }}>
          <img draggable="false" src="/icon/arrow-right-solid.svg"></img>
        </div>
      </div>

      <div class="photo-tray" ref={( el ) => photoTray = el}></div>

      <div class="photo-tray-close"
        onClick={() => closeTray()}
        ref={( el ) => photoTrayCloseBtn = el}
      >
        <div class="icon-small" style={{ width: '12px', margin: '0' }}>
          <img draggable="false" src="/icon/angle-down-solid.svg"></img>
        </div>
      </div>

      <div class="control-buttons" ref={( el ) => photoControls = el}>
        <div class="viewer-button"
          onMouseOver={( el ) => animate(el.currentTarget, { width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => animate(el.currentTarget, { width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
          onClick={() => { copyImage(); }}>
          <div class="icon-small" style={{ width: '12px', margin: '0' }}>
            <img draggable="false" src="/icon/copy-solid.svg"></img>
          </div>
        </div>
        <div class="viewer-button" style={{ width: '50px' }}
          onMouseOver={( el ) => animate(el.currentTarget, {  width: '70px', height: '30px', 'margin-left': '10px', 'margin-right': '10px' })}
          onMouseLeave={( el ) => animate(el.currentTarget, { width: '50px', height: '30px', 'margin-left': '20px', 'margin-right': '20px' })}
          ref={( el ) => trayButton = el}
          onClick={() => openTray()}
        >
          <div class="icon-small" style={{ width: '12px', margin: '0' }}>
            <img draggable="false" src="/icon/angle-up-solid.svg"></img>
          </div>
        </div>

        <div class="viewer-button"
          ref={authorProfileButton!}
          onMouseOver={( el ) => animate(el.currentTarget, { width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => animate(el.currentTarget, { width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
        >
          <div class="icon-small" style={{ width: '12px', margin: '0' }}>
            <img draggable="false" src="/icon/user-solid.svg"></img>
          </div>
        </div>

        <div class="viewer-button"
          onMouseOver={( el ) => animate(el.currentTarget, { width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => animate(el.currentTarget, { width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
          onClick={() => window.ConfirmationBoxManager.SetConfirmationBox("Are you sure you want to delete this photo?", async () => { invoke("delete_photo", {
            path: window.PhotoViewerManager.CurrentPhoto()?.path
          });
        })}>
          <div class="icon-small" style={{ width: '12px', margin: '0' }}>
            <img draggable="false" src="/icon/trash-solid.svg"></img>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotoViewer