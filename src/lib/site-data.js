// Single source of truth for site-wide copy: nav items, contact details,
// opening hours, and third-party embed config. Kept as plain JS (rather
// than directly in consts.ts) so node:test can import it without a
// TypeScript toolchain — see test/build-output.test.js, which imports these
// values instead of hard-coding the same strings a second time.

export const SITE_NAME = 'Hambledon Village Shop';
export const SITE_DESCRIPTION =
  'Community-owned shop, café/deli and Post Office in Hambledon, Surrey.';

/** @typedef {{ label: string, href: string }} NavItem */

/** @type {NavItem[]} */
export const NAV = [
  { label: 'Home', href: '/' },
  { label: 'The Shop', href: '/theshop/' },
  { label: 'The Café/Deli', href: '/thecafe/' },
  { label: 'The Post Office', href: '/post-office/' },
  { label: 'Volunteering', href: '/volunteering/' },
  { label: 'Gallery', href: '/gallery/' },
  { label: 'Our History', href: '/history/' },
];

export const CONTACT = {
  address: 'The Cricket Green, Hambledon, Surrey, GU8 4HF',
  phone: '01428 682176',
  phoneHref: 'tel:01428682176',
  email: 'villageshop@hambledonsurrey.co.uk',
};

// mailto `?ref=` query strings, kept exactly as they were per page in the
// Jekyll source.
export const MAILTO_REFS = {
  home: 'hambledon-village-shop-post-office',
  volunteering: 'hambledon-village-shop-volunteering',
};

export const HOURS = {
  shop: {
    days: 'Monday to Sunday',
    range: '08:30–14:00',
    // Composed into "Last deli-café orders at 13:30" (home page) and
    // "...with last orders for the café at 13:30." (café page) — the time
    // lives here once.
    lastOrdersTime: '13:30',
  },
  postOffice: {
    weekdayDays: 'Monday to Friday',
    weekdayRange: '09:00–13:45',
    saturdayDays: 'Saturday',
    saturdayRange: '09:00–12:15',
  },
};

export const INSTAGRAM_HANDLE = 'hambledon_village_shop';
export const INSTAGRAM_URL = 'https://www.instagram.com/hambledon_village_shop/';

export const MAPBOX = {
  version: '2.7.0',
  token:
    'pk.eyJ1Ijoiam9uZXBldGVyc2VuIiwiYSI6ImNsc2dtcWc5MDEzeWYyaXB2MHgxaDdxNjQifQ.HHfayli027QjXs_TVhp1-Q',
  center: [-0.625691566, 51.13485447],
  zoom: 13,
  style: 'mapbox://styles/mapbox/streets-v11',
};
