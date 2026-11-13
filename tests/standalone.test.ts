import { describe, it, expect } from 'vitest';
import { createStandaloneStore } from '../src/standalone/store.ts';

function memory() {
 const data = new Map<string, string>();
 return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
describe('standalone Pages persistence', () => {
 it('keeps two case plans independently and restores committed answers', () => {
  const storage = memory();
  const store = createStandaloneStore(storage, () => 1000);
  const bonus = store.load('bonus');
  const saved = store.save({ ...bonus, plan: { ...bonus.plan, initiative: { purpose: 'Понятный переход', outcome: '', change: '' } } });
  expect(saved.revision).toBe(bonus.revision + 1);
  expect(store.load('medical').plan.initiative.purpose).toBe('');
  expect(createStandaloneStore(storage).load('bonus').plan.initiative.purpose).toBe('Понятный переход');
 });
 it('preserves malformed storage and rejects unreadable data without replacing it', () => {
  const storage = memory();
  const store = createStandaloneStore(storage);
  store.save(store.load('bonus'));
  const key = [...storage.data.keys()][0];
  storage.setItem(key, '{broken');
  expect(() => store.load('bonus')).toThrow(/поврежден/);
  expect(storage.getItem(key)).toBe('{broken');
 });
 it('does not report a failed write as saved', () => {
  const storage = memory();
  const store = createStandaloneStore(storage);
  const round = store.load('bonus');
  storage.setItem = () => { throw new Error('QuotaExceeded'); };
  expect(() => store.save(round)).toThrow(/сохранить/);
  expect(round.revision).toBe(0);
 });
 it('recovers an elapsed timer and an event without clearing the plan', () => {
  let now = 1000;
  const store = createStandaloneStore(memory(), () => now);
  const round = store.load('medical');
  store.save({ ...round, status: 'running', startedAt: now, deadline: now + 30 * 60000 });
  now += 24 * 60000;
  const nearEnd = store.load('medical');
  expect(nearEnd.event?.id).toBe('medical-policies');
  now += 7 * 60000;
  const ended = store.load('medical');
  expect(ended.status).toBe('finished');
  expect(ended.remainingMs).toBe(0);
 });
 it('does not overwrite a newer plan saved in another tab', () => {
  const storage = memory();
  const first = createStandaloneStore(storage);
  const second = createStandaloneStore(storage);
  const stale = second.load('bonus');
  const newer = first.load('bonus');
  newer.plan.initiative.purpose = 'Новый ответ';
  first.save(newer);
  stale.plan.initiative.purpose = 'Старый ответ';
  expect(() => second.save(stale)).toThrow(/другой вкладке/);
  expect(first.load('bonus').plan.initiative.purpose).toBe('Новый ответ');
 });
 it('keeps saved answers readable when timer recovery cannot write', () => {
  let now = 1000;
  const storage = memory();
  const store = createStandaloneStore(storage, () => now);
  const round = store.load('bonus');
  round.plan.initiative.purpose = 'Доступный сохранённый ответ';
  store.save({ ...round, status: 'running', deadline: now + 1000 });
  storage.setItem = () => { throw new Error('QuotaExceeded'); };
  now += 2000;
  expect(store.load('bonus').plan.initiative.purpose).toBe('Доступный сохранённый ответ');
  expect(store.load('bonus').status).toBe('finished');
 });
});
