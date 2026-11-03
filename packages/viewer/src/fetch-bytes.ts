/**
 * GLB baytlarini olish. http(s) — `fetch` (token header'da). Boshqa sxemalar (oflayn keshda `file://` sahifadan
 * nisbiy yo'l) — XHR: Chromium va WKWebView'da `fetch` `file:` sxemasini qo'llab-quvvatlamaydi (ADR-M002).
 */
export async function fetchBytes(url: string, token: string): Promise<ArrayBuffer> {
  const resolved = new URL(url, document.baseURI);
  if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
    const res = await fetch(resolved, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', resolved.href);
    xhr.responseType = 'arraybuffer';
    // file:// da status 0 bo'ladi — javob bo'lsa muvaffaqiyat.
    xhr.onload = () =>
      xhr.response && (xhr.status === 0 || xhr.status === 200)
        ? resolve(xhr.response as ArrayBuffer)
        : reject(new Error(`XHR ${xhr.status}`));
    xhr.onerror = () => reject(new Error(`XHR xato: ${resolved.href}`));
    xhr.send();
  });
}
