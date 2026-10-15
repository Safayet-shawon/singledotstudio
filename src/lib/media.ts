import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'public', 'media');
const find = (dir: string, slot: string, exts: string[]) => {
  for (const e of exts) if (fs.existsSync(path.join(root, dir, `${slot}.${e}`))) return `/media/${dir}/${slot}.${e}`;
  return null;
};
/** Resolved at build/render time on the server. Returns null when the file has not been supplied yet. */
export const findImage = (slot: string) => find('img', slot, ['webp', 'jpg', 'jpeg', 'png', 'avif']);
export const findVideo = (slot: string) => find('video', slot, ['mp4', 'webm']);
