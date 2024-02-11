import { createSignal, createEffect, Switch, Match } from "solid-js";
import NavBar from "./NavBar";
import { listen } from '@tauri-apps/api/event';
import { fetch, ResponseType } from "@tauri-apps/api/http"
import anime from "animejs";
import PhotoList from "./PhotoList";

function App() {
  let [ loggedIn, setLoggedIn ] = createSignal({ loggedIn: false, username: '', avatar: '', id: '' });
  let [ loadingType, setLoadingType ] = createSignal('load');

  if(localStorage.getItem('token')){
    fetch<any>('https://photos.phazed.xyz/api/v1/account', {
      method: 'GET',
      headers: { auth: localStorage.getItem('token' )},
      responseType: ResponseType.JSON
    })
      .then(data => {
        if(!data.data.ok){
          console.error(data);
          return setLoadingType('none');
        }

        setLoadingType('none');
        setLoggedIn({ loggedIn: true, username: data.data.user.username, avatar: data.data.user.avatar, id: data.data.user._id });
      })
      .catch(e => {
        setLoadingType('none');
        console.error(e);
      })
  } else{
    setLoadingType('none');
  }

  let loadingBlackout: HTMLElement;
  let loadingShown = false;

  createEffect(() => {
    let type = loadingType();

    if(loadingShown != (type != 'none')){
      loadingShown = (type != 'none');

      if(loadingShown){
        loadingBlackout.style.display = 'flex';
        anime({
          targets: loadingBlackout,
          opacity: 1,
          easing: 'easeInOutQuad',
          duration: 250
        })
      } else{
        anime({
          targets: loadingBlackout,
          opacity: 0,
          easing: 'easeInOutQuad',
          duration: 250,
          complete: () => {
            loadingBlackout.style.display = 'none';
          }
        })
      }
    }
  })

  listen('auth-callback', ( event: any ) => {
    let token = event.payload;

    fetch<any>('https://photos.phazed.xyz/api/v1/account', {
      method: 'GET',
      headers: { auth: token },
      responseType: ResponseType.JSON
    })
      .then(data => {
        if(!data.data.ok){
          console.error(data);
          return setLoadingType('none');
        }

        localStorage.setItem('token', token);

        setLoadingType('none');
        setLoggedIn({ loggedIn: true, username: data.data.user.username, avatar: data.data.user.avatar, id: data.data.user._id });
      })
      .catch(e => {
        setLoadingType('none');
        console.error(e);
      })
  })

  listen('auth-denied', () => {
    setLoadingType('none');
    console.warn('Authetication Denied');
  })

  return (
    <div class="container">
      <NavBar setLoadingType={setLoadingType} loggedIn={loggedIn} />
      <PhotoList />

      <div class="loading" ref={( el ) => loadingBlackout = el}>
        <Switch>
          <Match when={loadingType() === 'auth'}>
            <p>Waiting for authentication in browser.</p>
          </Match>
          <Match when={loadingType() === 'load'}>
            <p>Loading App...</p>
          </Match>
        </Switch>
      </div>
    </div>
  );
}

export default App;
