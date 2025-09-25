import { Instruction, InstructionRule } from '../../../types/instruction';

export const composePrompt = (
  instruction: Instruction | null | undefined,
  rules: InstructionRule[] | undefined,
) => {
  if (!instruction) return '';

  const ruleBlock = (rules ?? [])
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .map((rule, index) => {
      const constraints = rule.constraints?.length ? `\n- ${rule.constraints.join('\n- ')}` : '';
      return `Rule ${index + 1}: ${rule.title}${constraints ? `\n${constraints}` : ''}\nOutput: ${rule.output_format}`;
    })
    .join('\n\n');

  const variableList = instruction.variables?.length ? `\nVariables: {{${instruction.variables.join('}}, {{')}}}` : '';

  return `Instruction: ${instruction.title}\nGoal: ${instruction.goal}\n${instruction.body}${variableList}\n\n${ruleBlock}`.trim();
};
