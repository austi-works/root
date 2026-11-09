import { v, type Infer } from 'convex/values';

export const channelValidator = v.union(
  v.literal('ads'),
  v.literal('social'),
  v.literal('email'),
  v.literal('search'),
);
export type Channel = Infer<typeof channelValidator>;
export const CHANNELS: Channel[] = ['ads', 'social', 'email', 'search'];

export const draftStatusValidator = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('changes_requested'),
  v.literal('held'),
);
export type DraftStatus = Infer<typeof draftStatusValidator>;
export const DRAFT_STATUSES: DraftStatus[] = ['pending', 'changes_requested', 'approved', 'held'];

export const learnStatusValidator = v.union(
  v.literal('idle'),
  v.literal('learning'),
  v.literal('ready'),
  v.literal('failed'),
);

export const campaignStatusValidator = v.union(
  v.literal('generating'),
  v.literal('ready'),
  v.literal('failed'),
);

export const generationKindValidator = v.union(
  v.literal('learn'),
  v.literal('campaign'),
  v.literal('revision'),
);
export type GenerationKind = Infer<typeof generationKindValidator>;
