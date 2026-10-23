import { Input } from '@workspace/ui/components/ui/input';
import { useAction } from 'convex/react';

import { api } from '#convex/_generated/api';
import type { Id } from '#convex/_generated/dataModel';

import { Field } from './components';

export function AttachmentInput() {
  return (
    <Field id='attachments' label='Photos or documents (up to 8; 2 MB each)'>
      <Input
        id='attachments'
        name='attachments'
        type='file'
        multiple
        accept='image/jpeg,image/png,image/webp,application/pdf'
      />
    </Field>
  );
}
export const useAttachments = () => {
  const upload = useAction(api.austi.files.upload);
  return async (data: FormData, scope: { caseId?: Id<'austiCases'>; token?: string }) => {
    const files = data
      .getAll('attachments')
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length > 8 || files.some((f) => f.size > 2 * 1024 * 1024))
      throw new Error('Choose at most 8 files, each smaller than 2 MB.');
    const result: { storageId: Id<'_storage'>; name: string }[] = [];
    for (const file of files) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === 'string'
            ? resolve(reader.result.split(',')[1])
            : reject(new Error('Could not read this file.'));
        reader.onerror = () => reject(new Error('Could not read this file.'));
        reader.readAsDataURL(file);
      });
      result.push(await upload({ ...scope, name: file.name, base64 }));
    }
    return result;
  };
};
