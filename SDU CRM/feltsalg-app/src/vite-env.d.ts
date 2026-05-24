/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INTEGRATION_LAYER_URL?: string;
  readonly VITE_SALES_CORE_URL?: string;
  readonly VITE_AI_CORE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
