import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  increment,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserStats } from './types';

const ONLINE_TTL_MS = 45_000;
const USERS = 'users';

function mapUser(id: string, data: DocumentData): UserStats {
  const lastSeenAt = typeof data.lastSeenAt === 'string' ? data.lastSeenAt : null;
  const lastSeen = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  return {
    id,
    name: String(data.name || 'Игрок'),
    email: typeof data.email === 'string' ? data.email : null,
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    total: Number(data.total || 0),
    correct: Number(data.correct || 0),
    incorrect: Number(data.incorrect || 0),
    online: Date.now() - lastSeen <= ONLINE_TTL_MS,
    lastSeenAt,
  };
}

export async function upsertUserProfile(input: {
  id: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
}): Promise<UserStats> {
  const ref = doc(db, USERS, input.id);
  const snap = await getDoc(ref);
  const now = new Date().toISOString();

  if (!snap.exists()) {
    const payload = {
      name: input.name,
      email: input.email || null,
      photoURL: input.photoURL || null,
      total: 0,
      correct: 0,
      incorrect: 0,
      lastSeenAt: now,
      createdAt: now,
    };
    await setDoc(ref, payload);
    return mapUser(input.id, payload);
  }

  await updateDoc(ref, {
    name: input.name,
    email: input.email || null,
    photoURL: input.photoURL || null,
    lastSeenAt: now,
  });
  return mapUser(input.id, { ...snap.data(), name: input.name, lastSeenAt: now });
}

export async function fetchUsers(): Promise<UserStats[]> {
  const snap = await getDocs(collection(db, USERS));
  const users = snap.docs.map((d) => mapUser(d.id, d.data()));
  return users.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return b.correct - a.correct || b.total - a.total;
  });
}

export async function sendHeartbeat(userId: string): Promise<UserStats> {
  const ref = doc(db, USERS, userId);
  const now = new Date().toISOString();
  await updateDoc(ref, { lastSeenAt: now });
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Пользователь не найден');
  }
  return mapUser(userId, { ...snap.data(), lastSeenAt: now });
}

export async function reportAnswer(
  userId: string,
  correct: boolean,
): Promise<UserStats> {
  const ref = doc(db, USERS, userId);
  const now = new Date().toISOString();
  await updateDoc(ref, {
    total: increment(1),
    correct: increment(correct ? 1 : 0),
    incorrect: increment(correct ? 0 : 1),
    lastSeenAt: now,
  });
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Пользователь не найден');
  }
  return mapUser(userId, snap.data());
}

export async function getUser(userId: string): Promise<UserStats | null> {
  const snap = await getDoc(doc(db, USERS, userId));
  if (!snap.exists()) return null;
  return mapUser(userId, snap.data());
}
