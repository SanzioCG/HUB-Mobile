// 401 oqimi: istalgan so'rovda 401 → token secure-store'dan o'chiriladi → juftlash ekraniga qaytish.
import { createClient } from '../src/api/client';
import * as SecureStore from 'expo-secure-store';
import {
  createUnauthorizedHandler,
  loadSession,
  loadStartup,
  saveApiUrl,
  saveSession,
} from '../src/session/storage';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

const SESSION = {
  token: 'tok',
  user: { id: 7, name: 'Dizayner', role: 'designer' as const },
  company: { id: 1, name: 'Namuna' },
};

const respond401 = (async () =>
  new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })) as unknown as typeof fetch;

beforeEach(async () => {
  await saveSession(SESSION);
});

it('juftlash saqlanadi va qayta o‘qiladi (ilova qayta ochilganda)', async () => {
  expect(await loadSession()).toEqual(SESSION);
});

it('401 → token o‘chiriladi → onCleared', async () => {
  const onCleared = jest.fn();
  const handler = createUnauthorizedHandler(onCleared);
  const client = createClient({
    baseUrl: 'http://x',
    token: SESSION.token,
    fetch: respond401,
    onUnauthorized: () => void handler(),
  });
  await expect(client.projects()).rejects.toMatchObject({ status: 401 });
  await handler(); // tugashini kutish (bir xil va'da)
  expect(await loadSession()).toBeNull();
  expect(onCleared).toHaveBeenCalledTimes(1);
});

it('bir vaqtdagi bir nechta 401 — bitta tozalash', async () => {
  const onCleared = jest.fn();
  const handler = createUnauthorizedHandler(onCleared);
  await Promise.all([handler(), handler(), handler()]);
  expect(onCleared).toHaveBeenCalledTimes(1);
  expect(await loadSession()).toBeNull();
});

it('ilova ochilishi: sessiya va server manzili o‘qiladi', async () => {
  await saveApiUrl('http://lan:8787');
  expect(await loadStartup()).toEqual({ session: SESSION, apiUrl: 'http://lan:8787' });
});

it('ilova ochilishi: SecureStore xato bersa — qotmaydi, juftlanmagan, buzilgan yozuv o‘chiriladi', async () => {
  const get = jest.mocked(SecureStore.getItemAsync);
  get.mockRejectedValue(new Error('Could not decrypt the value'));
  try {
    expect(await loadStartup()).toEqual({ session: null, apiUrl: null });
  } finally {
    get.mockReset();
    get.mockImplementation(
      async (k: string) =>
        (SecureStore as unknown as { __store: Map<string, string> }).__store.get(k) ?? null,
    );
  }
  expect(await loadSession()).toBeNull();
});
