import { createEffect, createSignal, Setter } from "solid-js";

export class ConfirmationBoxManager{
  private _confirmationBoxCallback = () => {};
  private _setConfirmationBoxText: Setter<string>

  constructor(){
    let [ confirmationBoxText, setConfirmationBoxText ] = createSignal('');
    this._setConfirmationBoxText = setConfirmationBoxText;
  
    let confirmationBox: HTMLElement;

    document.body.appendChild(<div class="confirmation-box" ref={( el ) => confirmationBox = el}>
      <div class="confirmation-box-container">
        { confirmationBoxText() }<br /><br />

        <div class="button-danger" onClick={() => { this._confirmationBoxCallback(); setConfirmationBoxText('') }}>Confirm</div>
        <div class="button" onClick={() => setConfirmationBoxText('') }>Deny</div>
      </div>
    </div> as HTMLElement);

    createEffect(() => {
      if(confirmationBoxText() !== ''){
        confirmationBox.style.display = 'block';

        setTimeout(() => {
          confirmationBox.style.opacity = '1';
        }, 1);
      } else{
        confirmationBox.style.opacity = '0';

        setTimeout(() => {
          confirmationBox.style.display = 'none';
        }, 250);
      }
    })
  }

  public SetConfirmationBox( text: string, cb: () => void ){
    this._setConfirmationBoxText(text);
    this._confirmationBoxCallback = cb;
  }
}