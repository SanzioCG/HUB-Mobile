declare module 'gltf-validator' {
  interface Message {
    code: string;
    message: string;
    severity: number;
    pointer?: string;
  }
  interface Report {
    issues: {
      numErrors: number;
      numWarnings: number;
      numInfos: number;
      numHints: number;
      messages: Message[];
    };
  }
  const validator: {
    validateBytes(data: Uint8Array, options?: { maxIssues?: number; uri?: string }): Promise<Report>;
  };
  export default validator;
}
