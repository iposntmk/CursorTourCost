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

const fetchActiveSchemas = async () => {
  const docs = await listDocuments<PromptSchema>(COLLECTION, 'updatedAt');
  const actives = docs.filter((item) => item.status === 'active');
  return actives.map((schema) => mapSchema(schema as PromptSchema & { id: string }));
};

export const useActiveSchema = () =>
  useQuery({
    queryKey: queryKeys.activeSchema,
    queryFn: async () => {
      const actives = await fetchActiveSchemas();
      return actives[0] ?? null;
    },
  });

export const useActiveSchemas = () =>
  useQuery({
    queryKey: queryKeys.activeSchemas,
    queryFn: fetchActiveSchemas,
  });

export const useSchemaMutations = () => {
  const queryClient = useQueryClient();

  const createSchema = useMutation({
    mutationFn: (payload: PromptSchema) => addDocument(COLLECTION, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schemas });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSchema });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSchemas });
    },
  });

  const updateSchema = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromptSchema> }) =>
      setDocument(`${COLLECTION}/${id}`, data as PromptSchema),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schemas });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSchema });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSchemas });
      queryClient.invalidateQueries({ queryKey: ['schema', id] });
    },
  });

  return { createSchema, updateSchema };
};
