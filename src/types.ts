export type UserStats = {
  id: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
  total: number;
  correct: number;
  incorrect: number;
  online: boolean;
  lastSeenAt: string | null;
};

export type Operation = '+' | '-';

export type MathProblem = {
  a: number;
  b: number;
  operation: Operation;
  answer: number;
  display: string;
};

export type UpdateInfo = {
  version: string;
  tagName: string;
  downloadUrl: string;
  notes: string;
};
