import type { ReactNode } from 'react';

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className='min-h-0 flex-1 overflow-y-auto'>
      <div className='mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8'>
        {children}
      </div>
    </div>
  );
}

function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className='flex flex-wrap items-start justify-between gap-4'>
      <div className='min-w-0 space-y-1'>
        <h1 className='text-2xl font-medium tracking-tight text-balance'>{title}</h1>
        {description && <p className='max-w-2xl text-muted-foreground'>{description}</p>}
      </div>
      {children && <div className='flex shrink-0 items-center gap-2'>{children}</div>}
    </header>
  );
}

function PageSection({
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
        <h2 className='text-sm font-medium'>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PageEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className='flex flex-col items-start gap-3 border-y py-10'>
      <p className='text-muted-foreground'>{title}</p>
      {children}
    </div>
  );
}

function PageNotice({
  tone = 'muted',
  children,
}: {
  tone?: 'muted' | 'danger';
  children: ReactNode;
}) {
  return (
    <p
      role='status'
      className={tone === 'danger' ? 'text-sm text-danger' : 'text-sm text-muted-foreground'}
    >
      {children}
    </p>
  );
}

Page.Header = PageHeader;
Page.Section = PageSection;
Page.Empty = PageEmpty;
Page.Notice = PageNotice;
