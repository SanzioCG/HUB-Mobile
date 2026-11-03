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
