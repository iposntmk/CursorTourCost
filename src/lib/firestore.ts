import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

type PathArgs = string | string[];

const toPathSegments = (path: PathArgs): string[] => {
  if (Array.isArray(path)) return path;
  return path.split('/').filter(Boolean);
};

const omitUndefined = <T extends Record<string, unknown>>(data: T) => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as T;
};

export const collectionFromPath = (path: PathArgs) => {
  const segments = toPathSegments(path);
  return collection(db, segments.join('/'));
};

export const docFromPath = (path: PathArgs) => {
  const segments = toPathSegments(path);
  return doc(db, segments.join('/'));
};

export const listDocuments = async <T = DocumentData>(path: PathArgs, sortField?: string) => {
  const ref = collectionFromPath(path);
  const q = sortField ? query(ref, orderBy(sortField, 'desc')) : ref;
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as (T & { id: string })[];
};

export const getDocument = async <T = unknown>(path: PathArgs) => {
  const ref = docFromPath(path);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as T & { id: string };
};

export const addDocument = async <T extends Record<string, unknown>>(path: PathArgs, data: T) => {
  const ref = collectionFromPath(path);
  const payload = omitUndefined(data);
  const created = await addDoc(ref, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
};

export const setDocument = async <T extends Record<string, unknown>>(path: PathArgs, data: T) => {
  const ref = docFromPath(path);
  const payload = omitUndefined(data);
  await setDoc(
    ref,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const updateDocument = async <T extends Record<string, unknown>>(path: PathArgs, data: Partial<T>) => {
  const ref = docFromPath(path);
  const payload = omitUndefined(data as Record<string, unknown>);
  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
};

export const removeDocument = async (path: PathArgs) => {
  const ref = docFromPath(path);
  await deleteDoc(ref);
};
