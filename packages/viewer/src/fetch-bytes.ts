/**
 * GLB baytlarini olish. http(s) — `fetch` (token header'da). Boshqa sxemalar (oflayn keshda `file://` sahifadan
 * nisbiy yo'l) — XHR: Chromium va WKWebView'da `fetch` `file:` sxemasini qo'llab-quvvatlamaydi (ADR-M002).
 */
export type OnProgress = (loaded: number, total: number | null) => void;

export async function fetchBytes(url: string, token: string, onProgress?: OnProgress): Promise<ArrayBuffer> {
  const resolved = new URL(url, document.baseURI);
  if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
    const res = await fetch(resolved, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const len = Number(res.headers.get('Content-Length'));
    const total = Number.isFinite(len) && len > 0 ? len : null;
    if (!res.body || !onProgress) return res.arrayBuffer();
    return readWithProgress(res.body, total, onProgress);
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', resolved.href);
    xhr.responseType = 'arraybuffer';
    xhr.onprogress = (e) => onProgress?.(e.loaded, e.lengthComputable ? e.total : null);
    // file:// da status 0 bo'ladi — javob bo'lsa muvaffaqiyat.
    xhr.onload = () =>
      xhr.response && (xhr.status === 0 || xhr.status === 200)
        ? resolve(xhr.response as ArrayBuffer)
        : reject(new Error(`XHR ${xhr.status}`));
    xhr.onerror = () => reject(new Error(`XHR xato: ${resolved.href}`));
    xhr.send();
  });
}

/** Oqimni o'qib, har bo'lakda `onProgress` chaqiradi. */
export async function readWithProgress(
  body: ReadableStream<Uint8Array>,
  total: number | null,
  onProgress: OnProgress,
): Promise<ArrayBuffer> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  onProgress(0, total);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress(loaded, total);
  }
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}
