// QR → detal, fayldan (kontrakt 1.6, 10.4): `uhub:p/<project_number>/<part_uid>/<snapshot>` → telefondagi `.uhub`
// fayllaridan. To'rt holat aynan kontrakt matnlari bilan (`FILE_QR_TEXT`, packages/viewer).
import { FILE_QR_TEXT, itemKey, resolveFromFiles, type UhubIndex } from '@hub-mobile/viewer/uhub';
import { uz } from '../i18n/uz';
import { parseQr } from '../scan/qr';

export type FileLabelTarget =
  | {
      ok: true;
      /** `/files/view` parametrlari: buyum, detal, 3-holatda sariq banner. */
      params: { fileId: string; item: string; uid: string; banner?: string };
    }
  | { ok: false; message: string; /** 1-holat: shu loyiha fayli umuman yo'q. */ noFile: boolean };

export function fileLabelTarget(
  qr: string,
  files: readonly (Pick<UhubIndex, 'project_number' | 'items'> & { id: string })[],
): FileLabelTarget {
  const parsed = parseQr(qr);
  if (!parsed) return { ok: false, message: uz.errors.badQr, noFile: false };
  const res = resolveFromFiles(
    { projectNumber: parsed.projectNumber, partUid: parsed.uid, snapshot: parsed.snapshot },
    files,
  );
  switch (res.kind) {
    case 'no_file':
      return { ok: false, message: FILE_QR_TEXT.noFile, noFile: true };
    case 'no_part':
      return { ok: false, message: FILE_QR_TEXT.noPart, noFile: false };
    case 'match':
    case 'other_snapshot': {
      const file = files.find((f) => f.items.includes(res.item))!;
      return {
        ok: true,
        params: {
          fileId: file.id,
          item: itemKey(res.item),
          uid: res.uid,
          ...(res.kind === 'other_snapshot'
            ? { banner: FILE_QR_TEXT.otherSnapshot(res.item.revision_label) }
            : {}),
        },
      };
    }
  }
}
