export type SchemaStatus = 'draft' | 'active' | 'archived';

export type PromptSchema = {
  id?: string;
  name: string;
  version: number;
  json_schema: unknown;
  status: SchemaStatus;
  updatedAt?: string;
};
