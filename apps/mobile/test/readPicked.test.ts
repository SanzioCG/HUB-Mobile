// Hujjat tanlagich fayli legacy API (base64) bilan o'qilganda — dekoder Node Buffer bilan bir xil.
import { base64ToBytes } from '../src/files/readPicked';

jest.mock('expo-file-system', () => ({ File: class {} }));
jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
}));

it('base64 → baytlar (har uzunlik, to‘ldirish bilan va qatorlar bilan)', () => {
  for (let n = 0; n < 70; n++) {
    const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 0xff);
    const b64 = Buffer.from(bytes).toString('base64');
    expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(bytes));
    expect(Array.from(base64ToBytes(b64.replace(/(.{10})/g, '$1\n')))).toEqual(Array.from(bytes));
  }
});
