// Brauzer viewer'ining fayl rejimi (kontrakt 1.6, 10.3; DEMO-1 statik sahifa): `.uhub` ni tanlash yoki sudrab tashlash,
// "Butun loyiha" va bitta buyum ko'rinishi, eshik/tortma tugmalari, detal kartasi. Yuklagich — `uhub.ts` (ilova bilan bitta).
import { clipButtons } from './ar-math.js';
import type { Bridge, HostMessage, PartExtras } from './bridge.js';
import { unqualify } from './project.js';
import { UhubError, itemKey, openUhub, type UhubFile, type UhubItem } from './uhub.js';
import type { ItemSource } from './viewer.js';
import { iconEl } from './icons.js';

export interface FileViewer {
  handle(msg: HostMessage): void;
  loadSources(cacheKey: string, sources: readonly ItemSource[]): Promise<void>;
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

const toBuffer = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export const approvedText = (approved: boolean) =>
  `Eksport paytida: ${approved ? 'tasdiqlangan' : 'tasdiqlanmagan'}`;

export function mountFileUi(viewer: FileViewer, bridge: Bridge): void {
  const panel = el('div', 'file-panel');
  const title = el('div', 'file-title', 'U-HUB viewer');
  const hint = el('div', 'file-hint', 'Loyiha faylini (.uhub) tanlang yoki shu oynaga sudrab tashlang');
  const input = el('input', 'file-input');
  input.type = 'file';
  input.accept = '.uhub,application/zip,application/octet-stream';
  const pick = el('button', 'file-btn primary', 'Fayl tanlash');
  pick.onclick = () => input.click();
  const error = el('div', 'file-error');
  const list = el('div', 'file-list');
  const controls = el('div', 'file-row');
  const card = el('div', 'file-card');
  panel.append(title, hint, pick, input, error, list, controls, card);
  document.body.append(panel);

  let file: UhubFile | null = null;
  const names = new Map<string, string>();

  const show = (sources: ItemSource[], cacheKey: string) => {
    card.replaceChildren();
    void viewer.loadSources(cacheKey, sources);
  };
  const sourceOf = (f: UhubFile, it: UhubItem, key: string): ItemSource => ({
    key,
    source: { bytes: toBuffer(f.files.get(it.glb)!) },
    transform: key ? it.transform : { translation: [0, 0, 0], rotation: [0, 0, 0, 1] },
  });

  const open = async (blob: Blob) => {
    error.textContent = '';
    try {
      file = openUhub(new Uint8Array(await blob.arrayBuffer()));
    } catch (e) {
      // Kontrakt 10.3: tushunarli rad xabari, sahifa yiqilmaydi.
      file = null;
      list.replaceChildren();
      error.textContent = e instanceof UhubError ? e.message : 'Fayl ochilmadi';
      return;
    }
    const f = file;
    title.textContent = `№ ${f.index.project_number} · ${f.index.project_name}`;
    hint.textContent = '';
    names.clear();
    for (const it of f.index.items) names.set(itemKey(it), it.name);
    const all = el('button', 'file-btn', 'Butun loyiha');
    all.onclick = () =>
      show(
        f.index.items.map((it) => sourceOf(f, it, itemKey(it))),
        `file:${f.index.project_number}:all`,
      );
    list.replaceChildren(
      all,
      ...f.index.items.map((it) => {
        const row = el('div', 'file-item');
        const b = el('button', 'file-btn', `${it.name} · ${it.revision_label}`);
        b.onclick = () => show([sourceOf(f, it, '')], `file:${f.index.project_number}:${it.item_id}`);
        row.append(b, el('div', 'file-meta', approvedText(it.approved)));
        // 1.6 (10.2): eksport ogohlantirishlari — sariq belgi; bo'sh bo'lsa hech narsa.
        if (it.warnings.length) {
          const w = el('div', 'file-warn');
          for (const t of it.warnings) {
            const line = el('div', 'file-warn-line');
            line.append(iconEl('triangle-alert'), el('span', '', t));
            w.append(line);
          }
          row.append(w);
        }
        // 1.9 (10.2): izohlar — kulrang, belgisiz (ogohlantirish emas).
        if (it.notes?.length) {
          const n = el('div', 'file-notes');
          for (const t of it.notes) n.append(el('div', 'file-note-line', t));
          row.append(n);
        }
        return row;
      }),
    );
    all.click();
  };

  input.onchange = () => {
    const f = input.files?.[0];
    if (f) void open(f);
    input.value = '';
  };
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) void open(f);
  });

  let allOpen = false;
  bridge.onOutgoing((m) => {
    if (m.type === 'loaded') {
      // Klip tugmalari: loyiha rejimida buyum nomi bilan ("Shkaf 600: Eshik 1").
      const byItem = new Map<string, string[]>();
      for (const c of m.item.clips) {
        const k = c.includes('::') ? c.slice(0, c.indexOf('::')) : '';
        byItem.set(k, [...(byItem.get(k) ?? []), c]);
      }
      const buttons: HTMLButtonElement[] = [];
      for (const [k, clips] of byItem) {
        const labels = clipButtons(clips.map(unqualify));
        clips.forEach((c, i) => {
          const label = labels[i]?.label ?? c;
          const b = el('button', 'file-btn', k ? `${names.get(k) ?? k}: ${label}` : label);
          b.dataset.clip = c;
          b.onclick = () => viewer.handle({ type: 'toggle', clip: c });
          buttons.push(b);
        });
      }
      const allBtn = el('button', 'file-btn', 'Hammasini ochish');
      allBtn.onclick = () => viewer.handle({ type: allOpen ? 'closeAll' : 'openAll' });
      const reset = el('button', 'file-btn', "Hammasini ko'rsatish");
      reset.onclick = () => {
        viewer.handle({ type: 'showAll' });
        card.replaceChildren();
      };
      controls.replaceChildren(allBtn, reset, ...buttons);
    } else if (m.type === 'clipState') {
      const open = new Set(m.open);
      allOpen = m.open.length > 0;
      for (const b of controls.querySelectorAll<HTMLButtonElement>('button[data-clip]'))
        b.classList.toggle('active', open.has(b.dataset.clip!));
      const first = controls.firstElementChild;
      if (first) first.textContent = allOpen ? 'Hammasini yopish' : 'Hammasini ochish';
    } else if (m.type === 'selected') {
      showCard(card, m.extras);
    } else if (m.type === 'deselected') {
      card.replaceChildren();
    } else if (m.type === 'error') {
      error.textContent = m.message;
    }
  });
}

function showCard(card: HTMLElement, x: PartExtras): void {
  const edges = Object.entries(x.edges ?? {})
    .map(([k, v]) => `${k}: ${v ?? 'kromkasiz'}`)
    .join('; ');
  card.replaceChildren(
    ...[`№ ${x.number} · ${x.name}`, `${x.size_mm.join(' × ')} mm`, x.material, edges].map((t) =>
      el('div', '', t),
    ),
  );
}
