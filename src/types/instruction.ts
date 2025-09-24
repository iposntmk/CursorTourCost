export type InstructionStatus = 'draft' | 'active' | 'archived';

export type Instruction = {
  id?: string;
  title: string;
  goal: string;
  body: string;
  lang: string;
  variables: string[];
  status: InstructionStatus;
  version: number;
  updatedAt?: string;
  publishedAt?: string;
};

export type InstructionRuleStatus = 'draft' | 'active' | 'archived';

export type InstructionRule = {
  id?: string;
  instructionId?: string;
  title: string;
  constraints: string[];
  output_format: string;
  priority: number;
  status: InstructionRuleStatus;
  version: number;
  updatedAt?: string;
};

export type InstructionExample = {
  id?: string;
  instructionId?: string;
  ruleId?: string;
  name: string;
  input_example: string;
  expected_output: string;
  is_gold: boolean;
  updatedAt?: string;
};

export const createEmptyInstruction = (): Instruction => ({
  title: '',
  goal: '',
  body: '',
  lang: 'vi',
  variables: [],
  status: 'draft',
  version: 1,
});

export const createEmptyRule = (priority = 1): InstructionRule => ({
  title: '',
  constraints: [],
  output_format: '',
  priority,
  status: 'draft',
  version: 1,
});

export const createEmptyExample = (): InstructionExample => ({
  name: '',
  input_example: '',
  expected_output: '',
  is_gold: false,
});
