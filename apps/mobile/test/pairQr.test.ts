// Kontrakt 4.1: juftlash QR'i va skaner prefikslari.
import { classifyQr, parsePairQr } from '../src/scan/pairQr';

it('prefikslar: uhub-pair — juftlash, uhub — etiketka, boshqasi — begona', () => {
  expect(classifyQr('uhub-pair:1?server=x&code=123456')).toBe('pair');
  expect(classifyQr('uhub:1/p/101/i/m0/r/m0-r5/u/m0p06')).toBe('label');
  expect(classifyQr('https://example.com')).toBe('other');
});

it('server URL-kodlangan, oxirgi slash olib tashlanadi', () => {
  expect(parsePairQr('uhub-pair:1?server=http%3A%2F%2F192.168.1.5%3A4000%2F&code=123456')).toEqual({
    server: 'http://192.168.1.5:4000',
    code: '123456',
  });
});

it('noto‘g‘ri versiya, kod yoki server — null', () => {
  expect(parsePairQr('uhub-pair:2?server=http%3A%2F%2Fx&code=123456')).toBeNull();
  expect(parsePairQr('uhub-pair:1?server=http%3A%2F%2Fx&code=12345')).toBeNull();
  expect(parsePairQr('uhub-pair:1?server=ftp%3A%2F%2Fx&code=123456')).toBeNull();
  expect(parsePairQr('uhub-pair:1?code=123456')).toBeNull();
  expect(parsePairQr('uhub-pair:1?server=%E0%A4%A&code=123456')).toBeNull();
});
