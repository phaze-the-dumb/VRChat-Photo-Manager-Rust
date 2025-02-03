import { defineConfig, Plugin } from "vite";
import solid from "vite-plugin-solid";

const fullReloadAlways: Plugin = {
  name: 'full-reload',
  handleHotUpdate({ server }) {
    server.ws.send({ type: "full-reload" });
    return [];
  },
};

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [solid(),], //fullReloadAlways],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: [ 'src-tauri/**' ]
    }
  }
}));
