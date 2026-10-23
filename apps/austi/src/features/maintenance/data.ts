import type { Doc } from '#convex/_generated/dataModel';

export { statuses, trades } from '#convex/austi/validators';
export type MaintenanceCase = Doc<'austiCases'>;
export type Contractor = Doc<'austiContractors'>;
export type CaseStatus = MaintenanceCase['status'];
export const isClosed = (item: MaintenanceCase) => ['Resolved', 'Cancelled'].includes(item.status);
export const checkIfNeedsAttention = (item: MaintenanceCase, now: number) =>
  !isClosed(item) &&
  (item.overdue ||
    (item.dueAt !== undefined && item.dueAt <= now) ||
    ['New', 'Needs review'].includes(item.status) ||
    item.responsible === 'Coordinator');
export const formatEuro = (cents: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const formatDate = (time?: number) =>
  time === undefined
    ? 'Not set'
    : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(time);
export const age = (time: number, now: number) => {
  const hours = Math.max(0, Math.floor((now - time) / 3600000));
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
};
export const datetimeValue = (time = Date.now() + 86400000) => {
  const date = new Date(time);
  return new Date(time - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const field = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
};
