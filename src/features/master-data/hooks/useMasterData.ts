import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDocument, listDocuments, removeDocument, setDocument } from '../../../lib/firestore';
import { MASTER_DATA_CONFIGS, MasterDataRecord, MasterDataType } from '../../../types/masterData';
import { queryKeys } from '../../../constants/queryKeys';
import { timestampToISO } from '../../../utils/firestore';

const mapRecord = (record: MasterDataRecord & { id: string }) => ({
  ...record,
  updatedAt: timestampToISO((record as unknown as { updatedAt?: unknown }).updatedAt) ?? undefined,
});

export const useMasterData = (type: MasterDataType) => {
  const config = MASTER_DATA_CONFIGS[type];
  return useQuery({
    queryKey: queryKeys.masterData(config.collection),
    queryFn: async () => {
      const docs = await listDocuments<MasterDataRecord>(config.collection, 'updatedAt');
      return docs.map(mapRecord);
    },
  });
};

export const useMasterDataMutations = (type: MasterDataType) => {
  const config = MASTER_DATA_CONFIGS[type];
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.masterData(config.collection) });

  const create = useMutation({
    mutationFn: (payload: MasterDataRecord) => addDocument(config.collection, payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MasterDataRecord> }) =>
      setDocument(`${config.collection}/${id}`, data as MasterDataRecord),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeDocument(`${config.collection}/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
};
