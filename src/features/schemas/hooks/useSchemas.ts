import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDocument, getDocument, listDocuments, setDocument } from '../../../lib/firestore';
import { queryKeys } from '../../../constants/queryKeys';
import { PromptSchema } from '../../../types/schema';
import { timestampToISO } from '../../../utils/firestore';

const COLLECTION = 'schemas';

const mapSchema = (item: PromptSchema & { id: string }) => ({
  ...item,
  updatedAt: timestampToISO((item as unknown as { updatedAt?: unknown }).updatedAt) ?? undefined,
});

export const useSchemas = () =>
  useQuery({
    queryKey: queryKeys.schemas,
    queryFn: async () => {
      const docs = await listDocuments<PromptSchema>(COLLECTION, 'updatedAt');
      return docs.map(mapSchema);
    },
  });

export const useSchema = (id?: string) =>
  useQuery({
    queryKey: id ? ['schema', id] : ['schema', 'empty'],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const doc = await getDocument<PromptSchema>(`${COLLECTION}/${id}`);
      return doc ? mapSchema(doc as PromptSchema & { id: string }) : null;
    },
  });

export const useActiveSchema = () =>
  useQuery({
    queryKey: queryKeys.activeSchema,
    queryFn: async () => {
      const docs = await listDocuments<PromptSchema>(COLLECTION, 'updatedAt');
      const active = docs.find((item) => item.status === 'active');
      return active ? mapSchema(active as PromptSchema & { id: string }) : null;
    },
  });

export const useSchemaMutations = () => {
  const queryClient = useQueryClient();

  const createSchema = useMutation({
    mutationFn: (payload: PromptSchema) => addDocument(COLLECTION, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.schemas }),
  });

  const updateSchema = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromptSchema> }) =>
      setDocument(`${COLLECTION}/${id}`, data as PromptSchema),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schemas });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSchema });
      queryClient.invalidateQueries({ queryKey: ['schema', id] });
    },
  });

  return { createSchema, updateSchema };
};
