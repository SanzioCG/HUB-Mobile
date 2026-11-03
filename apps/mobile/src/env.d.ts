/// <reference types="expo/types" />

// Viewer bundle'i Metro asset sifatida (metro.config.js: assetExts += html).
declare module '*.html' {
  const asset: number;
  export default asset;
}
