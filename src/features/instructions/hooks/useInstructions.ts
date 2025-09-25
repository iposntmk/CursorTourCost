import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDocument,
  getDocument,
  listDocuments,
  removeDocument,
  setDocument,
  updateDocument,
} from '../../../lib/firestore';
import { queryKeys } from '../../../constants/queryKeys';
import { Instruction, InstructionExample, InstructionRule } from '../../../types/instruction';
import { timestampToISO } from '../../../utils/firestore';

const COLLECTION = 'instructions';

const mapInstruction = (item: Instruction & { id: string }) => ({
  ...item,
  updatedAt: timestampToISO((item as unknown as { updatedAt?: unknown }).updatedAt) ?? undefined,
  publishedAt: timestampToISO((item as unknown as { publishedAt?: unknown }).publishedAt) ?? undefined,
});

const fetchActiveInstructions = async () => {
  const docs = await listDocuments<Instruction>(COLLECTION, 'updatedAt');
  const actives = docs.filter((item) => item.status === 'active');
  return actives.map((instruction) => mapInstruction(instruction as Instruction & { id: string }));
};

export const useInstructions = () =>
  useQuery({
    queryKey: queryKeys.instructions,
    queryFn: async () => {
      const docs = await listDocuments<Instruction>(COLLECTION, 'updatedAt');
      return docs.map(mapInstruction);
    },
  });

export const useActiveInstruction = () =>
  useQuery({
    queryKey: queryKeys.activeInstruction,
    queryFn: async () => {
      const actives = await fetchActiveInstructions();
      return actives[0] ?? null;
    },
  });

export const useActiveInstructions = () =>
  useQuery({
    queryKey: queryKeys.activeInstructions,
    queryFn: fetchActiveInstructions,
  });

export const useInstruction = (id?: string) =>
  useQuery({
    queryKey: id ? queryKeys.instruction(id) : ['instruction', 'empty'],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const doc = await getDocument<Instruction>(`${COLLECTION}/${id}`);
      return doc ? mapInstruction(doc as Instruction & { id: string }) : null;
    },
  });

export const useInstructionRuleSets = (instructionIds?: string[]) => {
  const normalizedIds = [...(instructionIds ?? [])]
    .filter((id): id is string => Boolean(id))
    .sort();

  return useQuery({
    queryKey: normalizedIds.length
      ? queryKeys.instructionRuleSets(normalizedIds)
      : ['instruction', 'rules', 'set', 'empty'],
    enabled: normalizedIds.length > 0,
    initialData: {} as Record<string, InstructionRule[]>,
    queryFn: async () => {
      if (!normalizedIds.length) return {} as Record<string, InstructionRule[]>;

      const entries = await Promise.all(
        normalizedIds.map(async (instructionId) => {
          const docs = await listDocuments<InstructionRule>(`${COLLECTION}/${instructionId}/rules`, 'priority');
          const sorted = docs.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
          return [instructionId, sorted] as const;
        }),
      );

      return Object.fromEntries(entries) as Record<string, InstructionRule[]>;
    },
  });
};

export const useInstructionRules = (instructionId?: string) => {
  const query = useInstructionRuleSets(instructionId ? [instructionId] : []);
  return {
    ...query,
    data: instructionId ? query.data?.[instructionId] ?? [] : [],
  };
};

export const useInstructionExamples = (instructionId?: string, ruleId?: string) =>
  useQuery({
    queryKey:
      instructionId && ruleId
        ? queryKeys.instructionExamples(instructionId, ruleId)
        : ['instruction', 'rule', 'examples', 'empty'],
    enabled: Boolean(instructionId && ruleId),
    queryFn: async () => {
      if (!instructionId || !ruleId) return [];
      const docs = await listDocuments<InstructionExample>(`${COLLECTION}/${instructionId}/rules/${ruleId}/examples`, 'updatedAt');
      return docs;
    },
  });

export const useInstructionMutations = () => {
  const queryClient = useQueryClient();

  const createInstruction = useMutation({
    mutationFn: (payload: Instruction) => addDocument(COLLECTION, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructions });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeInstruction });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeInstructions });
    },
  });

  const updateInstruction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Instruction> }) =>
      updateDocument(`${COLLECTION}/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructions });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeInstruction });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeInstructions });
      queryClient.invalidateQueries({ queryKey: queryKeys.instruction(id) });
    },
  });

  const publishInstruction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Instruction }) => setDocument(`${COLLECTION}/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructions });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeInstruction });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeInstructions });
      queryClient.invalidateQueries({ queryKey: queryKeys.instruction(id) });
    },
  });

  const deleteInstruction = useMutation({
    mutationFn: (id: string) => removeDocument(`${COLLECTION}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructions });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeInstruction });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeInstructions });
    },
  });

  const upsertRule = useMutation({
    mutationFn: async ({ instructionId, ruleId, data }: { instructionId: string; ruleId?: string; data: InstructionRule }) => {
      if (ruleId) {
        await setDocument(`${COLLECTION}/${instructionId}/rules/${ruleId}`, data);
        return ruleId;
      }
      return addDocument(`${COLLECTION}/${instructionId}/rules`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructionRules(variables.instructionId) });
      queryClient.invalidateQueries({ queryKey: ['instruction', 'rules', 'set'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.instructions });
    },
  });

  const deleteRule = useMutation({
    mutationFn: ({ instructionId, ruleId }: { instructionId: string; ruleId: string }) =>
      removeDocument(`${COLLECTION}/${instructionId}/rules/${ruleId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructionRules(variables.instructionId) });
      queryClient.invalidateQueries({ queryKey: ['instruction', 'rules', 'set'] });
    },
  });

  const upsertExample = useMutation({
    mutationFn: async ({
      instructionId,
      ruleId,
      exampleId,
      data,
    }: {
      instructionId: string;
      ruleId: string;
      exampleId?: string;
      data: InstructionExample;
    }) => {
      if (exampleId) {
        await setDocument(`${COLLECTION}/${instructionId}/rules/${ruleId}/examples/${exampleId}`, data);
        return exampleId;
      }
      return addDocument(`${COLLECTION}/${instructionId}/rules/${ruleId}/examples`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructionExamples(variables.instructionId, variables.ruleId) });
    },
  });

  const deleteExample = useMutation({
    mutationFn: ({ instructionId, ruleId, exampleId }: { instructionId: string; ruleId: string; exampleId: string }) =>
      removeDocument(`${COLLECTION}/${instructionId}/rules/${ruleId}/examples/${exampleId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructionExamples(variables.instructionId, variables.ruleId) });
      queryClient.invalidateQueries({ queryKey: ['instruction', 'rules', 'set'] });
    },
  });

  return {
    createInstruction,
    updateInstruction,
    publishInstruction,
    deleteInstruction,
    upsertRule,
    deleteRule,
    upsertExample,
    deleteExample,
  };
};
