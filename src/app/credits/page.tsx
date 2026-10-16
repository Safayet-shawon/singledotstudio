import type { Metadata } from 'next';
import { PageHead } from '@/components/sections';

export const metadata: Metadata = { title: 'Photo credits', alternates: { canonical: '/credits' } };

const base = 'https://commons.wikimedia.org/wiki/File:';
const credits = [
  { use: 'Kitchen page and service card', author: 'Shixart1985', licence: 'CC BY 2.0', licenceUrl: 'https://creativecommons.org/licenses/by/2.0/', page: `${base}Modern_kitchen_and_dining_area_with_stylish_furnishings_and_natural_light_in_a_contemporary_home_setting.jpg` },
  { use: 'Bedroom page and service card', author: 'Shixart1985', licence: 'CC BY 2.0', licenceUrl: 'https://creativecommons.org/licenses/by/2.0/', page: `${base}Modern_bedroom_design_in_a_stylish_hotel_room_featuring_geometric_patterns_and_soft_linens.jpg` },
  { use: 'Bathroom page and service card', author: 'Basile Morin', licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', page: `${base}Bathroom_of_Khan_Pool_Suite_in_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg` },
  { use: 'Office page and service card', author: 'Shixart1985', licence: 'CC BY 2.0', licenceUrl: 'https://creativecommons.org/licenses/by/2.0/', page: `${base}Modern_lounge_interior_with_stylish_decor_and_comfortable_seating_in_an_inviting_atmosphere.jpg` },
  { use: 'Living and dining page and service card', author: 'Jarosław Ceborski (jarson)', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Living_room_(Unsplash).jpg` },
  { use: 'About page', author: 'David Hellmann (davidhellmann)', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Flat_in_Budapest_(Unsplash).jpg` },
  { use: 'Services page', author: 'Naomi Hébert (naomish)', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}At_Home_(Unsplash).jpg` },
  { use: 'Project card: Open Dining Room', author: 'Nirzar Pangarkar', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Round_table_in_a_bright_room_(Unsplash).jpg` },
  { use: 'Project card: Stone & Linen Living Room', author: 'Alexander Pemberton', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Coffee_table_corner_in_a_London_apartment_(Unsplash).jpg` },
  { use: 'Project card: Compact Home Kitchen', author: 'NeONBRAND', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Blue_white_kitchen_interior_(Unsplash).jpg` },
  { use: 'Project card: Executive Cabin', author: 'Breather', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Minimalist_office_decor_at_1540_7th_St_(Unsplash).jpg` },
  { use: 'Project card: Studio Workspace', author: 'Crew', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Ornate_office_space_(Unsplash).jpg` },
  { use: 'Why choose us section', author: 'Crew', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Wood_table_in_front_of_white_wall_(Unsplash).jpg` },
  { use: 'About page studio image', author: 'Breather', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: `${base}Chairs_in_a_meeting_room_(Unsplash).jpg` },
];

export default function Credits() {
  return (
    <>
      <PageHead eyebrow="Credits" title="Photo credits" />
      <div className="container prose" style={{ paddingBottom: 'var(--section)' }}>
        <p className="notice">These are stand-in photographs from Wikimedia Commons. They are not our projects. They are resized and cropped. They will be replaced with the studio’s own photography.</p>
        <ul>
          {credits.map((c) => (
            <li key={c.page}>{c.use}: <a href={c.page} rel="noopener noreferrer" target="_blank">photo</a> by {c.author}, <a href={c.licenceUrl} rel="noopener noreferrer" target="_blank">{c.licence}</a>.</li>
          ))}
        </ul>
        <p>The home page image is an AI-generated concept image, not a photograph of a real project.</p>
      </div>
    </>
  );
}
