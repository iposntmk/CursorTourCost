import { useQuery } from '@tanstack/react-query';
import { listDocuments } from '../../../lib/firestore';
import { queryKeys } from '../../../constants/queryKeys';
import { ExtractionRecord } from '../../../types/extraction';
import { timestampToISO } from '../../../utils/firestore';

const COLLECTION = 'extractions';

export const useExtractionLog = () =>
  useQuery({
    queryKey: queryKeys.extractionLog,
    queryFn: async () => {
      const docs = await listDocuments<ExtractionRecord>(COLLECTION, 'createdAt');
      return docs.map((item) => ({
        ...item,
        createdAt: timestampToISO((item as unknown as { createdAt?: unknown }).createdAt) ?? undefined,
      }));
    },
  });
