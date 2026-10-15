// Art direction for generated footage. Pure data (no imports) so scripts can load it.
// Shared look: warm natural daylight, ivory/sand/oak palette, realistic proportions, no people, no text.
const STYLE = 'Photorealistic architectural film, shot on a cinema camera, 35mm lens, natural daylight with warm ambient light, ivory, sand and oak palette, realistic interior proportions, refined natural materials, no people, no text, no logos, no watermarks, smooth continuous camera movement.';

export const videoPrompts: Record<string, { motion: string; scene: string }> = {
  home: { motion: 'Slow steady dolly forward', scene: 'through a spacious luxury living and dining space with a stone feature wall, linen sofa, oak flooring and floor-to-ceiling windows with sheer curtains' },
  kitchen: { motion: 'Slow lateral slide', scene: 'along a contemporary kitchen with oak veneer cabinets, a honed stone island, brushed brass handles and soft pendant lighting' },
  bedroom: { motion: 'Gentle slow push-in', scene: 'toward a calm master bedroom with a fluted wood headboard wall, linen bedding, warm bedside lamps and morning light through sheer curtains' },
  bathroom: { motion: 'Slow glide forward', scene: 'through a serene bathroom with travertine-look walls, a floating timber vanity, a freestanding stone bath and soft warm lighting' },
  'living-dining': { motion: 'Slow dolly sideways', scene: 'across an elegant living and dining area with a sculptural pendant above a timber dining table, textured plaster walls and natural light' },
  office: { motion: 'Slow forward tracking shot', scene: 'through a refined modern office with a timber reception desk, acoustic wall panels, a glass-walled meeting room and warm task lighting' },
  about: { motion: 'Slow upward tilt', scene: 'across a designer material library with fabric swatches, timber samples and stone tiles on a sunlit table' },
};

export const buildPrompt = (slot: string) => {
  const p = videoPrompts[slot];
  return p ? `${p.motion} ${p.scene}. ${STYLE}` : null;
};
