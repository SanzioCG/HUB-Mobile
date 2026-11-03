import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Mesh,
  type Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Group,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Bridge, DimensionLine, ErrorCode, HostMessage, LoadedItem, ViewMode } from './bridge.js';
import { ClipPlayer } from './clips.js';
import { buildDims, disposeDims } from './dims.js';
import { fetchBytes } from './fetch-bytes.js';
import { Look } from './look.js';
import {
  findItemNode,
  findPartAncestor,
  indexParts,
  openableClipNames,
  ownClipName,
  partExtras,
  revealPlan,
} from './model.js';
import { BG, FOCUS_DURATION_S } from './theme.js';

/** Detalning eshik/tortma klipi, faqat GLB'da mavjud bo'lsa. */
const ownClip = (part: Object3D, clips: ClipPlayer) => {
  const name = ownClipName(part);
  return name && clips.has(name) ? name : null;
};

interface Loaded {
  url: string;
  gltf: GLTF;
  root: Object3D;
  parts: Map<string, Object3D>;
  clips: ClipPlayer;
  look: Look;
  dims: Group | null;
  item: LoadedItem;
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
  private model: Loaded | null = null;
  private loadSeq = 0;
  /** Har yangi `select`/`showAll` oldingi ketma-ketlikni bekor qiladi. */
  private selectSeq = 0;
  private tween: CameraTween | null = null;
  private home = { pos: new Vector3(1, 1, 2), target: new Vector3() };
  private dimsOn = false;
  private mode: ViewMode = 'solid';
  private last = performance.now();

  constructor(
    private readonly container: HTMLElement,
    private readonly bridge: Bridge,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels';
    container.appendChild(this.labels.domElement);

    this.scene.background = new Color(BG);
    this.scene.add(new HemisphereLight(0xffffff, 0x2a2c30, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.8);
    sun.position.set(1.5, 3, 2.5);
    this.scene.add(sun);

    // Bir barmoq — aylantirish, ikki barmoq — yaqinlashtirish/surish (OrbitControls standarti).
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener('start', () => (this.tween = null));

    this.installTapHandling(this.renderer.domElement);
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  handle(msg: HostMessage): void {
    if (msg.type === 'load') {
      void this.load(msg.glbUrl, msg.token);
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
        void m.clips.playAll(1);
        break;
      case 'closeAll':
        void m.clips.playAll(-1);
        break;
      case 'toggle':
        if (!m.clips.has(msg.clip)) return this.error('clip_not_found', `klip topilmadi: ${msg.clip}`);
        void m.clips.toggle(msg.clip);
        break;
      case 'setMode':
        this.mode = msg.mode;
        m.look.mode = msg.mode;
        m.look.apply();
        break;
      case 'setDims':
        this.dimsOn = msg.on;
        if (m.dims) m.dims.visible = msg.on;
        break;
      case 'deselect':
        this.selectSeq++;
        m.look.selected = null;
        m.look.ghost = false;
        m.look.apply();
        break;
    }
  }

  // ---------- yuklash ----------

  private async load(url: string, token: string): Promise<void> {
    // Kontrakt 6.6: o'sha buyum bo'lsa qayta yuklanmaydi.
    if (this.model?.url === url) {
      this.postLoaded(this.model);
      return;
    }
    const seq = ++this.loadSeq;
    let gltf: GLTF;
    try {
      gltf = await this.loader.parseAsync(await fetchBytes(url, token), '');
    } catch (e) {
      if (seq === this.loadSeq) this.error('load_failed', `${url}: ${(e as Error).message}`);
      return;
    }
    if (seq !== this.loadSeq) return;
    this.unload();

    const root = gltf.scene;
    this.scene.add(root);
    const itemNode = findItemNode(root);
    const itemExtras = (itemNode?.userData as { uhub?: { dimensions?: LoadedItem['dimensions'] } })?.uhub;
    const clips = new ClipPlayer(root, gltf.animations);
    const look = new Look(root);
    look.mode = this.mode;
    look.apply();
    const lines: DimensionLine[] = itemExtras?.dimensions?.lines ?? [];
    const dims = itemNode && lines.length ? buildDims(itemNode, lines) : null;
    if (dims) dims.visible = this.dimsOn;

    const item: LoadedItem = {
      node: itemNode?.name ?? '',
      meta: ((gltf.parser.json as { asset?: { extras?: { uhub?: Record<string, unknown> } } }).asset?.extras
        ?.uhub ?? null) as Record<string, unknown> | null,
      dimensions: itemExtras?.dimensions ?? null,
      clips: openableClipNames(gltf.animations),
    };
    this.model = { url, gltf, root, parts: indexParts(root), clips, look, dims, item };
    this.fitHome(root);
    this.postLoaded(this.model);
  }

  private postLoaded(m: Loaded): void {
    const parts = [...m.parts.values()].map((o) => partExtras(o)!);
    this.bridge.post({ type: 'loaded', item: m.item, parts });
  }

  private unload(): void {
    const m = this.model;
    if (!m) return;
    this.selectSeq++;
    m.clips.dispose();
    m.look.dispose();
    if (m.dims) disposeDims(m.dims);
    m.root.removeFromParent();
    m.root.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    this.model = null;
  }

  // ---------- tanlash ----------

  /** Kontrakt 6-bo'lim, 4-qadam: reveal kliplari ketma-ket, qolganlar shaffof, kontur, kamera. */
  private async selectByUid(m: Loaded, uid: string): Promise<void> {
    const node = m.parts.get(uid);
    if (!node) return this.error('part_not_found', `Detal modelda topilmadi: ${uid}`);
    const seq = ++this.selectSeq;
    const extras = partExtras(node)!;
    this.bridge.post({ type: 'selected', uid, extras, clip: ownClip(node, m.clips) });
    m.look.selected = node;
    m.look.ghost = true;
    m.look.apply();

    const { clips, missing } = revealPlan(extras, new Set(m.clips.names));
    if (missing.length) this.error('clip_not_found', `reveal kliplari topilmadi: ${missing.join(', ')}`);
    // Avvalgi tanlovdan ochiq qolgan, endi kerak bo'lmagan kliplar yopiladi.
    for (const name of m.clips.names)
      if (m.clips.isOpen(name) && !clips.includes(name)) void m.clips.play(name, -1);
    for (const name of clips) {
      await m.clips.play(name, 1);
      if (seq !== this.selectSeq) return;
    }
    this.focus(node);
  }

  private showAll(m: Loaded): void {
    this.selectSeq++;
    m.look.selected = null;
    m.look.ghost = false;
    m.look.apply();
    void m.clips.playAll(-1);
  }

  /** Bosish = tanlash. Eshik bosilganda ochilmaydi — faqat `selected`. */
  private tapSelect(x: number, y: number): void {
    const m = this.model;
    if (!m) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = m.look.meshList.filter((mesh) => !m.look.isGhosted(mesh));
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    const part = findPartAncestor(hit?.object ?? null);
    if (!part) {
      if (!m.look.ghost && m.look.selected) {
        m.look.selected = null;
        m.look.apply();
        this.bridge.post({ type: 'deselected' });
      }
      return;
    }
    const extras = partExtras(part)!;
    m.look.selected = part;
    m.look.apply();
    this.bridge.post({ type: 'selected', uid: extras.uid, extras, clip: ownClip(part, m.clips) });
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

  private frame(): void {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.model?.clips.update(dt);
    const tw = this.tween;
    if (tw) {
      tw.t = Math.min(tw.t + dt / tw.duration, 1);
      const k = ease(tw.t);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  private error(code: ErrorCode, message: string): void {
    this.bridge.post({ type: 'error', code, message });
  }
}
