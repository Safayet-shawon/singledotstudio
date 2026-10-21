// Approved font families (pure module, safe for client components).
export const FONTS = {
  heading: [
    { key: 'cormorant', label: 'Cormorant Garamond', stack: "var(--f-cormorant), 'Cormorant Garamond', Georgia, serif" },
    { key: 'playfair', label: 'Playfair Display', stack: "var(--f-playfair), 'Playfair Display', Georgia, serif" },
    { key: 'lora', label: 'Lora', stack: "var(--f-lora), Lora, Georgia, serif" },
    { key: 'dmserif', label: 'DM Serif Display', stack: "var(--f-dmserif), 'DM Serif Display', Georgia, serif" },
  ],
  body: [
    { key: 'nunito', label: 'Nunito Sans', stack: "var(--f-nunito), 'Nunito Sans', system-ui, sans-serif" },
    { key: 'jost', label: 'Jost', stack: "var(--f-jost), Jost, system-ui, sans-serif" },
    { key: 'inter', label: 'Inter', stack: "var(--f-inter), Inter, system-ui, sans-serif" },
    { key: 'dmsans', label: 'DM Sans', stack: "var(--f-dmsans), 'DM Sans', system-ui, sans-serif" },
  ],
} as const;
export type HeadingFont = (typeof FONTS.heading)[number]['key'];
export type BodyFont = (typeof FONTS.body)[number]['key'];

