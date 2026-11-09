import {
  Box3,
  Color,
  DirectionalLight,
  type Material,
  type Mesh,
  Mesh as ThreeMesh,
  NeutralToneMapping,
  type Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  ShadowMaterial,
  Sphere,
  SRGBColorSpace,
  type Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  Group,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type {
  Bridge,
  DimensionLine,
  ErrorCode,
  GroupName,
  HostMessage,
  LoadedItem,
  ViewMode,
  ViewName,
} from './bridge.js';
import { ArSession, type ArCallbacks } from './ar.js';
import { ClipPlayer } from './clips.js';
import { buildDims, disposeDims } from './dims.js';
import { RevealIndex } from './sequence.js';
import { fetchBytes } from './fetch-bytes.js';
import { Look } from './look.js';
import {
  bendsOf,
  doorInfo,
  findItemNode,
  findPartAncestor,
  indexParts,
  openableClipNames,
  ownClipName,
  partExtras,
  partMaterialInfo,
  revealParts,
  revealPlan,
  selectionTarget,
} from './model.js';
import { BG, FOCUS_DURATION_S } from './theme.js';
import { VIEWER_CONTRACT, isContractCompatible } from './version.js';
import { IDENTITY, applyTransform, qualify, type ItemTransform } from './project.js';
import { buildZoneMeshes, computeZones, disposeZones } from './zones.js';

/** O'ng panel ko'rinishlari (kamera yo'nalishi, kontrakt o'qlari: Y yuqoriga, +Z old). */
const VIEW_DIRS: Record<ViewName, Vector3> = {
  front: new Vector3(0, 0, 1),
  side: new Vector3(1, 0, 0),
  top: new Vector3(0, 1, 0.0001),
  iso: new Vector3(0.55, 0.45, 1).normalize(),
};

/** Buyum ildizidagi kalit (loyiha rejimida klip nomlari shu bilan, `project.ts` → `qualify`). */
const ITEM_KEY = 'uhubItemKey';
const itemKeyOf = (o: Object3D | null): string => {
  for (let n = o; n; n = n.parent) {
    const k = (n.userData as Record<string, unknown>)[ITEM_KEY];
    if (typeof k === 'string') return k;
  }
  return '';
};

/** Tugun va uning hamma ota tugunlari ko'rinadimi. */
const isShown = (o: Object3D): boolean => {
  for (let n: Object3D | null = o; n; n = n.parent) if (!n.visible) return false;
  return true;
};

/** Detalning eshik/tortma klipi (loyiha rejimida buyum kaliti bilan), faqat GLB'da mavjud bo'lsa. */
const ownClip = (part: Object3D, clips: ClipPlayer) => {
  const name = ownClipName(part);
  const q = name ? qualify(itemKeyOf(part), name) : null;
  return q && clips.has(q) ? q : null;
};

/** GLB manbasi: URL (token bilan) yoki tayyor baytlar (`.uhub` dan). */
export type GlbSource = { url: string; token: string } | { bytes: ArrayBuffer };

export interface ItemSource {
  /** Bitta buyum — '' (klip nomlari o'zgarmaydi); loyihada — `<item_key>`. */
  key: string;
  source: GlbSource;
  transform: ItemTransform;
}

/** Bitta buyum sahnada. */
interface ItemModel {
  key: string;
  gltf: GLTF;
  root: Object3D;
  /** Loyiha ramkasidagi joy (`transform`); bitta buyumda — identik. */
  holder: Group;
  /** Ochilish zonalari (M-A5, 1b) — buyum ildiziga emas, alohida (o'sha `transform` bilan) `anchor` da. */
  zones: Group;
  /** Buyum ildizi fazosida pol (bounding box min Y). */
  floorY: number;
  dims: Group | null;
  item: LoadedItem;
}

interface Loaded {
  /** Qayta yuklamaslik kaliti (URL yoki loyiha manbalari). */
  url: string;
  items: ItemModel[];
  /** Hamma buyumlar (`holder` lar) — sig'dirish, tanlov va ko'rinish rejimlari shu bo'yicha. */
  container: Group;
  parts: Map<string, Object3D>;
  clips: ClipPlayer;
  /** Kontrakt 1.6 / 1.10 (2.2): ichki tortma va pantograf tartibi — `reveal` dan. */
  reveal: RevealIndex;
  look: Look;
  /** AR: birinchi buyumning poli (fayldan AR yo'q — server rejimida doim bitta buyum). */
  floorY: number;
  item: LoadedItem;
  /** `load` boshidan `loaded` gacha (ms). */
  loadMs: number;
  /** Teksturalar hajmi (RGBA, MB) — stats uchun. */
  texturesMb: number;
}

interface CameraTween {
  fromPos: Vector3;
  toPos: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  t: number;
  duration: number;
}

const HOME_DIR = new Vector3(0.55, 0.45, 1).normalize();
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Viewer {
  private readonly renderer: WebGLRenderer;
  private readonly labels: CSS2DRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(40, 1, 0.01, 100);
  private readonly controls: OrbitControls;
  private readonly loader = new GLTFLoader();
  private readonly raycaster = new Raycaster();
  /** Buyum, zonalar, soya tekisligi va yorug'lik. 3D'da o'zgarmas; AR'da faqat u joylashtiriladi (masshtabsiz). */
  private readonly anchor = new Group();
  private readonly sun = new DirectionalLight(0xffffff, 1.5);
  private readonly floor = new ThreeMesh(new PlaneGeometry(6, 6), new ShadowMaterial({ opacity: 0.25 }));
  private ar: ArSession | null = null;
  private helpersOn = false;
  private model: Loaded | null = null;
  private loadSeq = 0;
  /** Har yangi `select`/`showAll` oldingi ketma-ketlikni bekor qiladi. */
  private selectSeq = 0;
  private tween: CameraTween | null = null;
  private home = { pos: new Vector3(1, 1, 2), target: new Vector3() };
  private dimsOn = false;
  private mode: ViewMode = 'solid';
  private last = performance.now();
  /** stats: kadrlar soni va oxirgi hisobot vaqti. */
  private frames = 0;
  private statsAt = performance.now();

  constructor(
    private readonly container: HTMLElement,
    private readonly bridge: Bridge,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Integratsiya hujjati 4: sRGB chiqish, Neutral tone mapping, ekspozitsiya 1.0, soyalar.
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels';
    container.appendChild(this.labels.domElement);

    this.scene.background = new Color(BG);
    // RoomEnvironment (PMREM) — LDSP/MDF/metall desktop U-HUB'dagiga yaqin ko'rinadi.
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    // Bitta yo'naltirilgan yorug'lik soya bilan + polda soya qabul qiluvchi tekislik — ikkalasi `anchor` ichida
    // (AR'da buyum bilan birga ko'chadi).
    const sun = this.sun;
    sun.position.set(1.5, 3, 2.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -1.5;
    sc.right = sc.top = 1.5;
    sc.near = 0.5;
    sc.far = 8;
    const floor = this.floor;
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.raycast = () => {};
    this.anchor.add(sun, sun.target, floor);
    this.scene.add(this.anchor);

    // Bir barmoq — aylantirish, ikki barmoq — yaqinlashtirish/surish (OrbitControls standarti).
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener('start', () => (this.tween = null));

    this.installTapHandling(this.renderer.domElement);
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop((_t, xrFrame) => this.frame(xrFrame));
  }

  handle(msg: HostMessage): void {
    if (msg.type === 'load') {
      void this.load(msg.glbUrl, msg.token);
      return;
    }
    if (msg.type === 'loadProject') {
      // Kontrakt 1.6 (10.4): "Butun loyiha" — hamma buyum `transform` bo'yicha bitta sahnada.
      void this.loadSources(
        `project:${msg.items.map((i) => i.glbUrl).join('|')}`,
        msg.items.map((i) => ({
          key: i.key,
          source: { url: i.glbUrl, token: msg.token },
          transform: i.transform ?? IDENTITY,
        })),
      );
      return;
    }
    if (msg.type === 'resetView') return this.resetView();
    const m = this.model;
    if (!m) return this.error('not_loaded', `${msg.type}: model yuklanmagan`);
    switch (msg.type) {
      case 'select':
        void this.selectByUid(m, msg.uid);
        break;
      case 'showAll':
        this.showAll(m);
        break;
      case 'openAll':
        void m.clips.run(m.reveal.planAll(1, (c) => m.clips.isOpen(c)));
        break;
      case 'closeAll':
        void m.clips.run(m.reveal.planAll(-1, (c) => m.clips.isOpen(c)));
        break;
      case 'toggle':
        if (!m.clips.has(msg.clip)) return this.error('clip_not_found', `klip topilmadi: ${msg.clip}`);
        void m.clips.run(m.reveal.toggle(msg.clip, (c) => m.clips.isOpen(c)));
        break;
      case 'setMode':
        this.mode = msg.mode;
        m.look.mode = msg.mode;
        m.look.apply();
        break;
      case 'setDims':
        this.dimsOn = msg.on;
        for (const it of m.items) if (it.dims) it.dims.visible = msg.on;
        break;
      case 'deselect':
        this.selectSeq++;
        m.look.selected = null;
        m.look.ghost = false;
        m.look.apply();
        break;
      case 'setView':
        this.setView(m.container, msg.view);
        break;
      case 'fit':
        this.fit(m.container, null);
        break;
      case 'setGroupVisible':
        this.setGroupVisible(m.container, msg.group, msg.on);
        break;
      case 'setHelpers':
        this.helpersOn = msg.on;
        for (const it of m.items) it.zones.visible = msg.on;
        break;
    }
  }

  // ---------- yuklash ----------

  private load(url: string, token: string): Promise<void> {
    return this.loadSources(url, [{ key: '', source: { url, token }, transform: IDENTITY }]);
  }

  /**
   * Bir yoki bir nechta GLB (`.uhub` loyihasi). Bitta buyum — `key: ''`, klip nomlari o'zgarmaydi.
   * Brauzer viewer'i `.uhub` dan baytlar bilan chaqiradi (`GlbSource.bytes`).
   */
  async loadSources(cacheKey: string, sources: readonly ItemSource[]): Promise<void> {
    // Kontrakt 6.6: o'sha buyum bo'lsa qayta yuklanmaydi.
    if (this.model?.url === cacheKey) {
      this.postLoaded(this.model);
      return;
    }
    const seq = ++this.loadSeq;
    const t0 = performance.now();
    const gltfs: GLTF[] = [];
    try {
      // Progress xabari ko'pi bilan har 100 ms da (va oxirida) — RN ko'prigini to'ldirmaslik uchun.
      let last = 0;
      const loaded = sources.map(() => 0);
      const totals: (number | null)[] = sources.map(() => null);
      const report = () => {
        const now = performance.now();
        const sum = loaded.reduce((a, b) => a + b, 0);
        const total = totals.every((t) => t !== null) ? totals.reduce((a, b) => a! + b!, 0) : null;
        if (seq !== this.loadSeq || (now - last < 100 && sum !== total)) return;
        last = now;
        this.bridge.post({ type: 'progress', loaded: sum, total });
      };
      const buffers = await Promise.all(
        sources.map((s, i) =>
          'bytes' in s.source
            ? Promise.resolve(s.source.bytes)
            : fetchBytes(s.source.url, s.source.token, (l, t) => {
                loaded[i] = l;
                totals[i] = t;
                report();
              }),
        ),
      );
      for (const b of buffers) gltfs.push(await this.loader.parseAsync(b, ''));
    } catch (e) {
      if (seq === this.loadSeq) this.error('load_failed', `${cacheKey}: ${(e as Error).message}`);
      return;
    }
    if (seq !== this.loadSeq) return;
    // Kontrakt 8: GLB kontrakt major'i mos kelmasa — xabar, model ko'rsatilmaydi (1.x hammasi qabul qilinadi).
    for (const gltf of gltfs) {
      const glbContract = (gltf.parser.json as { asset?: { extras?: { uhub?: { contract?: unknown } } } })
        .asset?.extras?.uhub?.contract;
      if (!isContractCompatible(glbContract)) {
        this.error('contract_mismatch', `GLB kontrakti ${String(glbContract)}, viewer ${VIEWER_CONTRACT}`);
        return;
      }
    }
    this.unload();

    let texturesMb = 0;
    const seenTex = new Set<Texture>();
    const container = new Group();
    container.name = 'viewer_items';
    const items: ItemModel[] = sources.map((src, i) => {
      const gltf = gltfs[i]!;
      const root = gltf.scene;
      (root.userData as Record<string, unknown>)[ITEM_KEY] = src.key;
      root.traverse((o) => {
        // Kontrakt 1.7/1.8 (2.6): "Teshiklar" qatlami standart o'chiq — `holes__<uid>` guruhlari yashirin
        // (qatlam tugmasi va teshik kartasi — A-1v).
        if (o.name.startsWith('holes__')) o.visible = false;
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        for (const mat of ([] as Material[]).concat(mesh.material)) {
          const tex = (mat as { map?: Texture | null }).map;
          const img = tex?.image as { width?: number; height?: number } | undefined;
          if (tex && !seenTex.has(tex) && img?.width && img.height) {
            seenTex.add(tex);
            texturesMb += (img.width * img.height * 4) / (1024 * 1024);
          }
        }
      });
      // Zonalar kliplar ijrochisidan oldin: klip namunalari pozani o'zgartirib, yopiq holatga qaytaradi.
      const zoneList = computeZones(root, gltf.animations);
      const floorY = new Box3().setFromObject(root).min.y;
      const zones = new Group();
      zones.add(buildZoneMeshes(zoneList, floorY));
      applyTransform(zones, src.transform);
      zones.visible = this.helpersOn;
      this.anchor.add(zones);
      const holder = new Group();
      applyTransform(holder, src.transform);
      holder.add(root);
      container.add(holder);

      const itemNode = findItemNode(root);
      const itemExtras = (itemNode?.userData as { uhub?: { dimensions?: LoadedItem['dimensions'] } })?.uhub;
      const lines: DimensionLine[] = itemExtras?.dimensions?.lines ?? [];
      const dims = itemNode && lines.length ? buildDims(itemNode, lines) : null;
      if (dims) dims.visible = this.dimsOn;
      const item: LoadedItem = {
        node: itemNode?.name ?? '',
        meta: ((gltf.parser.json as { asset?: { extras?: { uhub?: Record<string, unknown> } } }).asset?.extras
          ?.uhub ?? null) as Record<string, unknown> | null,
        dimensions: itemExtras?.dimensions ?? null,
        clips: openableClipNames(gltf.animations).map((c) => qualify(src.key, c)),
      };
      return { key: src.key, gltf, root, holder, zones, floorY, dims, item };
    });
    this.floor.position.y = Math.min(...items.map((it) => it.floorY));
    this.anchor.add(container);

    const clips = new ClipPlayer(
      items.map((it) => ({ root: it.root, clips: it.gltf.animations, prefix: it.key })),
    );
    const parts = new Map<string, Object3D>();
    for (const it of items)
      for (const [uid, node] of indexParts(it.root)) if (!parts.has(uid)) parts.set(uid, node);
    clips.onChange = (open) => this.bridge.post({ type: 'clipState', open });
    const look = new Look(container);
    look.mode = this.mode;
    look.apply();

    const first = items[0]!;
    this.model = {
      url: cacheKey,
      items,
      container,
      parts,
      // 1.10: pantograf tuguni — uning `reveal` i (eshiklar) furnitura detallaridan ustun.
      reveal: new RevealIndex(
        revealParts(items, (c) => clips.has(c)),
        clips.names,
      ),
      clips,
      look,
      floorY: first.floorY,
      // Loyiha rejimida `clips` — hamma buyumniki (kalit bilan).
      item: { ...first.item, clips: items.flatMap((it) => it.item.clips) },
      loadMs: Math.round(performance.now() - t0),
      texturesMb,
    };
    this.fitHome(container);
    this.postLoaded(this.model);
  }

  private postLoaded(m: Loaded): void {
    const parts = [...m.parts.values()].map((o) => partExtras(o)!);
    this.bridge.post({
      type: 'loaded',
      item: m.item,
      parts,
      ...(m.items.length > 1 || m.items[0]!.key
        ? { items: m.items.map((it) => ({ key: it.key, ...it.item })) }
        : {}),
    });
  }

  private unload(): void {
    const m = this.model;
    if (!m) return;
    this.selectSeq++;
    m.clips.dispose();
    m.look.dispose();
    for (const it of m.items) {
      if (it.dims) disposeDims(it.dims);
      disposeZones(it.zones);
      it.root.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
    }
    m.container.removeFromParent();
    this.model = null;
  }

  // ---------- tanlash ----------

  /** Kontrakt 6-bo'lim, 4-qadam: reveal kliplari ketma-ket, qolganlar shaffof, kontur, kamera. */
  private async selectByUid(m: Loaded, uid: string): Promise<void> {
    const found = m.parts.get(uid);
    if (!found) return this.error('part_not_found', `Detal modelda topilmadi: ${uid}`);
    const node = selectionTarget(found, m.parts);
    const seq = ++this.selectSeq;
    const extras = partExtras(node)!;
    this.postSelected(m, node, extras);
    this.highlight(m, node);
    m.look.ghost = true;
    m.look.apply();

    const key = itemKeyOf(node);
    const plan = revealPlan(
      { ...extras, reveal: (extras.reveal ?? []).map((c) => qualify(key, c)) },
      new Set(m.clips.names),
    );
    const { missing } = plan;
    // 1.10: `reveal` dagi pantografdan oldin uning eshiklari (`extras.uhub.lift.reveal`) — ro'yxatda bo'lmasa ham.
    const clips = m.reveal.expand(plan.clips);
    if (missing.length) this.error('clip_not_found', `reveal kliplari topilmadi: ${missing.join(', ')}`);
    // Avvalgi tanlovdan ochiq qolgan, endi kerak bo'lmagan kliplar yopiladi.
    // Kontrakt 1.6 (2.2): avval ichki tortmalar, keyin eshiklar.
    const toClose = m.clips.names.filter((name) => m.clips.isOpen(name) && !clips.includes(name));
    if (toClose.length && !(await m.clips.run(m.reveal.planSet(toClose, -1), () => seq !== this.selectSeq)))
      return;
    const done = await m.clips.openSequence(clips, () => seq !== this.selectSeq);
    if (done) this.focus(node);
  }

  /** `selected`: eshik ma'lumoti pivot tugunidan, material — plita primitive'idan (kontrakt 2.1, 2.5). */
  private postSelected(m: Loaded, node: Object3D, extras: ReturnType<typeof partExtras> & object): void {
    this.bridge.post({
      type: 'selected',
      uid: extras.uid,
      extras,
      clip: ownClip(node, m.clips),
      door: doorInfo(node),
      material: partMaterialInfo(node),
    });
  }

  // ---------- o'ng panel: ko'rinish, sig'dirish, qatlamlar ----------

  private setView(root: Object3D, view: ViewName): void {
    this.fit(root, VIEW_DIRS[view]);
  }

  /** Modelni ekranga sig'dirish; `dir` — kamera yo'nalishi (null — joriy yo'nalish). */
  private fit(root: Object3D, dir: Vector3 | null): void {
    const box = new Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new Sphere());
    const d = dir ?? this.camera.position.clone().sub(this.controls.target).normalize();
    this.animateCamera(
      sphere.center.clone().addScaledVector(d, this.distanceFor(sphere.radius) * 1.15),
      sphere.center,
    );
  }

  /** Loyiha rejimida har buyumdagi `group__<group>`. */
  private setGroupVisible(root: Object3D, group: GroupName, on: boolean): void {
    root.traverse((o) => {
      if (o.name === `group__${group}`) o.visible = on;
    });
  }

  private showAll(m: Loaded): void {
    this.selectSeq++;
    m.look.selected = null;
    m.look.ghost = false;
    m.look.apply();
    void m.clips.run(m.reveal.planAll(-1, (c) => m.clips.isOpen(c)));
  }

  /** Bosish = tanlash. Eshik bosilganda ochilmaydi — faqat `selected`. */
  private tapSelect(x: number, y: number): void {
    const m = this.model;
    if (!m) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    // Yashirin (qatlam o'chiq, teshiklar) meshlar bosilmaydi — Raycaster ko'rinishni tekshirmaydi.
    const targets = m.look.meshList.filter((mesh) => !m.look.isGhosted(mesh) && isShown(mesh));
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    const found = findPartAncestor(hit?.object ?? null);
    // Bukilgan yon devorning yoyi — tekis detal tanlanadi (yoylari bilan birga).
    const part = found && selectionTarget(found, m.parts);
    if (!part) {
      if (!m.look.ghost && m.look.selected) {
        m.look.selected = null;
        m.look.apply();
        this.bridge.post({ type: 'deselected' });
      }
      return;
    }
    const extras = partExtras(part)!;
    this.highlight(m, part);
    m.look.apply();
    this.postSelected(m, part, extras);
  }

  /** Tanlangan detal va (bukilgan yon devor bo'lsa) uning yoylari ajratiladi. */
  private highlight(m: Loaded, node: Object3D): void {
    m.look.selected = node;
    const uid = partExtras(node)?.uid;
    m.look.also = uid ? bendsOf(uid, m.parts) : [];
  }

  private installTapHandling(el: HTMLElement): void {
    const TAP_MS = 300;
    const TAP_PX = 8;
    let down: { x: number; y: number; t: number; id: number } | null = null;
    let lastTap: { x: number; y: number; t: number } | null = null;
    let pointers = 0;
    el.addEventListener('pointerdown', (e) => {
      pointers++;
      down = pointers === 1 ? { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId } : null;
    });
    const up = (e: PointerEvent) => {
      pointers = Math.max(0, pointers - 1);
      const d = down;
      down = null;
      if (!d || d.id !== e.pointerId || e.type === 'pointercancel') return;
      if (e.timeStamp - d.t > TAP_MS || Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_PX) return;
      const isDouble =
        lastTap &&
        e.timeStamp - lastTap.t < TAP_MS &&
        Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
      if (isDouble) {
        lastTap = null;
        this.resetView();
        return;
      }
      lastTap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      this.tapSelect(e.clientX, e.clientY);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  // ---------- kamera ----------

  private fitHome(root: Object3D): void {
    const box = new Box3().setFromObject(root);
    const sphere = box.getBoundingSphere(new Sphere());
    const dist = this.distanceFor(sphere.radius) * 1.15;
    this.home = { target: sphere.center.clone(), pos: sphere.center.clone().addScaledVector(HOME_DIR, dist) };
    this.tween = null;
    this.camera.position.copy(this.home.pos);
    this.controls.target.copy(this.home.target);
    this.controls.update();
  }

  private distanceFor(radius: number): number {
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    return radius / Math.sin(Math.min(vfov, hfov) / 2);
  }

  private resetView(): void {
    this.animateCamera(this.home.pos, this.home.target);
  }

  /** Detal bounding box'iga yaqinlashish, joriy ko'rish yo'nalishi saqlanadi. */
  private focus(node: Object3D): void {
    const box = new Box3().setFromObject(node);
    if (box.isEmpty()) return;
    const center = box.getCenter(new Vector3());
    const radius = Math.max(box.getSize(new Vector3()).length() / 2, 0.05);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.animateCamera(center.clone().addScaledVector(dir, this.distanceFor(radius) * 1.3), center);
  }

  private animateCamera(pos: Vector3, target: Vector3): void {
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos: pos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      t: 0,
      duration: FOCUS_DURATION_S,
    };
  }

  // ---------- sikl ----------

  private resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
  }

  private frame(xrFrame?: XRFrame): void {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.model?.clips.update(dt);
    if (this.ar?.active && xrFrame) {
      // AR: kamera XR'dan; orbit, kamera tweeni va 2D yorliqlar ishlatilmaydi.
      this.ar.update(xrFrame);
      this.model?.look.update();
      this.renderer.render(this.scene, this.camera);
      this.reportStats(now);
      return;
    }
    const tw = this.tween;
    if (tw) {
      tw.t = Math.min(tw.t + dt / tw.duration, 1);
      const k = ease(tw.t);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
    this.model?.look.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
    this.reportStats(now);
  }

  /** Dev: ~2 s da bir `stats` (integratsiya hujjati 5.5 — ochilish vaqti, FPS, xotira). */
  private reportStats(now: number): void {
    this.frames++;
    const m = this.model;
    if (!m || now - this.statsAt < 2000) return;
    const fps = Math.round((this.frames * 1000) / (now - this.statsAt));
    this.frames = 0;
    this.statsAt = now;
    this.bridge.post({
      type: 'stats',
      load_ms: m.loadMs,
      fps,
      triangles: this.renderer.info.render.triangles,
      textures_mb: Math.round(m.texturesMb * 10) / 10,
    });
  }

  // ---------- AR (M-A5) ----------

  /**
   * AR sessiyasini boshlash (foydalanuvchi bosishi bilan). `overlay` — DOM overlay ildizi (tugmalar, yo'riqnoma).
   * Model yuklangan bo'lishi kerak; sessiya tugaganda 3D ko'rinish tiklanadi.
   */
  async startAr(overlay: HTMLElement, cb: ArCallbacks): Promise<string[]> {
    if (!this.model) throw new Error('model yuklanmagan');
    if (this.ar?.active) return this.ar.features;
    const restore = () => {
      this.controls.enabled = true;
      this.labels.domElement.style.display = '';
    };
    const ar = new ArSession(
      {
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        anchor: this.anchor,
        sun: this.sun,
        floorY: () => this.model?.floorY ?? 0,
      },
      overlay,
      {
        onState: cb.onState,
        onEnd: () => {
          restore();
          this.ar = null;
          this.resize();
          if (this.model) this.fitHome(this.model.container);
          cb.onEnd();
        },
      },
    );
    this.controls.enabled = false;
    this.labels.domElement.style.display = 'none';
    this.tween = null;
    this.ar = ar;
    try {
      await ar.start();
    } catch (e) {
      restore();
      this.ar = null;
      throw e;
    }
    return ar.features;
  }

  /** Dev sinov sahifasi: klipni `reveal` tartibisiz yolg'iz ijro etish (kontrakt 2.2). */
  rawToggle(clip: string): void {
    if (this.model?.clips.has(clip)) void this.model.clips.toggle(clip);
  }

  arReplace(): void {
    this.ar?.replace();
  }

  arExit(): void {
    this.ar?.end();
  }

  private error(code: ErrorCode, message: string): void {
    this.bridge.post({ type: 'error', code, message });
  }
}
