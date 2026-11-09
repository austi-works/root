import { createFileRoute } from '@tanstack/react-router';
import { Label } from '@workspace/ui/components/ui/label';

import { Page } from '#/components/page';
import { ThemeSelect } from '#/components/settings/theme-select';

export const Route = createFileRoute('/_app/settings')({
  staticData: { breadcrumb: 'Settings' },
  head: () => ({ meta: [{ title: 'Settings · Austi' }] }),
  component: Settings,
});

function Settings() {
  return (
    <Page>
      <Page.Header title='Settings' />
      <Page.Section title='Appearance'>
        <div className='flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-1'>
          <Label htmlFor='appearance-theme' className='font-normal'>
            Theme
          </Label>
          <ThemeSelect id='appearance-theme' />
        </div>
      </Page.Section>
    </Page>
  );
}
