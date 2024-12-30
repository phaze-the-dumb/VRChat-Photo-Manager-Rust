import { createSignal, Setter, Show } from "solid-js";

export class LoadingManager{
  public SetLoading: Setter<string>;

  constructor(){
    let [ loading, setLoading ] = createSignal("");
    this.SetLoading = setLoading;

    document.body.appendChild(
      <div><Show when={loading() !== ""}>
        <div class="loading">
          <p>{ loading() }</p>
        </div>
      </Show></div> as HTMLElement
    );
  }
}