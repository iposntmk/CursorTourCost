import { Instruction, InstructionRule } from '../../../types/instruction';

const formatRuleBlock = (rules: InstructionRule[] = []) =>
  rules
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .map((rule, index) => {
      const constraints = rule.constraints?.length ? `\n- ${rule.constraints.join('\n- ')}` : '';
      return `Rule ${index + 1}: ${rule.title}${constraints ? `\n${constraints}` : ''}\nOutput: ${rule.output_format}`;
    })
    .filter(Boolean)
    .join('\n\n');

const formatInstructionBlock = (
  instruction: Instruction,
  rules: InstructionRule[] = [],
  index: number,
  total: number,
) => {
  const variableList = instruction.variables?.length ? `\nVariables: {{${instruction.variables.join('}}, {{')}}}` : '';
  const ruleBlock = formatRuleBlock(rules);
  const headerPrefix = total > 1 ? `Instruction ${index + 1}` : 'Instruction';

  return [
    `${headerPrefix}: ${instruction.title}`,
    `Goal: ${instruction.goal}`,
    `${instruction.body}${variableList}`.trim(),
    ruleBlock,
  ]
    .filter((section) => section && section.trim().length > 0)
    .join('\n');
};

export const composePrompt = (
  instructions: Instruction[] | null | undefined,
  ruleMap: Record<string, InstructionRule[] | undefined> = {},
) => {
  const validInstructions = (instructions ?? []).filter(Boolean) as Instruction[];
  if (!validInstructions.length) return '';

  const blocks = validInstructions.map((instruction, index) => {
    const rules = ruleMap[instruction.id ?? ''];
    return formatInstructionBlock(instruction, rules ?? [], index, validInstructions.length);
  });

  return blocks.filter(Boolean).join('\n\n---\n\n').trim();
};
