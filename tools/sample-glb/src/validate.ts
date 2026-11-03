import validator from 'gltf-validator';

export interface ValidationSummary {
  numErrors: number;
  numWarnings: number;
  messages: { code: string; message: string; severity: number; pointer?: string }[];
}

/** Khronos glTF-Validator. severity: 0 error, 1 warning, 2 info, 3 hint. */
export async function validateGlb(bytes: Uint8Array): Promise<ValidationSummary> {
  const report = await validator.validateBytes(bytes, { maxIssues: 100 });
  return {
    numErrors: report.issues.numErrors,
    numWarnings: report.issues.numWarnings,
    messages: report.issues.messages,
  };
}

/** GLB'ning JSON bo'lagi (sarlavha 12 bayt, keyin JSON chunk). */
export function glbJson(bytes: Uint8Array): Record<string, unknown> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = view.getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + len))) as Record<string, unknown>;
}
