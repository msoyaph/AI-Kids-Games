/// <reference types="vite/client" />

interface BootApi {
  set(p: number, label?: string): void;
  done(): void;
  fail(msg?: string): void;
}

interface Window {
  __boot?: BootApi;
}

/** Game version from package.json (injected by vite `define`). */
declare const __CALEX_VERSION__: string;
