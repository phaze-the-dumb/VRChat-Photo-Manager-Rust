import { invoke } from "@tauri-apps/api/core";

import { ProfileData } from "../Structs/ProfileData";
import { StorageData } from "../Structs/StorageData";
import { Accessor, createSignal, Setter } from "solid-js";

import { listen } from "@tauri-apps/api/event";
import { fetch } from "@tauri-apps/plugin-http";

export class AccountManager{
  public Profile: Accessor<ProfileData | null>;
  public Storage: Accessor<StorageData | null>;

  public hasAccount: Accessor<boolean>;
  public isLoading: Accessor<boolean>;
  
  private _setProfile: Setter<ProfileData | null>;
  private _setStorage: Setter<StorageData | null>;

  private _setHasAccount: Setter<boolean>;
  private _setIsLoading: Setter<boolean>;

  private _loginEventCallbacks: Array<() => void> = [];

  private _emitLoginCallbacks(){
    this._loginEventCallbacks.forEach(e => e());
  }

  constructor(){
    let [ hasAccount, setHasAccount ] = createSignal(false);
    let [ isLoading, setIsLoading ] = createSignal(true);

    let [ profile, setProfile ] = createSignal<ProfileData | null>(null);
    let [ storage, setStorage ] = createSignal<StorageData | null>(null);

    this.Profile = profile;
    this.Storage = storage;

    this.hasAccount = hasAccount;
    this.isLoading = isLoading;

    this._setProfile = setProfile;
    this._setStorage = setStorage;

    this._setHasAccount = setHasAccount;
    this._setIsLoading = setIsLoading;

    invoke('get_config_value_string', { key: 'token' })
      .then(( token: any ) => {
        this.verifyToken(token);
      })

    listen('auth-callback', ( event: any ) => {
      window.LoadingManager.SetLoading("");

      let token = event.payload;
      this.verifyToken(token);
    })
  
    listen('auth-denied', () => {
      window.LoadingManager.SetLoading("");
      console.warn('Authetication Denied');
    })
  }

  private async verifyToken( token: string ){
    if(!token){
      this._setHasAccount(false);
      this._setIsLoading(false);

      return this._emitLoginCallbacks();
    }

    let dat = await fetch('https://photos.phazed.xyz/api/v1/account?token='+token);
    if(dat.status !== 200){
      this._setHasAccount(false);
      this._setIsLoading(false);

      return this._emitLoginCallbacks();
    }

    let json = await dat.json();

    let profile = new ProfileData();
    let storage = new StorageData();

    profile.id = json.user._id;
    profile.username = json.user.username;
    profile.avatar = json.user.avatar;
    profile.serverVersion = json.user.serverVersion;

    storage.used = json.user.used;
    storage.total = json.user.storage;
    storage.isSyncing = json.user.settings.enableSync;

    this._setProfile(profile);
    this._setStorage(storage);

    this._setHasAccount(true);
    this._setIsLoading(false);

    this._emitLoginCallbacks();
  }

  public login(){
    window.LoadingManager.SetLoading("Waiting for Authentication");
    invoke('start_user_auth');
  }

  public async logout(){
    let dat = await fetch('https://photos.phazed.xyz/api/v1/deauth?token='+(await invoke('get_config_value_string', { key: 'token' }))!)
    if(dat.status !== 200)
      throw new Error(dat.statusText);
    
    let json = await dat.json();
    if(!json.ok)
      throw new Error(json.error);

    invoke('set_config_value_string', { key: 'token', value: '' });
    window.location.reload();

    return json;
  }

  public async Refresh(){
    let token: string = await invoke('get_config_value_string', { key: 'token' });
    await  this.verifyToken(token);
  }

  public onLoginFinish( cb: () => void ){
    this._loginEventCallbacks.push(cb);
  }
}