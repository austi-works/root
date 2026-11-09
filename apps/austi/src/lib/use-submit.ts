import { ConvexError } from 'convex/values';
import { useCallback, useState } from 'react';

const errorMessage = (error: unknown) =>
  error instanceof ConvexError && typeof error.data === 'string'
    ? error.data
    : 'Something went wrong. Please try again.';

/** Tracks one async action's pending and error state. */
export const useSubmit = <Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (...args: Args) => {
      setPending(true);
      setError(null);
      try {
        return { ok: true as const, value: await action(...args) };
      } catch (cause) {
        setError(errorMessage(cause));
        return { ok: false as const };
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { submit, pending, error };
};
