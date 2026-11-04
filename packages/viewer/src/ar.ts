// AR rejimi (M-A5, ADR-M003 (d)): Chrome WebXR `immersive-ar`, hit-test bilan polga qo'yish, surish va aylantirish.
// GLB yuklash, materiallar, kliplar — 3D rejim kodi (Viewer); bu yerda faqat sessiya, retikl va imo-ishoralar.
// Masshtablash yo'q: `anchor` ning faqat joyi va Y burchagi o'zgaradi (1 birlik = 1 m).
import {
  type Color,
  type DirectionalLight,
  type Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type PerspectiveCamera,
  RingGeometry,
  type Scene,
  type Texture,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { XREstimatedLight } from 'three/examples/jsm/webxr/XREstimatedLight.js';
import { faceYaw, placeAnchor, twistYaw, type ScreenPoint } from './ar-math.js';
import { ACCENT } from './theme.js';

export type ArState = 'scanning' | 'found' | 'placed';

export interface ArHost {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Buyum, zonalar, soya tekisligi va yorug'lik shu guruhda — AR'da faqat u joylashtiriladi. */
  anchor: Group;
  sun: DirectionalLight;
  /** Buyum ildizi fazosida polning balandligi (bounding box min Y). */
  floorY(): number;
}

export interface ArCallbacks {
  onState(state: ArState): void;
  onEnd(): void;
}

/** So'raladigan imkoniyatlar. `plane-detection` va `depth-sensing` — faqat aniqlash uchun (hisobot), ishlatilmaydi. */
const REQUIRED = ['hit-test'];
const OPTIONAL = ['dom-overlay', 'local-floor', 'light-estimation', 'plane-detection', 'depth-sensing'];

export async function isArSupported(): Promise<boolean> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) return false;
  try {
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

export class ArSession {
  private session: XRSession | null = null;
  private refSpace: XRReferenceSpace | null = null;
  private centerSource: XRHitTestSource | null = null;
  private touchSource: XRTransientInputHitTestSource | null = null;
  private readonly reticle: Mesh;
  private state: ArState = 'scanning';
  private yaw = 0;
  /** Bir barmoq bilan surish: barmoq tekkan nuqta va buyum orasidagi siljish. */
  private drag: { offset: Vector3 | null } | null = null;
  private twist: [ScreenPoint, ScreenPoint] | null = null;
  private light: XREstimatedLight | null = null;
  private saved: {
    background: Color | Texture | null;
    environment: Texture | null;
    sunIntensity: number;
  } | null = null;
  /** Sessiyada yoqilgan imkoniyatlar (hisobot uchun). */
  features: string[] = [];

  constructor(
    private readonly host: ArHost,
    private readonly overlay: HTMLElement,
    private readonly cb: ArCallbacks,
  ) {
    this.reticle = new Mesh(
      new RingGeometry(0.1, 0.13, 40).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9 }),
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
  }

  get active(): boolean {
    return this.session !== null;
  }

  /** Faqat foydalanuvchi bosishi bilan chaqiriladi (WebXR talabi). */
  async start(): Promise<void> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) throw new Error('navigator.xr yo‘q');
    const init: XRSessionInit & { depthSensing?: unknown } = {
      requiredFeatures: REQUIRED,
      optionalFeatures: OPTIONAL,
      domOverlay: { root: this.overlay },
      // Faqat CPU varianti: three.js GPU chuqurlik okklyuziyasini yoqmasin (depth-sensing faqat aniqlanadi).
      depthSensing: {
        usagePreference: ['cpu-optimized'],
        dataFormatPreference: ['luminance-alpha', 'float32'],
      },
    };
    const session = await xr.requestSession('immersive-ar', init);
    const { renderer, scene, anchor, sun } = this.host;
    this.saved = {
      background: scene.background as Color | null,
      environment: scene.environment,
      sunIntensity: sun.intensity,
    };
    scene.background = null;
    anchor.visible = false;
    scene.add(this.reticle);

    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(session);
    this.session = session;
    this.refSpace = renderer.xr.getReferenceSpace();
    this.features = [...((session as XRSession & { enabledFeatures?: string[] }).enabledFeatures ?? [])];

    const viewerSpace = await session.requestReferenceSpace('viewer');
    this.centerSource = (await session.requestHitTestSource?.({ space: viewerSpace })) ?? null;
    this.touchSource =
      (await session.requestHitTestSourceForTransientInput?.({ profile: 'generic-touchscreen' })) ?? null;

    this.installLight();
    session.addEventListener('select', this.onSelect);
    session.addEventListener('selectstart', this.onSelectStart);
    session.addEventListener('selectend', this.onSelectEnd);
    session.addEventListener('end', this.onEnd);
    this.overlay.addEventListener('touchstart', this.onTouch, { passive: true });
    this.overlay.addEventListener('touchmove', this.onTouch, { passive: true });
    this.overlay.addEventListener('touchend', this.onTouch, { passive: true });
    this.state = 'scanning';
    this.cb.onState('scanning');
  }

  /** "Qayta joylashtirish": buyum yashiriladi, retikl bilan qayta qo'yiladi. */
  replace(): void {
    if (!this.session) return;
    this.host.anchor.visible = false;
    this.drag = null;
    this.setState('scanning');
  }

  end(): void {
    void this.session?.end();
  }

  /** Har XR kadrida (Viewer sikli). */
  update(frame: XRFrame): void {
    const ref = this.refSpace;
    if (!ref) return;
    if (this.state !== 'placed' && this.centerSource) {
      const hit = frame.getHitTestResults(this.centerSource)[0];
      const pose = hit?.getPose(ref);
      this.reticle.visible = !!pose;
      if (pose) this.reticle.matrix.fromArray(pose.transform.matrix);
      this.setState(pose ? 'found' : 'scanning');
    } else {
      this.reticle.visible = false;
    }
    if (this.state === 'placed' && this.drag && !this.twist && this.touchSource) {
      const pose = frame.getHitTestResultsForTransientInput(this.touchSource)[0]?.results[0]?.getPose(ref);
      if (pose) {
        const p = new Vector3().setFromMatrixPosition(new Matrix4().fromArray(pose.transform.matrix));
        const a = this.host.anchor.position;
        this.drag.offset ??= new Vector3(a.x - p.x, 0, a.z - p.z);
        placeAnchor(
          this.host.anchor,
          { x: p.x + this.drag.offset.x, y: a.y, z: p.z + this.drag.offset.z },
          this.yaw,
        );
      }
    }
  }

  private onSelect = () => {
    if (this.state !== 'found') return;
    const hit = new Vector3().setFromMatrixPosition(this.reticle.matrix);
    const cam = this.host.renderer.xr.getCamera().getWorldPosition(new Vector3());
    this.yaw = faceYaw({ x: hit.x, z: hit.z }, { x: cam.x, z: cam.z });
    placeAnchor(this.host.anchor, { x: hit.x, y: hit.y - this.host.floorY(), z: hit.z }, this.yaw);
    this.host.anchor.visible = true;
    this.setState('placed');
  };

  private onSelectStart = () => {
    if (this.state === 'placed') this.drag = { offset: null };
  };

  private onSelectEnd = () => {
    this.drag = null;
  };

  private onTouch = (e: TouchEvent) => {
    if (this.state !== 'placed' || e.touches.length !== 2) {
      this.twist = null;
      return;
    }
    const pts: [ScreenPoint, ScreenPoint] = [
      { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY },
      { x: e.touches[1]!.clientX, y: e.touches[1]!.clientY },
    ];
    if (this.twist) {
      this.yaw = twistYaw(this.yaw, this.twist, pts);
      const a = this.host.anchor.position;
      placeAnchor(this.host.anchor, { x: a.x, y: a.y, z: a.z }, this.yaw);
    }
    this.twist = pts;
    this.drag = null;
  };

  /** `light-estimation` bo'lsa — undan (muhit va yorug'lik); soya baribir bitta yo'naltirilgan yorug'likdan. */
  private installLight(): void {
    const { renderer, scene, sun } = this.host;
    const light = new XREstimatedLight(renderer);
    light.addEventListener('estimationstart', () => {
      scene.add(light);
      if (light.environment) scene.environment = light.environment;
      // Yorug'lik baholashdan; `sun` faqat soya uchun (intensity 0 — soya xaritasi baribir chiziladi).
      sun.intensity = 0;
    });
    light.addEventListener('estimationend', () => {
      scene.remove(light);
      scene.environment = this.saved?.environment ?? null;
      sun.intensity = this.saved?.sunIntensity ?? 1.5;
    });
    this.light = light;
  }

  private onEnd = () => {
    const { renderer, scene, anchor, sun } = this.host;
    this.centerSource?.cancel();
    this.touchSource?.cancel();
    this.centerSource = this.touchSource = null;
    this.overlay.removeEventListener('touchstart', this.onTouch);
    this.overlay.removeEventListener('touchmove', this.onTouch);
    this.overlay.removeEventListener('touchend', this.onTouch);
    if (this.light) {
      this.light.removeFromParent();
      this.light.dispose();
      this.light = null;
    }
    scene.remove(this.reticle);
    if (this.saved) {
      scene.background = this.saved.background;
      scene.environment = this.saved.environment;
      sun.intensity = this.saved.sunIntensity;
    }
    renderer.xr.enabled = false;
    placeAnchor(anchor, { x: 0, y: 0, z: 0 }, 0);
    anchor.visible = true;
    this.session = null;
    this.refSpace = null;
    this.drag = null;
    this.twist = null;
    this.cb.onEnd();
  };

  private setState(state: ArState): void {
    if (state === this.state) return;
    this.state = state;
    this.cb.onState(state);
  }
}
