// Kontrakt 1.10, 8-bo'lim: bundle versiyasi va qo'llaydigan kontrakt versiyasi bundle ichida.

/** Viewer bundle versiyasi (semver). Reliz: `npm run release:viewer` → releases/viewer/<VIEWER_VERSION>/. */
export const VIEWER_VERSION = '0.6.0';

/** Viewer qo'llaydigan kontrakt versiyasi. */
export const VIEWER_CONTRACT = '1.10';

const major = (v: string) => Number.parseInt(v.split('.')[0] ?? '', 10);

/** GLB `asset.extras.uhub.contract` major'i viewer bilan mos kelishi kerak (8-bo'lim). */
export function isContractCompatible(glbContract: unknown): boolean {
  return typeof glbContract === 'string' && major(glbContract) === major(VIEWER_CONTRACT);
}
