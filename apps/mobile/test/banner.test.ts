// Kontrakt 6.3: eski reviziya banneri va "R5 ni ochish"; part_in_latest=false.
import type { ResolveResponse } from '../src/api/types';
import { uz } from '../src/i18n/uz';
import { scanBanner, type ViewTarget } from '../src/scan/banner';
import type { ScanSelection } from '../src/scan/selection';

const BASE = 'http://x/files/glb';
const result = (over: Partial<ResolveResponse>): ResolveResponse => ({
  project_id: 101,
  project_number: 51,
  item_id: 'm0',
  item_name: 'M-0 namuna',
  revision_id: 'm0-r3',
  revision_label: 'R3',
  part_uid: 'm0p06',
  part_name: 'Polka',
  glb_url: `${BASE}/m0-r3.glb`,
  is_latest: false,
  part_in_latest: true,
  latest_revision_id: 'm0-r5',
  latest_revision_label: 'R5',
  latest_glb_url: `${BASE}/m0-r5.glb`,
  ...over,
});
const sel = (over: Partial<ResolveResponse>): ScanSelection => ({
  qr: 'q',
  result: result(over),
  offline: false,
});
const target = (revisionId: string): ViewTarget => ({
  itemId: 'm0',
  name: 'M-0',
  sizeMm: null,
  glbUrl: `${BASE}/${revisionId}.glb`,
  revisionId,
  revisionLabel: revisionId,
  approved: null,
  usdzUrl: null,
});

it('skanersiz yoki joriy reviziya etiketkasi — banner yo‘q', () => {
  expect(scanBanner(undefined, target('m0-r5'))).toBeNull();
  expect(scanBanner(sel({ is_latest: true, revision_id: 'm0-r5' }), target('m0-r5'))).toBeNull();
});

it('eski reviziya: sariq banner + "R5 ni ochish"', () => {
  expect(scanBanner(sel({}), target('m0-r3'))).toEqual({
    lines: [uz.select.oldRevision('R3', 'R5')],
    action: uz.select.openLatest('R5'),
  });
});

it('R5 ochilgach, detal unda bor — banner yo‘qoladi', () => {
  expect(scanBanner(sel({}), target('m0-r5'))).toBeNull();
});

it('detal hozirgi reviziyada yo‘q: banner qo‘shimchasi; R5 ochilgach ham eslatma qoladi', () => {
  const s = sel({ part_uid: 'm0p22', part_in_latest: false });
  expect(scanBanner(s, target('m0-r3'))).toEqual({
    lines: [uz.select.oldRevision('R3', 'R5'), uz.select.notInLatest],
    action: uz.select.openLatest('R5'),
  });
  expect(scanBanner(s, target('m0-r5'))).toEqual({ lines: [uz.select.notInLatest], action: null });
});

it('latest_glb_url yo‘q — tugma yo‘q', () => {
  expect(scanBanner(sel({ latest_glb_url: null }), target('m0-r3'))?.action).toBeNull();
});
