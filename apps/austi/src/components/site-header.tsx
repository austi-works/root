import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/ui/dropdown-menu';
import { Separator } from '@workspace/ui/components/ui/separator';
import { SidebarTrigger } from '@workspace/ui/components/ui/sidebar';
import { useWorkosAuth } from '@workspace/web-foundation';
import { LoaderCircleIcon, LogOutIcon } from 'lucide-react';

import { AppBreadcrumbs } from '#/components/navigation/app-breadcrumbs';

export function SiteHeader() {
  return (
    <header className='flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)'>
      <div className='flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mx-2 h-4 data-vertical:self-auto' />
        <AppBreadcrumbs />
        <div className='ml-auto flex shrink-0 items-center gap-2'>
          <UserActions />
        </div>
      </div>
    </header>
  );
}

export function UserActions() {
  const { user, signOut, loading } = useWorkosAuth();
  const initials = [user?.firstName, user?.lastName].map((name) => name?.[0] ?? '').join('');

  if (loading)
    return (
      <LoaderCircleIcon
        role='status'
        className='size-4 animate-spin'
        aria-label='Loading account'
      />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label='Account menu'
        render={<button type='button' className='rounded-full' />}
      >
        <Avatar>
          <AvatarImage src={user?.profilePictureUrl || ''} alt='' />
          <AvatarFallback>{initials || user?.email?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOutIcon className='size-4' />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
