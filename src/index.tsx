/* @refresh reload */
import { render } from "solid-js/web";

import "./styles.css";
import App from "./Components/App";

render(() => <App />, document.getElementById("root") as HTMLElement);