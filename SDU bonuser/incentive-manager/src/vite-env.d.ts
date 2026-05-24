/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INTEGRATION_LAYER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
