import { For, Show, createEffect, onCleanup, onMount } from "solid-js";
import { invoke } from '@tauri-apps/api/core';
import anime from 'animejs';
import { WorldCache } from "./Structs/WorldCache";

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
  let trayInAnimation = false;

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

  let openTray = () => {
    if(trayOpen || trayInAnimation)return;

    trayOpen = true;
    trayInAnimation = true;

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
        trayInAnimation = false;
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

  let copyImage = () => {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d')!;

    canvas.width = window.PhotoViewerManager.CurrentPhoto()?.width || 0;
    canvas.height = window.PhotoViewerManager.CurrentPhoto()?.height || 0;

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

  let closeTray = () => {
    if(!trayOpen || trayInAnimation)return;
    trayInAnimation = true;

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
        trayInAnimation = false;
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

    window.addEventListener('keyup', switchPhotoWithKey);

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
      let photo = window.PhotoViewerManager.CurrentPhoto();
      allowedToOpenTray = false;

      imageViewer.style.opacity = '0';

      if(photo){
        imageViewer.src = (window.OS === "windows" ? "http://photo.localhost/" : 'photo://localhost/') + window.PhotoViewerManager.CurrentPhoto()?.path.split('\\').join('/') + "?full";
        imageViewer.crossOrigin = 'anonymous';

        anime({
          targets: imageViewer,
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
        <div class="icon" style={{ width: '10px', margin: '0' }}>
          <img draggable="false" src="/icon/x-solid.svg"></img>
        </div>
      </div>
      <img class="image-container" ref={( el ) => imageViewer = el} />

      <div class="prev-button" onClick={() => {
        window.CloseAllPopups.forEach(p => p());
        window.PhotoViewerManager.PreviousPhoto();
      }}>
        <div class="icon" style={{ width: '15px', margin: '0' }}>
          <img draggable="false" src="/icon/arrow-left-solid.svg"></img>
        </div>
      </div>

      <div class="next-button" onClick={() => {
        window.CloseAllPopups.forEach(p => p());
        window.PhotoViewerManager.NextPhoto();
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
          onClick={() => { copyImage(); }}>
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
          ref={authorProfileButton!}
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
        >
          <div class="icon" style={{ width: '12px', margin: '0' }}>
            <img draggable="false" src="/icon/user-solid.svg"></img>
          </div>
        </div>

        <div class="viewer-button"
          onMouseOver={( el ) => anime({ targets: el.currentTarget, width: '40px', height: '40px', 'margin-left': '15px', 'margin-right': '15px', 'margin-top': '-10px' })}
          onMouseLeave={( el ) => anime({ targets: el.currentTarget, width: '30px', height: '30px', 'margin-left': '20px', 'margin-right': '20px', 'margin-top': '0px' })}
          onClick={() => window.ConfirmationBoxManager.SetConfirmationBox("Are you sure you want to delete this photo?", async () => { invoke("delete_photo", {
            path: window.PhotoViewerManager.CurrentPhoto()?.path,
            token: (await invoke('get_config_value_string', { key: 'token' })) || "none",
            isSyncing: window.AccountManager.hasAccount() ? window.AccountManager.Storage()?.isSyncing : false
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