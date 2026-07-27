/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly MICROCMS_API_URL: string;
  readonly MICROCMS_API_KEY: string;
  readonly MICROCMS_COFFEE_API_URL?: string;
  readonly MICROCMS_COFFEE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
