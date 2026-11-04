// Mock mobil API — kontrakt uhub-mobile/1.3 (docs/contract/uhub-mobile-1.3.md), 4-bo'lim.
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
  /** Juftlash QR matni (kontrakt 4.1) — /dev/qr sahifasining tepasida. */
  pairQr?: string;
  /** Viewer bundle (`packages/viewer/dist/index.html`) — AR sahifasi `/ar/<imzo>` uchun (M-A5). Yo'q bo'lsa null. */
  viewerHtml?: () => Promise<string | null>;
  logger?: boolean;
}

/** Mock: muddati o'tgan / ishlatilgan juftlash kodi (410 pair_code_expired sinovi uchun). */
export const EXPIRED_PAIR_CODES = ['111111'];
/** Kontrakt 4: juftlashda ko'p urinish → 429. Mock: 1 daqiqada 5 tadan ko'p muvaffaqiyatsiz urinish (IP bo'yicha). */
export const PAIR_RATE = { windowMs: 60_000, maxFailures: 5 };

/** Kontrakt 4.1: juftlash QR matni. */
export const pairQrText = (server: string, code: string) =>
  `uhub-pair:1?server=${encodeURIComponent(server)}&code=${encodeURIComponent(code)}`;

const IMMUTABLE = 'public, max-age=31536000, immutable';
/** QR: `uhub:p/<project_number>/<part_uid>/<snapshot>`. uid'da `/` bo'lishi mumkin (snapshot'da yo'q). */
const QR_RE = /^uhub:p\/(\d+)\/(.+)\/([^/]+)$/;
/** Kontrakt 4: `ar-link` muddati 10 daqiqa. */
export const AR_LINK_TTL_MS = 10 * 60 * 1000;
const AR_FORMATS = ['usdz', 'glb'] as const;
type ArFormat = (typeof AR_FORMATS)[number];

/** Kontrakt 4: xato tanasi har doim `{ error, message }` (o'zbekcha `message`). */
const fail = (reply: FastifyReply, status: number, error: string, message: string) =>
  reply.code(status).send({ error, message });

const notFound = (reply: FastifyReply, what = 'Topilmadi') => fail(reply, 404, 'not_found', what);

export function buildApp(opts: AppOptions) {
  const { store } = opts;
  const now = opts.now ?? Date.now;
  const app = Fastify({ logger: opts.logger ?? false });
  const tokens = new Set<string>([opts.devToken]);
  /** Kontrakt 4: uzilgan qurilma tokeni → `401 token_revoked` (noma'lum token — `token_invalid`). */
  const revoked = new Set<string>();
  /** IP → muvaffaqiyatsiz juftlash urinishlari vaqtlari. */
  const pairFailures = new Map<string, number[]>();

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
    if (token && revoked.has(token)) {
      // Kontrakt 4: takroriy DELETE /mobile/device ham 204.
      if (req.method === 'DELETE' && url === '/mobile/device') return reply.code(204).send();
      return fail(reply, 401, 'token_revoked', 'Qurilma uzilgan. Qayta ulang.');
    }
    if (!token || !tokens.has(token)) return fail(reply, 401, 'token_invalid', 'Qurilma tokeni yaroqsiz');
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
    thumb_url: null, // kontrakt 4: null bo'la oladi (mock'da eskiz yo'q)
  });

  app.post<{ Body: { code?: unknown } | null }>('/mobile/pair', async (req, reply) => {
    const t = now();
    const recent = (pairFailures.get(req.ip) ?? []).filter((x) => t - x < PAIR_RATE.windowMs);
    if (recent.length >= PAIR_RATE.maxFailures)
      return fail(reply, 429, 'rate_limited', 'Juda ko‘p urinish. Bir daqiqadan keyin qayta urinib ko‘ring.');
    const code = req.body?.code;
    if (code !== opts.pairCode) {
      pairFailures.set(req.ip, [...recent, t]);
      if (typeof code === 'string' && EXPIRED_PAIR_CODES.includes(code))
        return fail(
          reply,
          410,
          'pair_code_expired',
          'Kod muddati o‘tgan yoki ishlatilgan. Desktopda yangi kod oling.',
        );
      // TODO(contract): noto'g'ri juftlash kodi uchun `error` kodi kontraktda yo'q (4-bo'lim jadvali) — `invalid_code`.
      return fail(reply, 401, 'invalid_code', 'Kod noto‘g‘ri.');
    }
    const token = randomBytes(24).toString('hex');
    tokens.add(token);
    return { device_token: token, user: store.user, company: store.company };
  });

  app.get<{ Querystring: { updated_since?: string } }>('/mobile/projects', async (req, reply) => {
    let list = store.projects.filter(own);
    const since = req.query.updated_since;
    if (since !== undefined && since !== '') {
      const t = Date.parse(since);
      if (Number.isNaN(t)) return fail(reply, 400, 'bad_request', 'updated_since ISO-8601 emas');
      list = list.filter((p) => Date.parse(p.updated_at) > t);
    }
    return list.map(projectSummary);
  });

  app.get<{ Params: { id: string } }>('/mobile/projects/:id', async (req, reply) => {
    const p = store.projects.find((x) => String(x.id) === req.params.id);
    // Boshqa kompaniya loyihasi — 404 (kontrakt 4).
    if (!p || !own(p)) return notFound(reply, 'Loyiha topilmadi');
    return {
      id: p.id,
      number: p.number,
      name: p.name,
      status: p.status,
      updated_at: p.updated_at,
      items: p.items.map((it) => {
        const rev = latest(it);
        return {
          item_id: it.item_id,
          name: it.name,
          revision_id: rev.revision_id,
          revision_label: rev.revision_label,
          approved: it.approved,
          size_mm: it.size_mm,
          export_status: it.export_status,
          // Kontrakt 4: glb_url faqat export_status ≠ ready bo'lsa null.
          glb_url: it.export_status === 'ready' ? glbUrl(req, rev.revision_id) : null,
          usdz_url: null, // V-1b gacha doim null
          thumb_url: null,
        };
      }),
    };
  });

  app.get<{ Querystring: { qr?: string } }>('/mobile/resolve', async (req, reply) => {
    const qr = req.query.qr ?? '';
    // Kontrakt 4: `uhub:` bo'lmagan QR'ni ilova yubormaydi; kelsa — oddiy noto'g'ri parametr.
    if (!qr.startsWith('uhub:')) return fail(reply, 400, 'bad_request', 'Bu U-HUB etiketkasi emas');
    const m = QR_RE.exec(qr);
    if (!m) return fail(reply, 400, 'bad_qr', 'Etiketka o‘qilmadi');
    const [, numStr, uid, snapshot] = m as unknown as [string, string, string, string];
    const project = store.projects.find((p) => p.number === Number(numStr));
    // Boshqa kompaniya etiketkasi ham 404 (kontrakt 4: mavjudligi oshkor bo'lmaydi).
    if (!project || !own(project)) return notFound(reply, 'Bu detal topilmadi');
    for (const item of project.items) {
      const rev = item.revisions.find((r) => r.snapshot === snapshot);
      const part = rev?.parts.get(uid);
      if (!rev || !part) continue;
      const cur = latest(item);
      // Kontrakt 4: latest_* doim to'ldiriladi; is_latest=true bo'lsa o'sha qiymatlar.
      return {
        project_id: project.id,
        project_number: project.number,
        item_id: item.item_id,
        item_name: item.name,
        revision_id: rev.revision_id,
        revision_label: rev.revision_label,
        approved: item.approved,
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
    return notFound(reply, 'Bu detal topilmadi');
  });

  // ---------- AR imzolangan havola (kontrakt 1.2, 3–4) ----------

  const sign = (file: string, exp: number) =>
    createHmac('sha256', opts.signSecret).update(`${file}|${exp}`).digest('hex');

  // Kontrakt 4: so'rov tanasi `{item_id, revision_id, format: "glb"|"usdz"}`.
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
      if (!opts.glbs[revision_id]) return notFound(reply, 'Reviziya GLB’i topilmadi');
      const exp = Math.floor((now() + AR_LINK_TTL_MS) / 1000);
      const pub = opts.publicUrl ?? base(req);
      // `url` — statik ko'ruvchilar uchun AR varianti (animatsiyasiz, M-A3); bo'lmasa asosiy GLB.
      // TODO(contract): kontraktda AR varianti yo'q — taklif (1.4, 4-band).
      const file = opts.glbs[`${revision_id}-ar`] ? `${revision_id}-ar.glb` : `${revision_id}.glb`;
      return {
        url: `${pub}/files/ar/${file}?exp=${exp}&sig=${sign(file, exp)}`,
        expires_at: new Date(exp * 1000).toISOString(),
        // M-A5: AR sahifasi — viewer bundle `mode: "ar"`, asosiy GLB (kliplar bilan).
        // TODO(contract): `launch_url` kontraktda yo'q — 1.4 taklifi 6-bo'lim.
        launch_url: `${pub}/ar/${revision_id}.${exp}.${sign(`launch:${revision_id}`, exp)}`,
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

  // AR sahifasi (M-A5): viewer bundle'ining o'zi, ichida `uhub-config` (`mode: "ar"`, asosiy GLB'ning imzolangan URL'i,
  // sarlavha). Kontrakt 8-bo'limdagi `/s/<token>` bilan bir mexanizm. Tokensiz, imzo bilan cheklangan.
  app.get<{ Params: { token: string } }>('/ar/:token', async (req, reply) => {
    const m = /^([a-z0-9-]+)\.(\d+)\.([0-9a-f]{64})$/.exec(req.params.token);
    if (!m) return notFound(reply, 'AR havolasi yaroqsiz');
    const [, revisionId, expText, sig] = m as unknown as [string, string, string, string];
    const exp = Number(expText);
    const expected = sign(`launch:${revisionId}`, exp);
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) || exp * 1000 <= now())
      return notFound(reply, 'Havola yaroqsiz yoki muddati o‘tgan');
    const item = ownItems().find((it) => it.revisions.some((r) => r.revision_id === revisionId));
    if (!item || !opts.glbs[revisionId]) return notFound(reply);
    const html = (await opts.viewerHtml?.()) ?? null;
    if (!html)
      return fail(reply, 503, 'viewer_missing', 'Viewer bundle yo‘q: npm run build -w @hub-mobile/viewer');
    const file = `${revisionId}.glb`;
    const config = {
      glb_url: `${opts.publicUrl ?? base(req)}/files/ar/${file}?exp=${exp}&sig=${sign(file, exp)}`,
      title: item.name.slice(0, 60),
      mode: 'ar',
    };
    return reply.type('text/html; charset=utf-8').send(injectConfig(html, config));
  });

  // Eski AR sahifasi (M-A3, zaxira): Chrome'ning o'zida WebXR AR, Google <model-viewer> bilan, statik.
  // Ilova endi `launch_url` ni ochadi (M-A5); bu sahifa taqqoslash uchun qoldirildi. Honor X9d'da Scene Viewer
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
    // Kontrakt 4: 204, tanasiz; keyin token → 401 token_revoked (takroriy chaqiruv ham 204 — onRequest).
    const token = bearer(req)!;
    tokens.delete(token);
    revoked.add(token);
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
    const files = (opts.qrDir ? await listPngs(opts.qrDir) : []).filter((f) => f !== 'pair.png');
    // Juftlash QR'i (kontrakt 4.1) — birinchi: ilovada "QR bilan ulash".
    const pair = opts.pairQr
      ? `<figure style="border:2px solid #3988FF;padding:12px;display:inline-block"><img src="/dev/qr/pair.png" width="360">` +
        `<figcaption><b>Juftlash QR</b><br><code>${esc(opts.pairQr)}</code></figcaption></figure><hr>`
      : '';
    const html =
      pair +
      files
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

/** Kontrakt 8: `<script id="uhub-config" type="application/json">` — `</head>` oldiga; `<` qochiriladi. */
export function injectConfig(html: string, config: object): string {
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  const tag = `<script id="uhub-config" type="application/json">${json}</script>`;
  return html.includes('</head>') ? html.replace('</head>', () => `${tag}</head>`) : tag + html;
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
