import { APP_CONFIG } from './config';
import { getValidIdToken } from './session';
import type { UserStats } from './types';

const ONLINE_TTL_MS = 45_000;
const PROJECT = APP_CONFIG.firebase.projectId;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  nullValue?: null;
};

type FirestoreDoc = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

function mapUser(id: string, fields: Record<string, FirestoreValue> = {}): UserStats {
  const lastSeenAt = fields.lastSeenAt?.stringValue || null;
  const lastSeen = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const nicknameRaw = fields.nickname?.stringValue?.trim();
  return {
    id,
    name: fields.name?.stringValue || 'Игрок',
    nickname: nicknameRaw || null,
    email: fields.email?.stringValue || null,
    photoURL: fields.photoURL?.stringValue || null,
    total: Number(fields.total?.integerValue || 0),
    correct: Number(fields.correct?.integerValue || 0),
    incorrect: Number(fields.incorrect?.integerValue || 0),
    online: Date.now() - lastSeen <= ONLINE_TTL_MS,
    lastSeenAt,
  };
}

function str(value: string | null | undefined): FirestoreValue {
  if (value == null) return { nullValue: null };
  return { stringValue: value };
}

function int(value: number): FirestoreValue {
  return { integerValue: String(Math.trunc(value)) };
}

function docIdFromName(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getValidIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function friendlyError(status: number, body: unknown): Error {
  const message =
    typeof body === 'object' && body && 'error' in body
      ? String((body as { error?: { message?: string } }).error?.message || status)
      : String(status);

  if (status === 403 || /PERMISSION|permission/i.test(message)) {
    return new Error(
      'Нет доступа к Firestore. Проверьте Rules: read для авторизованных, write своего документа.',
    );
  }
  if (status === 404 || /not found|NOT_FOUND/i.test(message)) {
    return new Error(
      'Firestore не найден. В Firebase создайте базу: Build → Firestore Database.',
    );
  }
  return new Error(message || `Ошибка сети (${status})`);
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function getUserDoc(userId: string): Promise<FirestoreDoc | null> {
  const headers = await authHeaders();
  const response = await fetch(`${BASE}/users/${userId}`, { headers });
  if (response.status === 404) return null;
  const body = await parseJson(response);
  if (!response.ok) throw friendlyError(response.status, body);
  return body as FirestoreDoc;
}

export async function upsertUserProfile(input: {
  id: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
  /** undefined = keep existing nickname; null/'' = clear */
  nickname?: string | null;
}): Promise<UserStats> {
  const headers = await authHeaders();
  const now = new Date().toISOString();
  const existing = await getUserDoc(input.id);

  const total = Number(existing?.fields?.total?.integerValue || 0);
  const correct = Number(existing?.fields?.correct?.integerValue || 0);
  const incorrect = Number(existing?.fields?.incorrect?.integerValue || 0);

  let nicknameField: FirestoreValue;
  if (input.nickname !== undefined) {
    const trimmed = input.nickname?.trim() || null;
    nicknameField = str(trimmed);
  } else if (existing?.fields?.nickname) {
    nicknameField = existing.fields.nickname;
  } else {
    nicknameField = str(null);
  }

  const fields = {
    name: str(input.name),
    email: str(input.email || null),
    photoURL: str(input.photoURL || null),
    nickname: nicknameField,
    lastSeenAt: str(now),
    total: int(total),
    correct: int(correct),
    incorrect: int(incorrect),
  };

  if (!existing) {
    const create = await fetch(`${BASE}/users?documentId=${encodeURIComponent(input.id)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          ...fields,
          createdAt: str(now),
        },
      }),
    });
    const createdBody = await parseJson(create);
    if (!create.ok) throw friendlyError(create.status, createdBody);
    return mapUser(input.id, (createdBody as FirestoreDoc).fields || fields);
  }

  const response = await fetch(`${BASE}/users/${input.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });
  const body = await parseJson(response);
  if (!response.ok) throw friendlyError(response.status, body);
  return mapUser(input.id, (body as FirestoreDoc).fields || fields);
}

export async function fetchUsers(): Promise<UserStats[]> {
  const headers = await authHeaders();
  const response = await fetch(`${BASE}/users`, { headers });
  const body = await parseJson(response);
  if (!response.ok) throw friendlyError(response.status, body);

  const documents = (body as { documents?: FirestoreDoc[] }).documents || [];
  const users = documents.map((doc) =>
    mapUser(docIdFromName(doc.name || ''), doc.fields || {}),
  );

  return users.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return b.correct - a.correct || b.total - a.total;
  });
}

export async function sendHeartbeat(userId: string): Promise<UserStats> {
  const existing = await getUserDoc(userId);
  const headers = await authHeaders();
  const now = new Date().toISOString();
  const response = await fetch(
    `${BASE}/users/${userId}?updateMask.fieldPaths=lastSeenAt`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          lastSeenAt: str(now),
        },
      }),
    },
  );
  const body = await parseJson(response);
  if (!response.ok) throw friendlyError(response.status, body);
  return mapUser(userId, {
    ...(existing?.fields || {}),
    ...((body as FirestoreDoc).fields || {}),
    lastSeenAt: str(now),
  });
}

export async function reportAnswer(
  userId: string,
  correctAnswer: boolean,
): Promise<UserStats> {
  const existing = await getUserDoc(userId);
  if (!existing?.fields) {
    throw new Error('Профиль не найден. Войдите снова.');
  }

  const fields = existing.fields;
  const total = Number(fields.total?.integerValue || 0) + 1;
  const correct = Number(fields.correct?.integerValue || 0) + (correctAnswer ? 1 : 0);
  const incorrect =
    Number(fields.incorrect?.integerValue || 0) + (correctAnswer ? 0 : 1);
  const now = new Date().toISOString();

  const headers = await authHeaders();
  const patch = await fetch(
    `${BASE}/users/${userId}?updateMask.fieldPaths=total&updateMask.fieldPaths=correct&updateMask.fieldPaths=incorrect&updateMask.fieldPaths=lastSeenAt`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          total: int(total),
          correct: int(correct),
          incorrect: int(incorrect),
          lastSeenAt: str(now),
        },
      }),
    },
  );
  const patchBody = await parseJson(patch);
  if (!patch.ok) throw friendlyError(patch.status, patchBody);

  return mapUser(userId, {
    ...fields,
    total: int(total),
    correct: int(correct),
    incorrect: int(incorrect),
    lastSeenAt: str(now),
  });
}
