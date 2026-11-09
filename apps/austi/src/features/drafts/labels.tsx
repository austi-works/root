import { Badge } from '@workspace/ui/components/ui/badge';

import type { Channel, DraftStatus } from '#convex/marketing/validators';

export const channelLabels: Record<Channel, string> = {
  ads: 'Ad',
  social: 'Social post',
  email: 'Email',
  search: 'Search article',
};

export const statusLabels: Record<DraftStatus, string> = {
  pending: 'Needs review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  held: 'On hold',
};

// The app stays monochrome, so state reads through fill and emphasis rather than colour.
const statusVariants: Record<DraftStatus, 'default' | 'outline' | 'secondary'> = {
  pending: 'outline',
  changes_requested: 'secondary',
  approved: 'default',
  held: 'secondary',
};

export function StatusBadge({ status }: { status: DraftStatus }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>;
}
