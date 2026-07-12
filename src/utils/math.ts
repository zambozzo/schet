import type { MathProblem, Operation } from '../types';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateProblem(): MathProblem {
  const operation: Operation = Math.random() < 0.5 ? '+' : '-';

  if (operation === '+') {
    const a = randomInt(0, 100);
    const b = randomInt(0, 100);
    return {
      a,
      b,
      operation,
      answer: a + b,
      display: `${a} + ${b} = ?`,
    };
  }

  const a = randomInt(0, 100);
  const b = randomInt(0, a);
  return {
    a,
    b,
    operation,
    answer: a - b,
    display: `${a} − ${b} = ?`,
  };
}
