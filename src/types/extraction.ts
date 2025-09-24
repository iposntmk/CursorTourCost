export type ExtractionRecord = {
  id?: string;
  instructionId: string;
  ruleIds: string[];
  schemaId: string;
  promptVersion: number;
  schemaVersion: number;
  raw_output: string;
  parsed: unknown;
  valid: boolean;
  errors: string[];
  createdAt?: string;
};
