// Hujjat tanlagich (expo-document-picker) bergan faylni baytlar bilan o'qish.
// Honor X9d / Expo Go (SDK 58): tanlagich keshi `cache/DocumentPicker` Expo Go tajribasi papkasidan tashqarida —
// `File.bytes()` ham, legacy `readAsStringAsync` ham rad etadi. Shuning uchun Android'da tanlagich nusxa qilmaydi
// (`copyToCacheDirectory: false`) va manbaning `content://` havolasi o'qiladi: avval yangi API, bo'lmasa legacy (base64).
import { File } from 'expo-file-system';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';

export async function readPickedFile(uri: string): Promise<Uint8Array> {
  try {
    return await new File(uri).bytes();
  } catch {
    return base64ToBytes(await readAsStringAsync(uri, { encoding: EncodingType.Base64 }));
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(256).fill(255);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

/** Base64 → baytlar (bo'sh joy va qatorlar e'tiborsiz; `=` to'ldirish bilan). */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)]!;
    const b = LOOKUP[clean.charCodeAt(i + 1)]!;
    const c = i + 2 < clean.length ? LOOKUP[clean.charCodeAt(i + 2)]! : 0;
    const d = i + 3 < clean.length ? LOOKUP[clean.charCodeAt(i + 3)]! : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    out[o++] = (n >> 16) & 0xff;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 0xff;
    if (i + 3 < clean.length) out[o++] = n & 0xff;
  }
  return out.subarray(0, o);
}
