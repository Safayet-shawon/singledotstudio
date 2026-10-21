import { findImage } from '@/lib/media';
import { getContent, mediaUrl } from './cms';

/** CMS replacement when one is published, otherwise the bundled file for the slot. */
export async function resolveImage(slot: string): Promise<string | null> {
  const id = (await getContent()).images[slot];
  return id ? mediaUrl(id) : findImage(slot);
}
