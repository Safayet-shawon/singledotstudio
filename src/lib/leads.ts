import fs from 'node:fs';
import path from 'node:path';
import { get, list, put } from '@vercel/blob';

export interface LeadRecord {
  reference: string;
  kind: 'quotation' | 'consultation';
  at: string;
  [k: string]: unknown;
}

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localFile = () => path.join(process.cwd(), 'data', 'leads.jsonl');

/** Persists a lead for the admin panel: Vercel Blob (private) when configured, a local JSONL file in development. */
export async function saveLead(lead: LeadRecord): Promise<boolean> {
  if (hasBlob()) {
    try {
      await put(`leads/${lead.at}_${lead.reference}.json`, JSON.stringify(lead), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
      return true;
    } catch (err) {
      console.error('[leads] blob save failed:', (err as Error).message);
      return false;
    }
  }
  if (process.env.VERCEL) return false;
  try {
    fs.mkdirSync(path.dirname(localFile()), { recursive: true });
    fs.appendFileSync(localFile(), JSON.stringify(lead) + '\n');
    return true;
  } catch {
    return false;
  }
}

export async function listLeads(limit = 200): Promise<LeadRecord[]> {
  if (hasBlob()) {
    const { blobs } = await list({ prefix: 'leads/', limit: 1000 });
    const newest = blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1)).slice(0, limit);
    const out = await Promise.all(newest.map(async (b) => {
      try {
        const res = await get(b.pathname, { access: 'private' });
        if (!res || res.statusCode !== 200) return null;
        return JSON.parse(await new Response(res.stream).text()) as LeadRecord;
      } catch { return null; }
    }));
    return out.filter((x): x is LeadRecord => !!x);
  }
  try {
    return fs.readFileSync(localFile(), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as LeadRecord).reverse().slice(0, limit);
  } catch {
    return [];
  }
}

/** One lead by reference (used for the customer's quotation link). */
export async function getLead(reference: string): Promise<LeadRecord | null> {
  if (!/^[A-Z]{3}-\d{8}-[0-9A-F]{4}$/.test(reference)) return null;
  if (hasBlob()) {
    try {
      const { blobs } = await list({ prefix: 'leads/', limit: 1000 });
      const hit = blobs.find((b) => b.pathname.endsWith(`_${reference}.json`));
      if (!hit) return null;
      const res = await get(hit.pathname, { access: 'private' });
      if (!res || res.statusCode !== 200) return null;
      return JSON.parse(await new Response(res.stream).text()) as LeadRecord;
    } catch { return null; }
  }
  return (await listLeads(1000)).find((l) => l.reference === reference) ?? null;
}
