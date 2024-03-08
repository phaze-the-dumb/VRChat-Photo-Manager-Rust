import { invoke } from '@tauri-apps/api/tauri';
import anime from 'animejs';
import { Show, onMount } from 'solid-js';

class NavBarProps{
  setLoadingType!: ( type: string ) => string;
  loggedIn!: () => { loggedIn: boolean, username: string, avatar: string, id: string };
}

let NavBar = ( props: NavBarProps ) => {
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
      <div class="navbar">
        <div class="tabs">
          <div class="nav-tab" onClick={() => {
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
        <div class="account" onClick={() => setDropdownVisibility(!dropdownVisible)}>
          <Show when={props.loggedIn().loggedIn}>
            <div class="user-pfp" style={{ background: `url('https://cdn.phazed.xyz/id/avatars/${props.loggedIn().id}/${props.loggedIn().avatar}.png')` }}></div>
          </Show>
          <i class="fa-solid fa-caret-down account-dropdown"></i>
        </div>
      </div>

      <div class="dropdown" ref={( el ) => dropdown = el}>
        <div class="dropdown-button" onClick={() => {
          anime.set('.settings', { display: 'block' });
          anime(
          {
            targets: '.settings',
            opacity: 1,
            translateX: '0px',
            easing: 'easeInOutQuad',
            duration: 250
          })

          setDropdownVisibility(false);
        }}>Settings</div>

        <Show when={props.loggedIn().loggedIn == false} fallback={
          <div class="dropdown-button" onClick={() => {
            localStorage.removeItem('token');
            window.location.reload();

            setDropdownVisibility(false);
          }}>Sign Out</div>
        }>
          <div class="dropdown-button" onClick={() => {
            props.setLoadingType('auth');

            setTimeout(() => {
              props.setLoadingType('none');
            }, 5000);

            invoke('start_user_auth'); 
            setDropdownVisibility(false); 
          }}>Sign In</div>
        </Show>
      </div>
    </>
  )
}

export default NavBar;