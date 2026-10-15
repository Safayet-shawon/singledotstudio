import fs from 'node:fs';
import path from 'node:path';

/** Local-dev lead log. Disabled on Vercel (read-only filesystem); leads there are delivered by email only. */
export function saveLeadLocally(kind: string, data: unknown): boolean {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return false;
  try {
    const file = path.join(process.cwd(), 'data', 'leads.jsonl');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), kind, ...(data as object) }) + '\n');
    return true;
  } catch {
    return false;
  }
}
