// Mock mobil API — kontrakt uhub-mobile/1.2 (QORALAMA: docs/contract/uhub-mobile-1.2-draft.md), 4-bo'lim.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import type { ItemData, ProjectData, RevisionData, Store } from './data.js';

export interface AppOptions {
  store: Store;
  devToken: string;
  pairCode: string;
  /** revision_id → GLB baytlari. */
  glbs: Record<string, Uint8Array>;
  /** `ar-link` imzosi uchun HMAC kaliti (MOCK_SIGN_SECRET). */
  signSecret: string;
  /** Imzolangan AR havolalarining tashqi manzili (MOCK_PUBLIC_URL, masalan HTTPS tunnel). */
  publicUrl?: string;
  /** Soat (testlar uchun almashtiriladi), ms. */
  now?: () => number;
  /** QR PNG'lar katalogi (faqat /dev/qr uchun). */
  qrDir?: string;
  logger?: boolean;
}

const IMMUTABLE = 'public, max-age=31536000, immutable';
/** QR: `uhub:p/<project_number>/<part_uid>/<snapshot>`. uid'da `/` bo'lishi mumkin (snapshot'da yo'q). */
const QR_RE = /^uhub:p\/(\d+)\/(.+)\/([^/]+)$/;
/** TODO(contract-1.2): `ar-link` muddati 10 daqiqa (qoralama 4). */
export const AR_LINK_TTL_MS = 10 * 60 * 1000;
const AR_FORMATS = ['usdz', 'glb'] as const;
type ArFormat = (typeof AR_FORMATS)[number];

/** Kontrakt 1.2 (4): xato tanasi har doim `{ error, message }`. TODO(contract-1.2): qoralamadan. */
const fail = (reply: FastifyReply, status: number, error: string, message: string) =>
  reply.code(status).send({ error, message });

const notFound = (reply: FastifyReply, what = 'Topilmadi') => fail(reply, 404, 'not_found', what);

export function buildApp(opts: AppOptions) {
  const { store } = opts;
  const now = opts.now ?? Date.now;
  const app = Fastify({ logger: opts.logger ?? false });
  const tokens = new Set<string>([opts.devToken]);

  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  const bearer = (req: FastifyRequest) => /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];

  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS') return;
    const url = req.url.split('?')[0]!;
    if (url === '/mobile/pair') return;
    // Imzolangan AR havolasi Bearer'siz ishlaydi (tashqi AR ilovalari sarlavha yubora olmaydi, kontrakt 1.2, 3).
    if (url.startsWith('/files/ar/')) return;
    if (!url.startsWith('/mobile/') && !url.startsWith('/files/')) return;
    const token = bearer(req);
    if (!token || !tokens.has(token)) return fail(reply, 401, 'unauthorized', 'Qurilma tokeni yaroqsiz');
  });

  const base = (req: FastifyRequest) => `${req.protocol}://${req.host}`;
  const glbUrl = (req: FastifyRequest, revisionId: string) => `${base(req)}/files/glb/${revisionId}.glb`;
  const own = (p: ProjectData) => p.company_id === store.company.id;
  const latest = (item: ItemData) => item.revisions[item.revisions.length - 1]!;
  const ownItems = () => store.projects.filter(own).flatMap((p) => p.items);

  const projectSummary = (p: ProjectData) => ({
    id: p.id,
    number: p.number,
    name: p.name,
    status: p.status,
    items_count: p.items.length,
    updated_at: p.updated_at,
    thumb_url: null, // TODO(contract): mock'da eskiz yo'q; null ruxsat etiladimi — 1.2 da ham [OCHIQ].
  });

  app.post<{ Body: { code?: unknown } | null }>('/mobile/pair', async (req, reply) => {
    if (req.body?.code !== opts.pairCode)
      return fail(reply, 401, 'invalid_code', 'Kod noto‘g‘ri yoki muddati o‘tgan');
    const token = randomBytes(24).toString('hex');
    tokens.add(token);
    // TODO(contract): `user` va `company` obyektlarining maydonlari — 1.2 da ham [OCHIQ].
    return { device_token: token, user: store.user, company: store.company };
  });

  app.get<{ Querystring: { updated_since?: string } }>('/mobile/projects', async (req, reply) => {
    let list = store.projects.filter(own);
    const since = req.query.updated_since;
    if (since !== undefined && since !== '') {
      const t = Date.parse(since);
      if (Number.isNaN(t)) return fail(reply, 400, 'bad_updated_since', 'updated_since ISO-8601 emas');
      list = list.filter((p) => Date.parse(p.updated_at) > t);
    }
    return list.map(projectSummary);
  });

  app.get<{ Params: { id: string } }>('/mobile/projects/:id', async (req, reply) => {
    const p = store.projects.find((x) => String(x.id) === req.params.id);
    // Boshqa kompaniya loyihasi — 404 (kontrakt 1.2, 4).
    if (!p || !own(p)) return notFound(reply, 'Loyiha topilmadi');
    return {
      ...projectSummary(p),
      items: p.items.map((it) => {
        const rev = latest(it);
        return {
          item_id: it.item_id,
          name: it.name,
          revision_id: rev.revision_id,
          revision_label: rev.revision_label,
          size_mm: it.size_mm,
          glb_url: glbUrl(req, rev.revision_id),
          usdz_url: null, // TODO(contract): USDZ V-1b da; null ruxsat etiladimi — 1.2 da ham [OCHIQ].
          thumb_url: null,
          approved: it.approved,
        };
      }),
    };
  });

  app.get<{ Querystring: { qr?: string } }>('/mobile/resolve', async (req, reply) => {
    const qr = req.query.qr ?? '';
    // TODO(contract): `uhub:` bilan boshlanmaydigan QR uchun status/kod — 1.2 da ham [OCHIQ]; 400 not_uhub.
    if (!qr.startsWith('uhub:')) return fail(reply, 400, 'not_uhub', 'Bu U-HUB etiketkasi emas');
    const m = QR_RE.exec(qr);
    if (!m) return notFound(reply, 'Etiketka topilmadi');
    const [, numStr, uid, snapshot] = m as unknown as [string, string, string, string];
    const project = store.projects.find((p) => p.number === Number(numStr));
    // Boshqa kompaniya etiketkasi ham 404 (kontrakt 1.2, 4: mavjudligi oshkor bo'lmaydi).
    if (!project || !own(project)) return notFound(reply, 'Etiketka topilmadi');
    for (const item of project.items) {
      const rev = item.revisions.find((r) => r.snapshot === snapshot);
      const part = rev?.parts.get(uid);
      if (!rev || !part) continue;
      const cur = latest(item);
      // TODO(contract): `is_latest=true` da `latest_*` (null yoki o'sha qiymatlar) — 1.2 da ham [OCHIQ]; o'sha qiymatlar.
      return {
        project_id: project.id,
        project_number: project.number,
        item_id: item.item_id,
        item_name: item.name,
        revision_id: rev.revision_id,
        revision_label: rev.revision_label,
        part_uid: uid,
        part_name: part.name,
        glb_url: glbUrl(req, rev.revision_id),
        is_latest: cur === rev,
        part_in_latest: cur.parts.has(uid),
        latest_revision_id: cur.revision_id,
        latest_revision_label: cur.revision_label,
        latest_glb_url: glbUrl(req, cur.revision_id),
      };
    }
    return notFound(reply, 'Etiketka topilmadi');
  });

  // ---------- AR imzolangan havola (kontrakt 1.2, 3–4) ----------

  const sign = (file: string, exp: number) =>
    createHmac('sha256', opts.signSecret).update(`${file}|${exp}`).digest('hex');

  // TODO(contract-1.2): so'rov tanasi `{item_id, revision_id, format}` — qoralamada [TASDIQ].
  app.post<{ Body: { item_id?: unknown; revision_id?: unknown; format?: unknown } | null }>(
    '/mobile/ar-link',
    async (req, reply) => {
      const { item_id, revision_id, format } = req.body ?? {};
      if (
        typeof item_id !== 'string' ||
        typeof revision_id !== 'string' ||
        !AR_FORMATS.includes(format as ArFormat)
      )
        return fail(reply, 400, 'bad_request', 'item_id, revision_id va format (usdz|glb) kerak');
      const rev: RevisionData | undefined = ownItems()
        .find((it) => it.item_id === item_id)
        ?.revisions.find((r) => r.revision_id === revision_id);
      if (!rev) return notFound(reply, 'Buyum yoki reviziya topilmadi');
      if (format === 'usdz') return notFound(reply, 'USDZ mock’da yo‘q (V-1b)');
      // AR varianti: animatsiyasiz, yopiq holat (M-A3). TODO(contract): kontraktda AR varianti yo'q — taklif.
      const file = `${revision_id}-ar.glb`;
      if (!opts.glbs[`${revision_id}-ar`]) return notFound(reply, 'AR varianti topilmadi');
      const exp = Math.floor((now() + AR_LINK_TTL_MS) / 1000);
      return {
        url: `${opts.publicUrl ?? base(req)}/files/ar/${file}?exp=${exp}&sig=${sign(file, exp)}`,
        expires_at: new Date(exp * 1000).toISOString(),
      };
    },
  );

  app.get<{ Params: { file: string }; Querystring: { exp?: string; sig?: string } }>(
    '/files/ar/:file',
    async (req, reply) => {
      const { file } = req.params;
      const exp = Number(req.query.exp);
      const sig = req.query.sig ?? '';
      const expected = sign(file, exp);
      const valid =
        Number.isFinite(exp) &&
        sig.length === expected.length &&
        timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      // Muddati o'tgan yoki imzo noto'g'ri — 404 (batch talabi).
      if (!valid || exp * 1000 <= now()) return notFound(reply, 'Havola yaroqsiz yoki muddati o‘tgan');
      const m = /^([a-z0-9-]+)\.glb$/.exec(file);
      const bytes = m ? opts.glbs[m[1]!] : undefined;
      if (!bytes) return notFound(reply);
      // model-viewer faylni fetch bilan oladi — CORS (Google demo serveri ham `*` qaytaradi).
      return reply
        .header('Content-Type', 'model/gltf-binary')
        .header('Access-Control-Allow-Origin', '*')
        .send(Buffer.from(bytes));
    },
  );

  // AR sahifasi (M-A3 tuzatishi): Chrome'ning o'zida WebXR AR, Google <model-viewer> bilan. Honor X9d'da Scene Viewer
  // (Google app) har qanday tashqi model bilan ochilmay qaytgan, Chrome WebXR esa ishlagan.
  // TODO(contract): bunday sahifa kontraktda yo'q — faqat mock; haqiqiy backend uchun taklif (M-A3 hisoboti).
  app.get<{ Querystring: { file?: string; title?: string } }>('/ar/launch', async (req, reply) => {
    const file = req.query.file ?? '';
    const title = (req.query.title ?? '').slice(0, 60);
    let fileUrl: URL;
    try {
      fileUrl = new URL(file);
    } catch {
      return notFound(reply, 'AR havolasi yo‘q');
    }
    // Faqat shu serverning imzolangan AR fayllari — ochiq yo'naltirgich bo'lmasin.
    const ownOrigin = new URL(opts.publicUrl ?? base(req)).host;
    if (
      fileUrl.protocol !== 'https:' ||
      fileUrl.host !== ownOrigin ||
      !fileUrl.pathname.startsWith('/files/ar/')
    )
      return notFound(reply, 'AR havolasi yaroqsiz');
    return reply.type('text/html; charset=utf-8').send(arLaunchPage(fileUrl.href, title));
  });

  app.delete('/mobile/device', async (req, reply) => {
    tokens.delete(bearer(req)!);
    // TODO(contract): javob tanasi — 1.2 da ham [OCHIQ]; 204 No Content.
    return reply.code(204).send();
  });

  app.get<{ Params: { file: string } }>('/files/glb/:file', async (req, reply) => {
    const m = /^([a-z0-9-]+)\.glb$/.exec(req.params.file);
    const bytes = m ? opts.glbs[m[1]!] : undefined;
    if (!bytes) return notFound(reply);
    return reply
      .header('Content-Type', 'model/gltf-binary')
      .header('Cache-Control', IMMUTABLE)
      .send(Buffer.from(bytes));
  });

  // Faqat mock: etiketka QR'larini ekrandan skanerlash uchun (token talab qilinmaydi).
  app.get('/dev/qr', async (_req, reply) => {
    const files = opts.qrDir ? await listPngs(opts.qrDir) : [];
    const html = files
      .map((f) => `<figure><img src="/dev/qr/${f}" width="320"><figcaption>${f}</figcaption></figure>`)
      .join('\n');
    return reply
      .type('text/html; charset=utf-8')
      .send(
        `<!doctype html><meta charset="utf-8"><title>QR</title><body style="background:#111214;color:#ccc;font-family:sans-serif">${html || "QR yo'q — npm run fixtures"}</body>`,
      );
  });

  app.get<{ Params: { '*': string } }>('/dev/qr/*', async (req, reply) => {
    const rel = req.params['*'];
    if (!opts.qrDir || !/^([a-z0-9-]+\/)?[a-z0-9-]+\.png$/.test(rel)) return notFound(reply);
    try {
      return reply.type('image/png').send(await readFile(path.join(opts.qrDir, rel)));
    } catch {
      return notFound(reply);
    }
  });

  return app;
}

async function listPngs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true });
    return entries
      .map((e) => e.replaceAll('\\', '/'))
      .filter((e) => e.endsWith('.png'))
      .sort();
  } catch {
    return [];
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Google <model-viewer> versiyasi (jsDelivr). Haqiqiy backend o'zida joylashtirishi kerak. */
export const MODEL_VIEWER_SRC =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';

/**
 * AR sahifasi: <model-viewer> WebXR. `ar-modes="webxr scene-viewer"` — avval Chrome WebXR, bo'lmasa Scene Viewer;
 * `ar-scale="fixed"` — kattalashtirish o'chiq (real o'lcham, kontrakt 7: ±1 %); `ar-placement="floor"`.
 */
function arLaunchPage(src: string, title: string): string {
  const name = esc(title || 'U-HUB');
  return `<!doctype html><html lang="uz"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AR — ${name}</title>
<script type="module" src="${MODEL_VIEWER_SRC}"></script>
<body style="margin:0;background:#111214;color:#E6E8EB;font-family:system-ui,sans-serif">
<model-viewer src="${esc(src)}" alt="${name}" ar ar-modes="webxr scene-viewer" ar-scale="fixed" ar-placement="floor" camera-controls style="width:100vw;height:100vh;background:#111214">
<div style="position:absolute;top:16px;left:16px;right:16px;font-size:16px;font-weight:600">${name}</div>
<button slot="ar-button" style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);padding:16px 28px;border:0;border-radius:12px;background:#3988FF;color:#fff;font-weight:700;font-size:16px">AR'da ochish</button>
<div slot="ar-failure" style="position:absolute;top:56px;left:16px;right:16px;padding:12px;background:#222428;border-radius:8px">AR ishga tushmadi: Chrome va Google Play Services for AR yangilanganini tekshiring.</div>
</model-viewer>
</body></html>`;
}
