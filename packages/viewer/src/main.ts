import './style.css';
import {
  createBridge,
  isStandalone,
  type HostMessage,
  type PartExtras,
  type ViewerMessage,
} from './bridge.js';
import { Viewer } from './viewer.js';

const container = document.getElementById('app')!;
let viewer: Viewer | null = null;
const bridge = createBridge((msg) => viewer?.handle(msg));
viewer = new Viewer(container, bridge);

if (isStandalone()) {
  // Dev / brauzer rejimi: GLB manzili URL parametridan, standart — mock'dagi M-0.
  const q = new URLSearchParams(location.search);
  const glbUrl = q.get('glb') ?? `http://${location.hostname || 'localhost'}:8787/files/glb/m0-r5.glb`;
  const token = q.get('token') ?? 'dev-token';
  devPanel((msg) => viewer?.handle(msg), bridge.onOutgoing);
  viewer.handle({ type: 'load', glbUrl, token });
}

bridge.post({ type: 'ready' });

/** Host bo'lmaganda bridge xabarlarini qo'lda yuborish uchun panel. */
function devPanel(
  send: (msg: HostMessage) => void,
  onOutgoing: (fn: (m: ViewerMessage) => void) => void,
): void {
  const panel = document.createElement('div');
  panel.className = 'dev';
  const status = document.createElement('div');
  status.className = 'dev-status';
  const card = document.createElement('div');
  card.className = 'dev-card';
  const row = (...els: HTMLElement[]) => {
    const r = document.createElement('div');
    r.className = 'dev-row';
    r.append(...els);
    panel.append(r);
    return r;
  };
  const btn = (text: string, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = fn;
    return b;
  };

  const modeBtns = (['solid', 'edges', 'xray'] as const).map((mode) => {
    const b = btn({ solid: 'Solid', edges: 'Qirralar', xray: 'X-ray' }[mode], () => {
      send({ type: 'setMode', mode });
      for (const x of modeBtns) x.classList.toggle('active', x === b);
    });
    return b;
  });
  modeBtns[0]!.classList.add('active');
  let dimsOn = false;
  const dimsBtn = btn("O'lchamlar", () => {
    dimsOn = !dimsOn;
    dimsBtn.classList.toggle('active', dimsOn);
    send({ type: 'setDims', on: dimsOn });
  });

  row(
    btn('Hammasini ochish', () => send({ type: 'openAll' })),
    btn('Yopish', () => send({ type: 'closeAll' })),
    btn("Hammasini ko'rsatish", () => send({ type: 'showAll' })),
    btn('Ko‘rinish', () => send({ type: 'resetView' })),
  );
  row(...modeBtns, dimsBtn);
  const clipRow = row();
  const select = document.createElement('select');
  select.onchange = () => select.value && send({ type: 'select', uid: select.value });
  row(select);
  panel.append(status, card);
  document.body.append(panel);

  const showCard = (x: PartExtras) => {
    card.innerHTML = '';
    const lines = [
      `№ ${x.number} · ${x.name}`,
      x.material,
      `${x.size_mm.join(' × ')} mm`,
      Object.entries(x.edges)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ') || "kromka yo'q",
      `uid ${x.uid}`,
    ];
    for (const l of lines) {
      const d = document.createElement('div');
      d.textContent = l;
      card.append(d);
    }
  };

  onOutgoing((m) => {
    if (m.type === 'loaded') {
      const meta = m.item.meta ?? {};
      status.textContent = `${String(meta.revision_id ?? m.item.node)}${meta.approved === false ? ' · Tasdiqlanmagan holat' : ''}`;
      clipRow.replaceChildren(
        ...m.item.clips.map((c) => btn(c.replace(/__open$/, ''), () => send({ type: 'toggle', clip: c }))),
      );
      select.replaceChildren(new Option('QR sinovi: detal tanlang…', ''));
      for (const p of m.parts) select.append(new Option(`${p.number}. ${p.name}`, p.uid));
    } else if (m.type === 'selected') {
      showCard(m.extras);
    } else if (m.type === 'progress') {
      status.textContent = m.total ? `${Math.round((100 * m.loaded) / m.total)}%` : `${m.loaded} B`;
    } else if (m.type === 'deselected') {
      card.replaceChildren();
    } else if (m.type === 'error') {
      status.textContent = `${m.code}: ${m.message}`;
    }
  });
}
