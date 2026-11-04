// AR sahifasi UI'si (M-A5): "AR'ni boshlash", yo'riqnoma, DOM overlay paneli (eshik/tortma tugmalari, "Hammasini
// ochish/yopish", "Ochilish zonalari", "Qayta joylashtirish", "Chiqish"). AR bo'lmasa — xabar va 3D ko'rinish.
// Ochish/yopish — 3D rejimdagi bilan bir xil mexanizm (Viewer.handle xabarlari).
import type { ArCallbacks, ArState } from './ar.js';
import { clipButtons, guardXrSelect } from './ar-math.js';
import type { Bridge, HostMessage } from './bridge.js';
import { clipIconName, iconEl, type ViewerIconName } from './icons.js';

export const AR_TEXT = {
  start: "AR'ni boshlash",
  loading: (pct: number | null) => (pct === null ? 'Yuklanmoqda…' : `Yuklanmoqda… ${pct}%`),
  ready: "Xonada haqiqiy o'lchamda ko'rish uchun AR'ni boshlang",
  scanning: 'Telefonni polga qarating va sekin harakatlantiring',
  found: "Buyumni qo'yish uchun ekranga bosing",
  placed: 'Surish — bir barmoq, aylantirish — ikki barmoq',
  unsupported: "Bu qurilma yoki brauzer AR'ni qo'llamaydi",
  to3d: "3D ko'rinishga o'tish",
  openAll: 'Hammasini ochish',
  closeAll: 'Hammasini yopish',
  zones: 'Ochilish zonalari',
  replace: 'Qayta joylashtirish',
  exit: 'Chiqish',
  failed: (msg: string) => `AR ishga tushmadi: ${msg}`,
  loadFailed: (msg: string) => `Model yuklanmadi: ${msg}`,
} as const;

/** Viewer'ning AR sahifasi uchun kerak bo'lgan qismi. */
export interface ArViewer {
  handle(msg: HostMessage): void;
  startAr(overlay: HTMLElement, cb: ArCallbacks): Promise<string[]>;
  arReplace(): void;
  arExit(): void;
}

/** Hisobot uchun: so'ralgan imkoniyatlardan qaysilari sessiyada yoqilgan. */
const REPORTED = [
  'hit-test',
  'dom-overlay',
  'local-floor',
  'light-estimation',
  'plane-detection',
  'depth-sensing',
];

export function featureLine(enabled: readonly string[]): string {
  return 'XR: ' + REPORTED.map((f) => `${f} ${enabled.includes(f) ? 'bor' : "yo'q"}`).join(' · ');
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  text = '',
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** M-A6: tugma — ikonka (assets/icons, bundle ichida) + yorliq. */
function iconBtn(cls: string, icon: ViewerIconName, label: string): HTMLButtonElement {
  const b = el('button', cls);
  b.append(iconEl(icon), el('span', 'ar-label', label));
  return b;
}

const setBtn = (b: HTMLButtonElement, icon: ViewerIconName, label: string) =>
  b.replaceChildren(iconEl(icon), el('span', 'ar-label', label));

export function mountArUi(
  viewer: ArViewer,
  bridge: Bridge,
  title: string,
  supported: Promise<boolean>,
): HTMLElement {
  const root = el('div', 'ar');
  root.id = 'ar-overlay';
  const top = el('div', 'ar-top');
  const hint = el('div', 'ar-hint', AR_TEXT.loading(null));
  const xr = el('div', 'ar-xr');
  // AR boshida yo'riqnoma rasmi (polni topguncha); AR yo'q bo'lsa — "qo'llanmaydi" rasmi.
  const coach = iconEl('ar-coach', 'ar-art');
  coach.hidden = true;
  const unsupportedArt = iconEl('ar-unsupported', 'ar-art');
  unsupportedArt.hidden = true;
  top.append(el('div', 'ar-title', title || 'U-HUB'), hint, xr, coach);

  const start = el('div', 'ar-start');
  const startBtn = el('button', 'ar-btn primary', AR_TEXT.start);
  startBtn.disabled = true;
  const to3dBtn = el('button', 'ar-btn', AR_TEXT.to3d);
  to3dBtn.hidden = true;
  setBtn(to3dBtn, 'rotate-ccw', AR_TEXT.to3d);
  start.append(unsupportedArt, startBtn, to3dBtn);

  const panel = el('div', 'ar-panel');
  const clipsRow = el('div', 'ar-row');
  const allBtn = iconBtn('ar-btn', 'open-all', AR_TEXT.openAll);
  const zonesBtn = iconBtn('ar-btn', 'swing-zone', AR_TEXT.zones);
  const replaceBtn = iconBtn('ar-btn ar-only', 'rotate-ccw', AR_TEXT.replace);
  const exitBtn = iconBtn('ar-btn ar-only', 'x', AR_TEXT.exit);
  const toolsRow = el('div', 'ar-row');
  toolsRow.append(allBtn, zonesBtn, replaceBtn, exitBtn);
  panel.append(clipsRow, toolsRow);
  panel.hidden = true;

  // Tugmalar bosilganda XR `select` ishlamasin (buyum qayta joylashmasin).
  guardXrSelect(start);
  guardXrSelect(panel);
  root.append(top, start, panel);
  document.body.append(root);

  const open = new Set<string>();
  let clipBtns: { clip: string; label: string; btn: HTMLButtonElement }[] = [];
  let allOpen = false;
  let zonesOn = false;
  let loaded = false;
  let canAr = false;

  const syncClips = () => {
    // Ikonka holatga qarab: ochiq bo'lsa — yopish (door-close / drawer-close).
    for (const { clip, label, btn } of clipBtns) {
      btn.classList.toggle('active', open.has(clip));
      setBtn(btn, clipIconName(clip, open.has(clip)), label);
    }
    setBtn(allBtn, 'open-all', allOpen ? AR_TEXT.closeAll : AR_TEXT.openAll);
  };
  const showPanel = (ar: boolean) => {
    panel.hidden = false;
    root.classList.toggle('ar-active', ar);
    start.hidden = true;
  };
  const showStart = () => {
    panel.hidden = true;
    root.classList.remove('ar-active');
    start.hidden = false;
    startBtn.hidden = !canAr;
    to3dBtn.hidden = canAr;
    startBtn.disabled = !loaded;
    if (loaded) hint.textContent = canAr ? AR_TEXT.ready : AR_TEXT.unsupported;
    unsupportedArt.hidden = !loaded || canAr;
    coach.hidden = true;
  };

  allBtn.onclick = () => {
    viewer.handle({ type: allOpen ? 'closeAll' : 'openAll' });
  };
  zonesBtn.onclick = () => {
    zonesOn = !zonesOn;
    zonesBtn.classList.toggle('active', zonesOn);
    viewer.handle({ type: 'setHelpers', on: zonesOn });
  };
  replaceBtn.onclick = () => viewer.arReplace();
  exitBtn.onclick = () => viewer.arExit();
  to3dBtn.onclick = () => {
    hint.textContent = '';
    unsupportedArt.hidden = true;
    showPanel(false);
  };
  startBtn.onclick = () => {
    startBtn.disabled = true;
    const cb: ArCallbacks = {
      onState: (s: ArState) => {
        hint.textContent = AR_TEXT[s];
        coach.hidden = s !== 'scanning';
      },
      onEnd: () => {
        xr.textContent = '';
        showStart();
      },
    };
    viewer.startAr(root, cb).then(
      (features) => {
        xr.textContent = featureLine(features);
        showPanel(true);
      },
      (e: unknown) => {
        hint.textContent = AR_TEXT.failed(e instanceof Error ? e.message : String(e));
        startBtn.disabled = false;
      },
    );
  };

  bridge.onOutgoing((m) => {
    if (m.type === 'progress') {
      hint.textContent = AR_TEXT.loading(m.total ? Math.round((100 * m.loaded) / m.total) : null);
    } else if (m.type === 'loaded') {
      loaded = true;
      clipBtns = clipButtons(m.item.clips).map(({ clip, label }) => {
        const btn = iconBtn('ar-btn', clipIconName(clip, false), label);
        // Holat viewer'dan (`clipState`): ichki tortma eshikni ham ochadi/yopadi (kontrakt 1.6, 2.2).
        btn.onclick = () => viewer.handle({ type: 'toggle', clip });
        return { clip, label, btn };
      });
      clipsRow.replaceChildren(...clipBtns.map((c) => c.btn));
      allBtn.hidden = clipBtns.length === 0;
      void supported.then((ok) => {
        canAr = ok;
        showStart();
      });
    } else if (m.type === 'clipState') {
      open.clear();
      for (const c of m.open) open.add(c);
      allOpen = clipBtns.length > 0 && clipBtns.every((c) => open.has(c.clip));
      syncClips();
    } else if (m.type === 'error' && (m.code === 'load_failed' || m.code === 'contract_mismatch')) {
      hint.textContent = AR_TEXT.loadFailed(m.message);
    }
  });
  return root;
}
