// AR sahifasi (kontrakt 1.4, 3): `ar-link` javobidagi `launch_url` — muddatli imzolangan AR sahifasi. Ilova uni tizim
// brauzerida ochadi (Android — Chrome, iOS — Safari). Mock'da sahifa — viewer bundle `mode: "ar"` (M-A5, interaktiv).
//
// Nega Scene Viewer emas: Honor X9d'da Scene Viewer (Google app) har qanday tashqi model bilan ochilmay qaytdi,
// Chrome WebXR ishladi (M-A3).

/** WebXR faqat HTTPS sahifada ishlaydi — boshqa sxema bo'lsa null. */
export function arLaunchUrl(res: { launch_url: string }): string | null {
  return res.launch_url.toLowerCase().startsWith('https://') ? res.launch_url : null;
}

export type OpenUrl = (url: string) => Promise<unknown>;
