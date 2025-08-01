export enum ViewState{
  SETTINGS,
  PHOTO_LIST,
  PHOTO_VIEWER
}

export class ViewManager{
  private _state: ViewState = ViewState.PHOTO_LIST;
  private _eventListeners: { from: ViewState, to: ViewState, cb: () => void }[] = [];

  public ChangeState( state: ViewState ){
    console.log('From: ' + this._state + ' To: ' + state);
    this._eventListeners.filter(x => x.from === this._state && x.to === state).forEach(c => c.cb());
    this._state = state;
  }

  public GetState(){ return this._state; }

  public OnStateTransition( from: ViewState, to: ViewState, cb: () => void ){
    this._eventListeners.push({ from, to, cb });
  }
}