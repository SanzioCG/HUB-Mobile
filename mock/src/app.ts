// Mock mobil API — kontrakt uhub-mobile/1.1, 4-bo'lim.
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import type { ItemData, ProjectData, Store } from './data.js';

export interface AppOptions {
  store: Store;
  devToken: string;
  pairCode: string;
  /** revision_id → GLB baytlari. */
  glbs: Record<string, Uint8Array>;
  /** QR PNG'lar katalogi (faqat /dev/qr uchun). */
  qrDir?: string;
  logger?: boolean;
}

const IMMUTABLE = 'public, max-age=31536000, immutable';
const QR_RE = /^uhub:p\/(\d+)\/([^/]+)\/([^/]+)$/;

/** TODO(contract): xato javobining tanasi kontraktda yo'q; `{ error: "<kod>" }` deb olindi. */
const fail = (reply: FastifyReply, status: number, error: string) => reply.code(status).send({ error });

export function buildApp(opts: AppOptions) {
  const { store } = opts;
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
    if (!url.startsWith('/mobile/') && !url.startsWith('/files/')) return;
    const token = bearer(req);
    if (!token || !tokens.has(token)) return fail(reply, 401, 'unauthorized');
  });

  const base = (req: FastifyRequest) => `${req.protocol}://${req.host}`;
  const glbUrl = (req: FastifyRequest, revisionId: string) => `${base(req)}/files/glb/${revisionId}.glb`;
  const own = (p: ProjectData) => p.company_id === store.company.id;
  const latest = (item: ItemData) => item.revisions[item.revisions.length - 1]!;

  const projectSummary = (p: ProjectData) => ({
    id: p.id,
    number: p.number,
    name: p.name,
    status: p.status,
    items_count: p.items.length,
    updated_at: p.updated_at,
    thumb_url: null, // TODO(contract): mock'da eskiz yo'q; null ruxsat etiladimi — kontraktda yo'q.
  });

  app.post<{ Body: { code?: unknown } | null }>('/mobile/pair', async (req, reply) => {
    if (req.body?.code !== opts.pairCode) return fail(reply, 401, 'invalid_code');
    const token = randomBytes(24).toString('hex');
    tokens.add(token);
    // TODO(contract): `user` va `company` obyektlarining maydonlari kontraktda yo'q.
    return { device_token: token, user: store.user, company: store.company };
  });

  app.get<{ Querystring: { updated_since?: string } }>('/mobile/projects', async (req, reply) => {
    let list = store.projects.filter(own);
    const since = req.query.updated_since;
    if (since !== undefined && since !== '') {
      const t = Date.parse(since);
      if (Number.isNaN(t)) return fail(reply, 400, 'bad_updated_since');
      list = list.filter((p) => Date.parse(p.updated_at) > t);
    }
    return list.map(projectSummary);
  });

  app.get<{ Params: { id: string } }>('/mobile/projects/:id', async (req, reply) => {
    const p = store.projects.find((x) => String(x.id) === req.params.id);
    // Boshqa kompaniya loyihasi ham 404 — mavjudligini oshkor qilmaslik uchun.
    if (!p || !own(p)) return fail(reply, 404, 'not_found');
    return {
      ...projectSummary(p),
      items: p.items.map((it) => {
        const rev = latest(it);
        return {
          item_id: it.item_id,
          name: it.name,
          revision_id: rev.revision_id,
          size_mm: it.size_mm,
          glb_url: glbUrl(req, rev.revision_id),
          usdz_url: null, // TODO(contract): USDZ V-1b da; hozircha null.
          thumb_url: null,
          approved: rev.approved,
        };
      }),
    };
  });

  app.get<{ Querystring: { qr?: string } }>('/mobile/resolve', async (req, reply) => {
    const qr = req.query.qr ?? '';
    // TODO(contract): `uhub:` bilan boshlanmaydigan QR uchun 400 va uning kodi kontraktda yo'q (batch talabi).
    if (!qr.startsWith('uhub:')) return fail(reply, 400, 'not_uhub');
    const m = QR_RE.exec(qr);
    if (!m) return fail(reply, 404, 'not_found');
    const [, numStr, uid, snapshot] = m as unknown as [string, string, string, string];
    const project = store.projects.find((p) => p.number === Number(numStr));
    if (!project) return fail(reply, 404, 'not_found');
    if (!own(project)) return fail(reply, 403, 'other_company');
    for (const item of project.items) {
      const rev = item.revisions.find((r) => r.snapshot === snapshot);
      const part = rev?.parts.get(uid);
      if (!rev || !part) continue;
      const cur = latest(item);
      const isLatest = cur === rev;
      // TODO(contract): `is_latest=true` bo'lganda `latest_*` qiymati kontraktda yo'q; joriy reviziya qaytariladi.
      const inLatest = isLatest || cur.parts.has(uid);
      return {
        project_id: project.id,
        project_number: project.number,
        item_id: item.item_id,
        item_name: item.name,
        revision_id: rev.revision_id,
        part_uid: uid,
        part_name: part.name,
        glb_url: glbUrl(req, rev.revision_id),
        is_latest: isLatest,
        latest_revision_id: inLatest ? cur.revision_id : null,
        latest_glb_url: inLatest ? glbUrl(req, cur.revision_id) : null,
      };
    }
    return fail(reply, 404, 'not_found');
  });

  app.delete('/mobile/device', async (req, reply) => {
    tokens.delete(bearer(req)!);
    // TODO(contract): javob tanasi kontraktda yo'q; 204 No Content.
    return reply.code(204).send();
  });

  app.get<{ Params: { file: string } }>('/files/glb/:file', async (req, reply) => {
    const m = /^([a-z0-9-]+)\.glb$/.exec(req.params.file);
    const bytes = m ? opts.glbs[m[1]!] : undefined;
    if (!bytes) return fail(reply, 404, 'not_found');
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
    if (!opts.qrDir || !/^([a-z0-9-]+\/)?[a-z0-9-]+\.png$/.test(rel)) return fail(reply, 404, 'not_found');
    try {
      return reply.type('image/png').send(await readFile(path.join(opts.qrDir, rel)));
    } catch {
      return fail(reply, 404, 'not_found');
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
