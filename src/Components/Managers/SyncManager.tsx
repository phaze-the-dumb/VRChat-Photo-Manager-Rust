import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Accessor, createSignal, Setter } from "solid-js";

export class SyncManager{
  private _setIsSyncing: Setter<boolean>;
  private _setSyncPhotoTotal: Setter<number>;
  private _setSyncPhotoTransfers: Setter<number>;
  private _setSyncType: Setter<string>;
  private _setSyncError: Setter<string>;

  public IsSyncing: Accessor<boolean>;
  public SyncPhotoTotal: Accessor<number>;
  public SyncPhotoTransfers: Accessor<number>
  public SyncType: Accessor<string>;
  public SyncError: Accessor<string>;

  constructor(){
    [ this.IsSyncing, this._setIsSyncing ] = createSignal(false);
    [ this.SyncPhotoTotal, this._setSyncPhotoTotal ] = createSignal(-1);
    [ this.SyncPhotoTransfers, this._setSyncPhotoTransfers ] = createSignal(-1);
    [ this.SyncType, this._setSyncType ] = createSignal("");
    [ this.SyncError, this._setSyncError ] = createSignal("");

    listen('photos-upload-meta', ( e: any ) => {
      this._setIsSyncing(true);
      this._setSyncPhotoTotal(e.payload.photos_total);
      this._setSyncPhotoTransfers(e.payload.photos_total - e.payload.photos_uploading);
      this._setSyncType('Upload');
  
      console.log(e.payload)
    })
  
    listen('photos-download-meta', ( e: any ) => {
      this._setIsSyncing(true);
      this._setSyncPhotoTotal(e.payload.photos_total);
      this._setSyncPhotoTransfers(e.payload.photos_total - e.payload.photos_uploading);
      this._setSyncType('Download');
  
      console.log(e.payload)
    })
  
    listen('sync-finished', () => {
      this._setIsSyncing(false);
    })

    listen('sync-failed', ( e: any ) => {
      this._setSyncError(e.payload);
    })
  }

  public async TriggerSync(){
    this._setIsSyncing(true);
    invoke('sync_photos', { token: (await invoke('get_config_value_string', { key: 'token' })) });
  }
}