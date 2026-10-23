// All business-specific content lives here. Anything marked [placeholder] must be replaced before launch.
// Values left as null are rendered as "to be added" and never as fake facts.

export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://singledotstudio.vercel.app',
  brand: { name: 'Single Dot Studio', short: 'SD', tagline: 'Interiors · Design & Build', logo: '/logo-mark.svg' as string | null },
  contact: {
    phone: null as string | null,
    email: null as string | null,
    address: null as string | null,
    hours: null as string | null,
  },
  social: [] as { label: string; href: string }[], // add only real URLs
  heroQuote: 'Spaces shaped around the way you live.',
  budgetQuote: 'A clear budget is the first well-designed room.',
  owner: {
    name: 'The Founder',
    title: 'Founder & Principal Designer, Single Dot Studio',
    quote: 'A home should not only look beautiful, it should feel like you. We design every space around the way you live, and manage it clearly from the first sketch to the final handover.',
    portrait: null as string | null,
  },
  // Unverified figures: null shows a "Placeholder" tag rather than a made-up number.
  stats: [
    { key: 'completed', label: 'Projects completed', value: null as number | null },
    { key: 'running', label: 'Projects in progress', value: null as number | null },
    { key: 'cities', label: 'Cities served', value: null as number | null },
  ],
};

export type ServiceSlug = 'kitchen' | 'bedroom' | 'bathroom' | 'living-dining' | 'office' | 'showroom';

export interface Service {
  slug: ServiceSlug;
  name: string;
  short: string;
  audience: 'home' | 'office' | 'showroom';
  costKeys: string[]; // pricing.json item keys used for the indicative cost table
  videoSlot: string;
  intro: string;
  approach: string[];
  materials: string[];
  lighting: string[];
  planning: string[];
  factors: string[];
  faqs: { q: string; a: string }[];
  related: ServiceSlug[];
  officeAreas?: string[];
  showroomAreas?: string[];
}

export const services: Service[] = [
  {
    slug: 'kitchen', name: 'Kitchen', short: 'Kitchens', audience: 'home', costKeys: ['kitchen'], videoSlot: 'kitchen',
    intro: 'Kitchens planned around how you cook, store and gather, with finishes chosen to last.',
    approach: ['We begin with your cooking habits, household size and storage needs before any finish is chosen.', 'Layouts are tested for movement and reach, then detailed with cabinetry, counters and services coordinated together.'],
    materials: ['Laminate, veneer, acrylic or lacquer shutters', 'Quartz, granite or engineered stone counters', 'Soft-close hardware and durable backsplash surfaces'],
    lighting: ['Task lighting under wall units', 'Warm ambient ceiling light', 'Accent light for open shelving'],
    planning: ['Work-triangle and clearance planning', 'Dedicated zones for prep, cooking and cleaning', 'Appliance integration and ventilation planning'],
    factors: ['Kitchen size and layout shape', 'Cabinet material and hardware grade', 'Counter and backsplash material', 'Appliance integration and plumbing/electrical changes'],
    faqs: [
      { q: 'Do you design modular and fully custom kitchens?', a: 'Both approaches can be discussed during consultation. [Placeholder: confirm studio offering.]' },
      { q: 'Can the kitchen be planned together with the rest of the home?', a: 'Yes. Planning the kitchen with adjacent living and dining areas keeps finishes and lighting consistent.' },
    ],
    related: ['living-dining', 'bathroom'],
  },
  {
    slug: 'bedroom', name: 'Bedroom', short: 'Bedrooms', audience: 'home', costKeys: ['master', 'child'], videoSlot: 'bedroom',
    intro: 'Calm, personal bedrooms with considered storage, soft lighting and natural textures.',
    approach: ['We design around sleep, storage and the small rituals of the day.', 'Wardrobes, headboard walls and lighting are planned as one composition.'],
    materials: ['Veneer and laminate wardrobes', 'Upholstered or panelled headboard walls', 'Natural fabrics, wood and soft wall finishes'],
    lighting: ['Layered ambient, reading and cove light', 'Dimmable warm-white lighting', 'Bedside controls'],
    planning: ['Bed placement and circulation', 'Wardrobe depth and internal fittings', 'Acoustic and privacy considerations'],
    factors: ['Room size and wardrobe length', 'Headboard and panelling detail', 'Finish and hardware grade', 'Lighting and automation'],
    faqs: [
      { q: 'Can you design walk-in wardrobes?', a: 'Where the plan allows, yes. This is assessed during site measurement.' },
      { q: 'Do you design kids’ and guest rooms?', a: 'Yes, including flexible storage and furniture. [Placeholder: confirm studio offering.]' },
    ],
    related: ['living-dining', 'bathroom'],
  },
  {
    slug: 'bathroom', name: 'Bathroom', short: 'Bathrooms', audience: 'home', costKeys: ['toilet'], videoSlot: 'bathroom',
    intro: 'Refined bathrooms with smart layouts, durable surfaces and calm, spa-like lighting.',
    approach: ['Layout and waterproofing come first, finishes second.', 'Wet and dry zones are separated and detailed for easy upkeep.'],
    materials: ['Porcelain, stone-look and natural stone tiles', 'Quality sanitaryware and fittings', 'Moisture-resistant vanity materials'],
    lighting: ['Even, shadow-free vanity light', 'Warm ambient light', 'Moisture-rated fixtures'],
    planning: ['Fixture placement and plumbing routes', 'Ventilation and drainage', 'Storage niches and vanity design'],
    factors: ['Bathroom size and fixture count', 'Tile and sanitaryware brand/grade', 'Plumbing and waterproofing rework', 'Glass partitions and accessories'],
    faqs: [
      { q: 'Do you handle waterproofing and plumbing coordination?', a: 'Scope is agreed during consultation. [Placeholder: confirm what the studio executes in-house.]' },
    ],
    related: ['bedroom', 'kitchen'],
  },
  {
    slug: 'living-dining', name: 'Living & Dining', short: 'Living & Dining', audience: 'home', costKeys: ['family', 'dining'], videoSlot: 'living-dining',
    intro: 'Open, welcoming living and dining spaces composed for gathering and everyday calm.',
    approach: ['We plan seating, circulation and focal walls together so the room feels resolved.', 'Materials are layered with restraint: wood, stone, textile and light.'],
    materials: ['Feature walls in veneer, stone or texture paint', 'Wood, stone or engineered flooring', 'Bespoke furniture and soft furnishings'],
    lighting: ['Cove and false-ceiling lighting', 'Accent lighting for art and shelves', 'Dimmable pendants over dining'],
    planning: ['Furniture layout and sight lines', 'TV unit and storage integration', 'Flow between living, dining and kitchen'],
    factors: ['Area and ceiling work', 'Feature wall and joinery detailing', 'Furniture and decor scope', 'Lighting design'],
    faqs: [
      { q: 'Can you design the false ceiling and lighting?', a: 'Yes. It can be selected in the budget calculator as a separate item.' },
    ],
    related: ['kitchen', 'bedroom'],
  },
  {
    slug: 'office', name: 'Office', short: 'Offices', audience: 'office', costKeys: ['workstation', 'cabin', 'meeting', 'reception'], videoSlot: 'office',
    intro: 'Workspaces that support focus, collaboration and a clear brand presence.',
    approach: ['We start with how teams work, then plan zones, acoustics and growth.', 'Finishes balance durability with a welcoming, professional character.'],
    materials: ['Durable laminates and acoustic panels', 'Carpet tile, vinyl or engineered flooring', 'Glass partitions and joinery'],
    lighting: ['Even, glare-controlled task lighting', 'Warm accent lighting in reception and breakout areas', 'Daylight-aware layouts'],
    planning: ['Zoning for focus, meeting and collaboration', 'Cable, power and network planning', 'Phased fit-out options'],
    factors: ['Seat count and area', 'Cabin, meeting room and reception scope', 'Acoustic and glazing requirements', 'MEP and approvals'],
    officeAreas: ['Reception', 'Workstations', 'Executive cabins', 'Meeting rooms', 'Collaborative spaces', 'Pantry and breakout areas', 'Complete office fit-out'],
    faqs: [
      { q: 'Do you take on complete office fit-outs?', a: 'Scope can range from single areas to complete fit-out. [Placeholder: confirm studio offering.]' },
    ],
    related: ['living-dining', 'kitchen'],
  },
  {
    slug: 'showroom', name: 'Showroom', short: 'Showrooms', audience: 'showroom', costKeys: ['showfloor', 'showcounter', 'showunits', 'showtrial'], videoSlot: 'showroom',
    intro: 'Showrooms that draw people in, show products at their best and turn a visit into a sale.',
    approach: ['We start with your products, your customers and how they move through the space, then plan display, circulation and brand presence together.', 'Every zone is lit and detailed so the product leads and the interior supports it.'],
    materials: ['Durable, easy-clean flooring such as vitrified tile or polished concrete', 'Laminates, veneer and metal for display units', 'Glass, mirror and backlit panels for feature walls'],
    lighting: ['Adjustable track and spot lighting on products', 'Warm ambient light for a welcoming first impression', 'Feature and signage lighting for the facade'],
    planning: ['Customer flow from entrance to counter', 'Hero display, secondary display and storage zoning', 'Power, data and lighting load for display units'],
    factors: ['Showroom area and facade scope', 'Number and type of display units', 'Fitting rooms, counter and lounge requirements', 'Lighting, signage and approvals'],
    showroomAreas: ['Entrance and facade', 'Main display floor', 'Display units and shelving', 'Reception and billing counter', 'Trial and fitting rooms', 'Customer lounge', 'Stock and storage room', 'Signage and feature lighting', 'Complete showroom fit-out'],
    faqs: [
      { q: 'Do you design the facade and signage as well?', a: 'Yes. Entrance, facade, signage and feature lighting can be selected in the budget calculator as separate items.' },
      { q: 'Can you work with our brand guidelines?', a: 'Yes. Share your brand colours, materials and fixtures and we design around them. [Placeholder: confirm studio offering.]' },
    ],
    related: ['office', 'living-dining'],
  },
];

export const serviceBySlug = (s: string) => services.find((x) => x.slug === s);

export const homeAreas = ['Kitchens', 'Bedrooms and wardrobes', 'Bathrooms', 'Living and dining', 'Foyer and entrance', 'Study and balcony'];

export const whyUs = [
  { icon: 'plan', title: 'Thoughtful space planning', text: 'Layouts are resolved on paper before anything is built, so rooms work as well as they look.' },
  { icon: 'compass', title: 'Design consultancy', text: 'Material, finish and lighting guidance from the first conversation to final styling.' },
  { icon: 'scope', title: 'Transparent scope and budget', text: 'Clear scope discussions and indicative budgets, with final quotations confirmed after consultation.' },
  { icon: 'team', title: 'Coordinated execution', text: 'One team coordinating design intent, vendors and site work to keep the project moving.' },
];

export const values = [
  { title: 'Timeless over trend', text: 'Palettes and materials chosen to age well.' },
  { title: 'Honest budgets', text: 'Plain-language scope and costs before work begins.' },
  { title: 'Details that last', text: 'Specifications and joinery chosen for daily use.' },
];

export const processSteps = [
  { title: 'Consultation', text: 'We listen to how you live or work and review the space.' },
  { title: 'Concept & planning', text: 'Layouts, mood and material direction are developed and refined.' },
  { title: 'Detailed design', text: 'Drawings, specifications and a confirmed scope and budget.' },
  { title: 'Execution', text: 'Coordinated site work with design oversight.' },
  { title: 'Handover', text: 'Final styling, checks and a walkthrough.' },
];

export type ProjectCategory = 'residential' | 'kitchen' | 'bedroom' | 'bathroom' | 'living-dining' | 'office' | 'showroom';
export interface Project {
  slug: string;
  title: string;
  category: ProjectCategory;
  service: ServiceSlug;
  status: 'concept' | 'completed';
  location: string | null; // only when verified
  image: string; // media slot name
  narrative: string;
  materials: string[];
  scope: string[];
}

// Concept designs only. Not completed client work. Replace with real projects as they are approved for publishing.
export const projects: Project[] = [
  { slug: 'concept-warm-oak-kitchen', title: 'Warm Oak Kitchen', category: 'kitchen', service: 'kitchen', status: 'concept', location: null, image: 'project-kitchen-1',
    narrative: 'A concept for a family kitchen: warm oak veneer, a quiet stone counter and concealed storage for a calm, uncluttered look.', materials: ['Oak veneer shutters', 'Honed quartz counter', 'Brushed brass hardware'], scope: ['Layout planning', 'Cabinetry', 'Lighting concept'] },
  { slug: 'concept-stone-and-linen-living', title: 'Stone & Linen Living Room', category: 'living-dining', service: 'living-dining', status: 'concept', location: null, image: 'project-living-1',
    narrative: 'A concept pairing textured plaster, linen seating and a stone feature wall under soft cove lighting.', materials: ['Textured plaster', 'Natural stone', 'Linen upholstery'], scope: ['Furniture layout', 'Feature wall', 'False ceiling and lighting'] },
  { slug: 'concept-quiet-master-suite', title: 'Quiet Master Suite', category: 'bedroom', service: 'bedroom', status: 'concept', location: null, image: 'project-bedroom-1',
    narrative: 'A restful master bedroom concept with a panelled headboard wall, full-height wardrobes and dimmable layered light.', materials: ['Fluted wood panelling', 'Fabric headboard', 'Veneer wardrobes'], scope: ['Wardrobe design', 'Headboard wall', 'Lighting'] },
  { slug: 'concept-travertine-bath', title: 'Travertine Bath', category: 'bathroom', service: 'bathroom', status: 'concept', location: null, image: 'project-bathroom-1',
    narrative: 'A concept bathroom in travertine-look tile with a floating vanity and warm, even lighting.', materials: ['Travertine-look porcelain', 'Floating timber vanity', 'Matte black fittings'], scope: ['Layout', 'Surfaces', 'Fixtures and lighting'] },
  { slug: 'concept-studio-workspace', title: 'Studio Workspace', category: 'office', service: 'office', status: 'concept', location: null, image: 'project-office-1',
    narrative: 'A small-office concept with a warm reception, acoustic meeting room and flexible collaborative zone.', materials: ['Acoustic wall panels', 'Timber joinery', 'Carpet tile'], scope: ['Zoning', 'Reception', 'Meeting room'] },
  { slug: 'concept-open-dining', title: 'Open Dining Room', category: 'living-dining', service: 'living-dining', status: 'concept', location: null, image: 'project-dining-1',
    narrative: 'A dining concept with a sculptural pendant, built-in crockery storage and a warm timber table.', materials: ['Solid timber table', 'Veneer storage wall', 'Textured paint'], scope: ['Furniture', 'Storage wall', 'Pendant lighting'] },
  { slug: 'concept-compact-home-kitchen', title: 'Compact Home Kitchen', category: 'kitchen', service: 'kitchen', status: 'concept', location: null, image: 'project-kitchen-2',
    narrative: 'A space-efficient L-shaped kitchen concept making the most of a compact apartment footprint.', materials: ['Matte laminate', 'Quartz counter', 'Ribbed glass'], scope: ['Space planning', 'Cabinetry', 'Task lighting'] },
  { slug: 'concept-executive-cabin', title: 'Executive Cabin', category: 'office', service: 'office', status: 'concept', location: null, image: 'project-office-2',
    narrative: 'An executive cabin concept with built-in storage, a considered desk wall and glare-free lighting.', materials: ['Walnut veneer', 'Leather accents', 'Glass partition'], scope: ['Joinery', 'Furniture', 'Lighting'] },
];

export const categoryFilters: { key: 'all' | ProjectCategory; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'residential', label: 'Residential' }, { key: 'kitchen', label: 'Kitchen' }, { key: 'bedroom', label: 'Bedroom' },
  { key: 'bathroom', label: 'Bathroom' }, { key: 'living-dining', label: 'Living & Dining' }, { key: 'office', label: 'Office' },
];
export const matchesFilter = (p: Project, f: string) => f === 'all' || (f === 'residential' ? p.category !== 'office' && p.category !== 'showroom' : p.category === f);
