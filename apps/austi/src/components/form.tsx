import { Button } from '@workspace/ui/components/ui/button';
import { Label } from '@workspace/ui/components/ui/label';
import { useId, type ComponentProps, type FormEvent, type ReactNode } from 'react';

export function Form({
  onSubmit,
  children,
  ...props
}: Omit<ComponentProps<'form'>, 'onSubmit'> & { onSubmit: () => void }) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className='max-w-2xl space-y-5' {...props}>
      {children}
    </form>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();

  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {hint && <p className='text-sm text-muted-foreground'>{hint}</p>}
    </div>
  );
}

function FormFooter({
  pending,
  error,
  label,
  children,
}: {
  pending: boolean;
  error: string | null;
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className='space-y-3'>
      {error && (
        <p role='alert' className='text-sm text-danger'>
          {error}
        </p>
      )}
      <div className='flex flex-wrap items-center gap-2'>
        <Button type='submit' disabled={pending}>
          {label}
        </Button>
        {children}
      </div>
    </div>
  );
}

Form.Field = FormField;
Form.Footer = FormFooter;
