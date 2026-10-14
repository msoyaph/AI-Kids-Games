// Images the widget inlines as data URIs (Vite, assetsInlineLimit: Infinity).
declare module '*.png' {
  const src: string;
  export default src;
}
