// M-A6: brend fayllari repo ildizidagi `assets/` dan (docs/design/ASSETS.md) — bundle ichiga kiritiladi (Vite `?raw`),
// tarmoqdan olinmaydi (oflayn va V-2 mijoz havolasi). Fayl shu nom bilan almashtirilsa — kod o'zgarmaydi.
import faviconSvg from '../../../assets/brand/favicon.svg?raw';

const METADATA = new RegExp('<metadata>[^]*?</metadata>', 'g');

/** C2PA va boshqa `<metadata>` bloklari (o'nlab KB) olib tashlanadi — ko'rinishga ta'sir qilmaydi. */
export const stripSvgMetadata = (svg: string) => svg.replace(METADATA, '');

export const svgDataUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(stripSvgMetadata(svg))}`;

/** Brauzer yorlig'i ikonkasi (V-2 ulashish sahifasi, DEMO-1). */
export function installFavicon(doc: Document = document): void {
  const link = doc.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = svgDataUrl(faviconSvg);
  doc.head.append(link);
}
