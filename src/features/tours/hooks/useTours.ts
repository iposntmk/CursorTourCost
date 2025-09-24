import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDocument, getDocument, listDocuments, removeDocument, updateDocument } from '../../../lib/firestore';
import { queryKeys } from '../../../constants/queryKeys';
import { TourData } from '../../../types/tour';
import { timestampToISO } from '../../../utils/firestore';

const COLLECTION = 'tours';

const mapTour = (data: TourData & { id: string }) => ({
  ...data,
  createdAt: timestampToISO((data as unknown as { createdAt?: unknown }).createdAt) ?? undefined,
  updatedAt: timestampToISO((data as unknown as { updatedAt?: unknown }).updatedAt) ?? undefined,
});

export const useTours = () =>
  useQuery({
    queryKey: queryKeys.tours,
    queryFn: async () => {
      const snapshot = await listDocuments<TourData>(COLLECTION, 'updatedAt');
      return snapshot.map(mapTour);
    },
  });

export const useTour = (id?: string) =>
  useQuery({
    queryKey: id ? queryKeys.tour(id) : ['tour', 'empty'],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const snapshot = await getDocument<TourData>(`${COLLECTION}/${id}`);
      return snapshot ? mapTour(snapshot as TourData & { id: string }) : null;
    },
  });

export const useTourMutations = () => {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: TourData) => addDocument<TourData>(COLLECTION, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tours }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TourData> }) => updateDocument<TourData>(`${COLLECTION}/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tours });
      queryClient.invalidateQueries({ queryKey: queryKeys.tour(id) });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeDocument(`${COLLECTION}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tours }),
  });

  return { create, update, remove };
};
