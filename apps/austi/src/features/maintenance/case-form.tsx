import { useNavigate } from '@tanstack/react-router';
import { NativeSelect, NativeSelectOption } from '@workspace/ui/components/ui/native-select';
import { Textarea } from '@workspace/ui/components/ui/textarea';
import { useMutation } from 'convex/react';

import { api } from '#convex/_generated/api';

import { ActionDialog, Field, TextField } from './components';
import { datetimeValue, field, trades, type MaintenanceCase } from './data';
import { useWorkspace } from './workspace';

export const caseValues = (data: FormData) => ({
  title: field(data, 'title'),
  property: field(data, 'property'),
  unit: field(data, 'unit'),
  category: field(data, 'category') as MaintenanceCase['category'],
  urgency: field(data, 'urgency') as MaintenanceCase['urgency'],
  report: field(data, 'report'),
  access: field(data, 'access'),
  resident: { name: field(data, 'residentName'), email: field(data, 'residentEmail') },
  owner: { name: field(data, 'ownerName'), email: field(data, 'ownerEmail') },
});

export function CaseFields({ item }: { item?: MaintenanceCase }) {
  return (
    <>
      <TextField name='title' label='Issue' defaultValue={item?.title} />
      <div className='grid gap-4 sm:grid-cols-2'>
        <TextField name='property' label='Property address' defaultValue={item?.property} />
        <TextField name='unit' label='Unit' defaultValue={item?.unit} />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <Field id='category' label='Trade'>
          <NativeSelect name='category' id='category' defaultValue={item?.category ?? trades[0]}>
            {trades.map((t) => (
              <NativeSelectOption key={t}>{t}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field id='urgency' label='Urgency'>
          <NativeSelect name='urgency' id='urgency' defaultValue={item?.urgency ?? 'Routine'}>
            {['Routine', 'Urgent', 'Emergency'].map((t) => (
              <NativeSelectOption key={t}>{t}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field id='report' label='Report'>
        <Textarea
          id='report'
          name='report'
          required
          maxLength={5000}
          rows={4}
          defaultValue={item?.report}
        />
      </Field>
      <div className='grid gap-4 sm:grid-cols-2'>
        <TextField name='residentName' label='Resident name' defaultValue={item?.resident.name} />
        <TextField
          name='residentEmail'
          type='email'
          label='Resident email'
          defaultValue={item?.resident.email}
          required={!item?.source}
        />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <TextField name='ownerName' label='Owner name' defaultValue={item?.owner.name} />
        <TextField
          name='ownerEmail'
          type='email'
          label='Owner email'
          defaultValue={item?.owner.email}
        />
      </div>
      <Field id='access' label='Access instructions'>
        <Textarea id='access' name='access' maxLength={2000} defaultValue={item?.access} />
      </Field>
    </>
  );
}
export function CaseForm({ item }: { item?: MaintenanceCase }) {
  const workspace = useWorkspace();
  const create = useMutation(api.austi.cases.create);
  const edit = useMutation(api.austi.cases.edit);
  const navigate = useNavigate();
  if (!workspace) return null;
  return (
    <ActionDialog
      title={item ? 'Edit case' : 'New maintenance case'}
      trigger={item ? 'Edit case' : 'Add case manually'}
      triggerVariant='outline'
      confirmLabel={item ? 'Save changes' : 'Create case'}
      onSubmit={async (data) => {
        if (item)
          await edit({
            id: item._id,
            ...caseValues(data),
            coordinator: field(data, 'coordinator'),
            nextAction: field(data, 'nextAction'),
            dueAt: new Date(field(data, 'dueAt')).getTime(),
            reminderHours: Number(field(data, 'reminderHours')),
            maxReminders: Number(field(data, 'maxReminders')),
            automation: data.has('automation'),
            presenceRequired: data.has('presenceRequired'),
          });
        else {
          const id = await create({ workspace, ...caseValues(data) });
          await navigate({ to: '/maintenance/$caseId', params: { caseId: id } });
        }
      }}
    >
      <CaseFields item={item} />
      {item && (
        <>
          <TextField name='coordinator' label='Coordinator' defaultValue={item.coordinator} />
          <TextField name='nextAction' label='Next action' defaultValue={item.nextAction} />
          <TextField
            name='dueAt'
            label='Next action due'
            type='datetime-local'
            defaultValue={datetimeValue(item.dueAt)}
          />
          <div className='grid gap-4 sm:grid-cols-2'>
            <TextField
              name='reminderHours'
              label='Hours between reminders (1–168)'
              type='number'
              defaultValue={item.reminderHours}
            />
            <TextField
              name='maxReminders'
              label='Reminders before escalation (0–5)'
              type='number'
              defaultValue={item.maxReminders}
            />
          </div>
          <label className='flex items-center gap-2 text-sm'>
            <input name='automation' type='checkbox' defaultChecked={item.automation} />
            Automatic reminders
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <input name='presenceRequired' type='checkbox' defaultChecked={item.presenceRequired} />
            Resident must be present
          </label>
        </>
      )}
    </ActionDialog>
  );
}
