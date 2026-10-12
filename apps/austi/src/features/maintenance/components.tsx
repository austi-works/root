import { Badge } from '@workspace/ui/components/ui/badge';
import { Button } from '@workspace/ui/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/ui/dialog';
import { Input } from '@workspace/ui/components/ui/input';
import { Label } from '@workspace/ui/components/ui/label';
import { ConvexError } from 'convex/values';
import { Search } from 'lucide-react';
import { useState, type ComponentProps, type ReactNode } from 'react';

import type { CaseStatus, MaintenanceCase } from '#/features/maintenance/data';

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className='min-h-0 flex-1 overflow-y-auto'>
      <h1 className='sr-only'>{title}</h1>
      <div className='mx-auto w-full max-w-7xl space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-8'>
        {children}
      </div>
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-sm font-bold'>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className='relative w-full sm:max-w-72'>
      <Search
        aria-hidden='true'
        className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground'
      />
      <Input
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className='pl-9'
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  const variant =
    status === 'Needs review'
      ? 'destructive'
      : ['Awaiting approval', 'New', 'Resolved'].includes(status)
        ? 'secondary'
        : 'outline';
  return (
    <Badge variant={variant} className='whitespace-nowrap font-normal'>
      {status}
    </Badge>
  );
}

export function Urgency({ value }: { value: MaintenanceCase['urgency'] }) {
  const tone =
    value === 'Emergency'
      ? 'text-destructive'
      : value === 'Urgent'
        ? 'text-foreground'
        : 'text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap text-xs ${tone}`}>
      <span aria-hidden='true' className='size-1.5 rounded-full bg-current' />
      {value}
    </span>
  );
}

export function ActionDialog({
  title,
  trigger,
  triggerVariant = 'outline',
  confirmLabel = 'Confirm',
  children,
  onSubmit,
}: {
  title: string;
  trigger: ReactNode;
  triggerVariant?: ComponentProps<typeof Button>['variant'];
  confirmLabel?: string;
  children?: ReactNode;
  onSubmit: (data: FormData) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError('');
        }
      }}
    >
      <DialogTrigger render={<Button variant={triggerVariant} size='sm' />}>
        {trigger}
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className='max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md'
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className='space-y-4'
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending) return;
            const data = new FormData(e.currentTarget);
            setPending(true);
            setError('');
            try {
              await onSubmit(data);
              setOpen(false);
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setPending(false);
            }
          }}
        >
          <fieldset disabled={pending} className='space-y-4 py-2'>
            {open && children}
          </fieldset>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button type='button' variant='outline' disabled={pending} />}>
              Cancel
            </DialogClose>
            <Button type='submit' disabled={pending}>
              {pending ? 'Saving…' : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const errorMessage = (error: unknown) =>
  error instanceof ConvexError
    ? String(error.data)
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';

export function TextField({
  name,
  label,
  defaultValue,
  type = 'text',
  required = true,
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <Field id={name} label={label}>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </Field>
  );
}
