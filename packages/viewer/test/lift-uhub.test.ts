// Kontrakt 1.10: haqiqiy U-HUB eksporti pantograf bilan (masalan "F-HG1 namuna", repoga kirmaydi).
// UHUB_LIFT_FILE berilmasa — skip. Viewer'dagi kabi: `revealParts` → `RevealIndex`, `ClipPlayer` bilan ijro.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { type Object3D, PropertyBinding, Quaternion } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ClipPlayer } from '../src/clips.js';
import { liftNodes, openableClipNames, ownClipName, indexParts, revealParts } from '../src/model.js';
import { RevealIndex } from '../src/sequence.js';
import { openUhub, type UhubItem } from '../src/uhub.js';
import { isContractCompatible } from '../src/version.js';

const FILE = process.env.UHUB_LIFT_FILE;

async function parse(glb: Uint8Array): Promise<GLTF> {
  const io = new NodeIO();
  const doc = await io.readBinary(glb);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  const bytes = await io.writeBinary(doc);
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    '',
  );
}

interface WithLift {
  item: UhubItem;
  gltf: GLTF;
}
let lifted: WithLift[];

const worldTurn = (o: Object3D) => o.getWorldQuaternion(new Quaternion());

/** Rejani ijro etadi; har ochiq/yopiq o'zgarishda ochiq kliplar to'plami yoziladi. */
async function runPlan(player: ClipPlayer, plan: Parameters<ClipPlayer['run']>[0]): Promise<string[][]> {
  const steps: string[][] = [];
  player.onChange = (open) => steps.push([...open].sort());
  let finished: boolean | null = null;
  void player.run(plan).then((ok) => (finished = ok));
  for (let i = 0; i < 400 && finished === null; i++) {
    player.update(0.1);
    await new Promise((r) => setTimeout(r, 0));
  }
  expect(finished, JSON.stringify(steps)).toBe(true);
  return steps;
}

describe.skipIf(!FILE)('pantografli haqiqiy fayl (UHUB_LIFT_FILE)', () => {
  beforeAll(async () => {
    const file = openUhub(new Uint8Array(readFileSync(FILE!)));
    expect(isContractCompatible(file.index.contract)).toBe(true);
    lifted = [];
    for (const item of file.index.items) {
      const gltf = await parse(file.files.get(item.glb)!);
      if (liftNodes(gltf.scene).length) lifted.push({ item, gltf });
    }
  });

  it('kamida bitta buyumda pantograf; lift__<id>__open ochiladigan klip, kanallari mavjud tugunlarga', () => {
    expect(lifted.length).toBeGreaterThan(0);
    for (const { gltf } of lifted) {
      const clips = openableClipNames(gltf.animations);
      for (const { clip } of liftNodes(gltf.scene)) {
        expect(clips).toContain(clip);
        const anim = gltf.animations.find((a) => a.name === clip)!;
        for (const track of anim.tracks) {
          const { nodeName } = PropertyBinding.parseTrackName(track.name);
          expect(gltf.scene.getObjectByName(nodeName!), track.name).toBeDefined();
        }
      }
    }
  });

  it('pantograf detallari (furnitura, osilgan tutqich) → o‘z lift klipi', () => {
    for (const { gltf } of lifted) {
      for (const { clip } of liftNodes(gltf.scene)) {
        const pivot = gltf.scene.getObjectByName(clip.replace(/^lift__(.+)__open$/, 'pivot__lift__$1'))!;
        const inside = [...indexParts(pivot).values()];
        expect(inside.length).toBeGreaterThan(0);
        for (const p of inside) expect(ownClipName(p)).toBe(clip);
      }
    }
  });

  it('ochish: avval reveal eshiklari tartib bilan, keyin pantograf 90° tushadi, tutqich osilib qoladi; yopish teskari', async () => {
    for (const { gltf } of lifted) {
      const player = new ClipPlayer(gltf.scene, gltf.animations);
      const index = new RevealIndex(
        revealParts([{ key: '', root: gltf.scene }], (c) => player.has(c)),
        player.names,
      );
      for (const { clip, lift } of liftNodes(gltf.scene)) {
        const pivot = gltf.scene.getObjectByName(clip.replace(/^lift__(.+)__open$/, 'pivot__lift__$1'))!;
        const hangs: Object3D[] = [];
        pivot.traverse((o) => {
          if (o.name.startsWith('hang__lift__')) hangs.push(o);
        });
        gltf.scene.updateMatrixWorld(true);
        const closedPivot = worldTurn(pivot);
        const closedHang = hangs.map(worldTurn);

        expect(index.prerequisites(clip)).toEqual(lift.reveal);
        const opened = await runPlan(
          player,
          index.planOpen(clip, (c) => player.isOpen(c)),
        );
        // Har qadamda bitta klip qo'shiladi: reveal eshiklari tartib bilan, oxirida pantograf.
        const order = [...lift.reveal, clip];
        expect(opened).toEqual(order.map((_, i) => order.slice(0, i + 1).sort()));

        gltf.scene.updateMatrixWorld(true);
        expect(worldTurn(pivot).angleTo(closedPivot)).toBeCloseTo((lift.angle_deg * Math.PI) / 180, 3);
        hangs.forEach((h, i) => expect(worldTurn(h).angleTo(closedHang[i]!)).toBeCloseTo(0, 3));

        const closed = await runPlan(
          player,
          index.planClose(clip, (c) => player.isOpen(c)),
        );
        const back = [clip, ...[...lift.reveal].reverse()];
        expect(closed).toEqual(
          back.map((_, i) => order.filter((c) => !back.slice(0, i + 1).includes(c)).sort()),
        );
        gltf.scene.updateMatrixWorld(true);
        expect(worldTurn(pivot).angleTo(closedPivot)).toBeCloseTo(0, 3);
      }
    }
  });

  it('hammasini ochish: pantograflar eshiklardan keyingi bosqichda', () => {
    for (const { gltf } of lifted) {
      const player = new ClipPlayer(gltf.scene, gltf.animations);
      const index = new RevealIndex(
        revealParts([{ key: '', root: gltf.scene }], (c) => player.has(c)),
        player.names,
      );
      const plan = index.planAll(1, () => false);
      const stepOf = (c: string) => plan.findIndex((s) => s.some((m) => m.clip === c));
      for (const { clip } of liftNodes(gltf.scene)) {
        for (const door of player.names.filter((c) => c.startsWith('door__')))
          expect(stepOf(clip)).toBeGreaterThan(stepOf(door));
      }
    }
  });
});
