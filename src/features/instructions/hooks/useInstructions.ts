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

export const useInstructions = () =>
  useQuery({
    queryKey: queryKeys.instructions,
    queryFn: async () => {
      const docs = await listDocuments<Instruction>(COLLECTION, 'updatedAt');
      return docs.map(mapInstruction);
    },
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

export const useInstructionRules = (instructionId?: string) =>
  useQuery({
    queryKey: instructionId ? queryKeys.instructionRules(instructionId) : ['instruction', 'rules', 'empty'],
    enabled: Boolean(instructionId),
    queryFn: async () => {
      if (!instructionId) return [];
      const docs = await listDocuments<InstructionRule>(`${COLLECTION}/${instructionId}/rules`, 'priority');
      return docs.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    },
  });

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.instructions }),
  });

  const updateInstruction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Instruction> }) =>
      updateDocument(`${COLLECTION}/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructions });
      queryClient.invalidateQueries({ queryKey: queryKeys.instruction(id) });
    },
  });

  const publishInstruction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Instruction }) => setDocument(`${COLLECTION}/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructions });
      queryClient.invalidateQueries({ queryKey: queryKeys.instruction(id) });
    },
  });

  const deleteInstruction = useMutation({
    mutationFn: (id: string) => removeDocument(`${COLLECTION}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.instructions }),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.instructions });
    },
  });

  const deleteRule = useMutation({
    mutationFn: ({ instructionId, ruleId }: { instructionId: string; ruleId: string }) =>
      removeDocument(`${COLLECTION}/${instructionId}/rules/${ruleId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructionRules(variables.instructionId) });
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
