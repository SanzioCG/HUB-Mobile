# @hub-mobile/viewer

three.js viewer → bitta HTML (`dist/index.html`). Ilovada WebView ichida, keyin mijoz havolasida (kontrakt 1, 8).

## Dev

```powershell
npm run mock     # boshqa terminalda
npm run viewer   # http://localhost:5173  (?glb=<url>&token=<token>)
```

Standart: `http://<host>:8787/files/glb/m0-r5.glb`, token `dev-token`. Host bo'lmasa chap yuqorida dev panel chiqadi.

## Bridge (`src/bridge.ts`)

Xabarlar `{ type, ...maydonlar }`, obyekt yoki JSON satr. Viewer GLB'ni o'zi `fetch` qiladi (`Authorization: Bearer <token>`).

| Kiruvchi (host → viewer)       | Chiquvchi (viewer → host)                         |
| ------------------------------ | ------------------------------------------------- |
| `load {glbUrl, token}`         | `ready`                                           |
| `select {uid}`                 | `loaded {item, parts}`                            |
| `showAll`                      | `selected {uid, extras, clip}`                    |
| `openAll`, `closeAll`          | `error {code, message}`                           |
| `toggle {clip}`                | `deselected` (bo'sh joyga bosildi)                |
| `setMode {solid\|edges\|xray}` | xato kodlari: `bad_message`, `not_loaded`,        |
| `setDims {on}`                 | `load_failed`, `part_not_found`, `clip_not_found` |
| `resetView`, `deselect`        |                                                   |

`selected.clip` — detal joylashgan eshik/tortma klipi (`toggle` uchun), bo'lmasa `null`.
GLB manzili http(s) bo'lmasa (oflayn kesh, `file://`) XHR bilan olinadi.

Chiquvchi: `window.ReactNativeWebView.postMessage(JSON)`, aks holda `window.parent.postMessage`.
