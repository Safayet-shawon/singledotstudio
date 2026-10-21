import { requireUser, pageCan } from '@/server/auth';
import { createClientAction } from '@/server/actions/clients';
import { ActionForm } from '@/components/admin/Forms';
import { ClientFields } from '@/components/admin/ClientFields';
import { Card } from '@/components/admin/Ui';

export const metadata = { title: 'New client' };

export default async function NewClient() {
  const u = await requireUser();
  pageCan(u, 'client.create');
  return <div style={{ maxWidth: 760 }}><Card title="Create client"><ActionForm action={createClientAction} submit="Create client"><ClientFields contact /></ActionForm></Card></div>;
}
