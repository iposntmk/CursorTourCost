export const queryKeys = {
  instructions: ['instructions'] as const,
  instruction: (id: string) => ['instruction', id] as const,
  instructionRules: (instructionId: string) => ['instruction', instructionId, 'rules'] as const,
  instructionExamples: (instructionId: string, ruleId: string) =>
    ['instruction', instructionId, 'rule', ruleId, 'examples'] as const,
  activeInstruction: ['instructions', 'active'] as const,
  schemas: ['schemas'] as const,
  activeSchema: ['schemas', 'active'] as const,
  tours: ['tours'] as const,
  tour: (id: string) => ['tour', id] as const,
  masterData: (type: string) => ['master-data', type] as const,
  extractionLog: ['extractions'] as const,
  aiPrompt: ['ai', 'prompt'] as const,
};
