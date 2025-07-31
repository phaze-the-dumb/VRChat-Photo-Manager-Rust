import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import anime from 'animejs';
import { Show, onMount } from 'solid-js';
import { ViewState } from './Managers/ViewManager';

const appWindow = getCurrentWebviewWindow();

let NavBar = () => {
  let dropdownVisible = false;
  let inAnimation = false;
  let dropdown: HTMLElement;

  onMount(() => {
    anime.set(dropdown, { opacity: 0,  translateX: -10 });
    dropdown.style.display = 'none';
  })

  let setDropdownVisibility = ( visible: boolean ) => {
    if(inAnimation)return;

    if(dropdownVisible !== visible){
      dropdownVisible = visible;
      inAnimation = true;

      if(visible){
        dropdown.style.display = 'block';

        anime({
          targets: dropdown,
          opacity: 1,
          translateX: 0,
          easing: 'easeInOutQuad',
          duration: 250,
          complete: () => {
            inAnimation = false;
          }
        })
      } else{
        anime({
          targets: dropdown,
          opacity: 0,
          translateX: -10,
          easing: 'easeInOutQuad',
          duration: 250,
          complete: () => {
            inAnimation = false;
            dropdown.style.display = 'none';
          }
        })
      }
    }
  }

  window.CloseAllPopups.push(() => setDropdownVisibility(false));

  return (
    <>
      <div class="navbar" data-tauri-drag-region>
        <div class="tabs" data-tauri-drag-region>
          <div class="nav-tab" onClick={() => {
            window.ViewManager.ChangeState(ViewState.PHOTO_LIST);
            anime(
              {
                targets: '.settings',
                opacity: 0,
                translateX: '500px',
                easing: 'easeInOutQuad',
                duration: 250,
                complete: () => {
                  anime.set('.settings', { display: 'none' });
                }
              })
          }}>Photos</div>
        </div>
        <div class="nav-tab" style={{ width: '200px', "text-align": 'center', background: 'transparent' }} data-tauri-drag-region>
          <Show when={window.SyncManager.IsSyncing()}>
            <Show when={ window.SyncManager.SyncError() == "" } fallback={ "Error: " + window.SyncManager.SyncError() }>
              <div style={{ width: '100%', "text-align": 'center', 'font-size': '14px' }}>
                { window.SyncManager.SyncType() }ing: { window.SyncManager.SyncPhotoTransfers () } / { window.SyncManager.SyncPhotoTotal() }<br />
                <div style={{ width: '80%', height: '2px', margin: 'auto', "margin-top": '5px', background: '#111' }}>
                  <div style={{ height: '2px', width: (window.SyncManager.SyncPhotoTransfers() / window.SyncManager.SyncPhotoTotal()) * 100 + '%', background: '#00ccff' }}></div>
                </div>
              </div>
            </Show>
          </Show>
        </div>
        <div class="account" onClick={() => setDropdownVisibility(!dropdownVisible)}>
          <Show when={window.AccountManager.hasAccount()}>
            <div class="user-pfp" style={{ background: 
              `url('https://cdn.phazed.xyz/id/avatars/${window.AccountManager.Profile()?.id}/${window.AccountManager.Profile()?.avatar}.png')` }}></div>
          </Show>
          <div class="icon">
            <img draggable="false" width="24" height="24" src="/icon/caret-down-solid.svg"></img>
          </div>
        </div>
        <div class="control-lights">
          <div class="light" onClick={() => appWindow.minimize()}>
            <img draggable="false" width="24" height="24" src="/icon/minus-solid.svg"></img>
          </div>
          <div class="light" onClick={() => appWindow.toggleMaximize()}>
            <img draggable="false" width="24" height="24" src="/icon/square-regular.svg"></img>
          </div>
          <div class="light" onClick={() => { appWindow.hide(); emit('hide-window'); } }>
            <img draggable="false" width="24" height="24" src="/icon/x-solid.svg"></img>
          </div>
        </div>
      </div>

      <div class="dropdown" ref={( el ) => dropdown = el}>
        <div class="dropdown-button" onClick={async () => {
          anime.set('.settings', { display: 'block' });
          anime({
            targets: '.settings',
            opacity: 1,
            translateX: '0px',
            easing: 'easeInOutQuad',
            duration: 250
          })

          window.ViewManager.ChangeState(ViewState.SETTINGS);
          setDropdownVisibility(false);
        }}>Settings</div>

        <Show when={!window.AccountManager.hasAccount()} fallback={
          <div class="dropdown-button" onClick={async () => {
            window.AccountManager.logout()
              .then(data => {
                console.log(data);
                setDropdownVisibility(false);
              })
              .catch(e => {
                console.error(e);

                invoke('set_config_value_string', { key: 'token', value: '' });
                window.location.reload();

                setDropdownVisibility(false);
              })
          }}>Sign Out</div>
        }>
          <div class="dropdown-button" onClick={() => {
            window.AccountManager.login();
            setDropdownVisibility(false);
          }}>Sign In</div>
        </Show>
      </div>
    </>
  )
}

export default NavBar;