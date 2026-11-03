// AR sahifasi (M-A3 tuzatishi): ilova imzolangan havola bilan AR sahifasini Chrome'da ochadi; sahifa Google
// <model-viewer> orqali Chrome WebXR'da buyumni haqiqiy o'lchamda polga qo'yadi (Scene Viewer bo'lmasa ham).
//
// Nega Scene Viewer emas: Honor X9d'da Scene Viewer (Google app) har qanday tashqi model bilan ochilmay qaytdi,
// expo-intent-launcher esa `packageName` ni `className` siz e'tiborsiz qoldiradi. Chrome WebXR ishladi.

export const TITLE_MAX = 60;

/** Sarlavha ≤ 60 belgi (kod nuqtalari bo'yicha — o'zbekcha harflar bo'linmasin). */
export const truncateTitle = (title: string) => [...title.trim()].slice(0, TITLE_MAX).join('');

/**
 * AR sahifasi imzolangan havola bilan bir origin'da: `GET /ar/launch?file=…&title=…`. Faqat HTTPS (WebXR talabi).
 * TODO(contract): bunday sahifa kontraktda yo'q — faqat mock; haqiqiy backend uchun taklif (M-A3 hisoboti).
 */
export function arPageUrl(fileUrl: string, title: string): string | null {
  const origin = /^(https:\/\/[^/]+)/i.exec(fileUrl)?.[1];
  if (!origin) return null;
  return `${origin}/ar/launch?file=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(truncateTitle(title))}`;
}

export type OpenUrl = (url: string) => Promise<unknown>;
