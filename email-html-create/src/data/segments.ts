// ============================================================================
// DATA MODEL — domains, catalog, and the 8 segments from
// `segment_mapping.csv`. BraGoddess is wired with real data + real images.
//
// SEAM #3 (AI product images): every product's `img` points at a static file
// in /public/img (shipped from the design repo). The image-generation dev
// replaces these paths with AI-generated / CDN image URLs per product.
// Nothing else needs to change — the UI just reads `product.img`.
// ============================================================================

export type Product = { name: string; img: string; price: string };
export type Catalog = Record<string, Product>;

export type Segment = {
  code: string;      // T1..T8
  name: string;      // segment name (English)
  rate: number;      // repurchase probability %
  prods: string[];   // 6 catalog keys, p1..p6
  chars: string;     // content characteristics (steers the AI)
};

export type Domain = {
  accent: string;
  sender: string;
  real: boolean;
  banner: string;
  catalog: Catalog;
  segs: Segment[];
};

// Base-aware image dir: "/img/" in dev, "/rmkt-email-ai/img/" on GitHub Pages.
const IMG = import.meta.env.BASE_URL + 'img/';

// ---- BraGoddess catalog (12 products, real designed images) ----
export const CATALOG: Catalog = {
  lushfitting:  { name: 'LushFitting',   img: IMG + 'lushfitting.jpg',  price: '$29.99' },
  stretchactive:{ name: 'StretchActive', img: IMG + 'stretchactive.jpg',price: '$27.99' },
  daisybra:     { name: 'Daisy Bra',     img: IMG + 'daisybra.jpg',     price: '$19.99' },
  zenchic:      { name: 'ZenChic Bra',   img: IMG + 'zenchic.jpg',      price: '$22.99' },
  doveloom:     { name: 'DoveLoom',      img: IMG + 'doveloom.jpg',     price: '$24.99' },
  icyshorts:    { name: 'Icy Shorts',    img: IMG + 'icyshorts.jpg',    price: '$16.99' },
  rosylift:     { name: 'RosyLift',      img: IMG + 'rosylift.jpg',     price: '$25.99' },
  sonashape:    { name: 'SonaShape',     img: IMG + 'sonashape.jpg',    price: '$26.99' },
  zoeshape:     { name: 'ZoeShape',      img: IMG + 'zoeshape.jpg',     price: '$24.99' },
  veracomfort:  { name: 'VeraComfort',   img: IMG + 'veracomfort.jpg',  price: '$23.99' },
  sofilace:     { name: 'SofiLace',      img: IMG + 'sofilace.jpg',     price: '$21.99' },
  posybra:      { name: 'Posy Bra',      img: IMG + 'posybra.jpg',      price: '$22.99' },
};

// ---- 8 segments from segment_mapping.csv ----
export const BRA_SEGS: Segment[] = [
  { code: 'T1', name: 'Shapewear Bra Buyers', rate: 46,
    prods: ['lushfitting','stretchactive','daisybra','zenchic','doveloom','icyshorts'],
    chars: 'Bought a shaping / push-up bra once, 46-150 days since last order. Care about silhouette, support, hiding flaws. Content: emphasize the shaping effect & the payoff of the next purchase; p3-p4 are comfort bras to broaden taste for comparison.' },
  { code: 'T2', name: 'Comfort Bra Buyers', rate: 44,
    prods: ['zenchic','stretchactive','lushfitting','rosylift','doveloom','icyshorts'],
    chars: 'Bought a comfort / wireless bra once, 46-150 days since last order. Prioritize ease, soft fabric, everyday wear. Content: emphasize all-day comfort; p3-p4 are shaping bras to suggest an upgrade (26% of customers switch lines when they return).' },
  { code: 'T3', name: 'One-Time Buyers — Other', rate: 31,
    prods: ['sonashape','doveloom','rosylift','daisybra','zoeshape','veracomfort'],
    chars: 'Bought once outside bras (bottoms, panties...), 46-150 days since last order. Bra taste unknown. Content: introduce the core bra range via bestsellers; message about discovering signature products.' },
  { code: 'T4', name: 'New Customers', rate: 52,
    prods: ['sonashape','doveloom','rosylift','daisybra','zoeshape','veracomfort'],
    chars: 'Placed their first order within the last 45 days — in the most excited phase. Content: welcome, affirm the right choice, suggest bestsellers; typical repurchase ~57 days, so this email seeds the 2nd order.' },
  { code: 'T5', name: 'Potential Loyalists', rate: 49,
    prods: ['sonashape','rosylift','doveloom','sofilace','daisybra','zoeshape'],
    chars: 'Two orders placed, still active (≤90 days). Forming taste and habits. Content: nurture the relationship, balance familiar picks with discovery, push toward the 3rd order (the loyalty milestone).' },
  { code: 'T6', name: 'Loyal — Fixed Taste', rate: 58,
    prods: ['sonashape','posybra','daisybra','doveloom','sofilace','rosylift'],
    chars: '≥3 orders, active, concentrated on 1-2 familiar lines. Know what they like. Content: respect their taste — same-line products first, gratitude / exclusive tone, avoid overly disruptive messaging.' },
  { code: 'T7', name: 'Loyal — Explorers', rate: 55,
    prods: ['posybra','daisybra','sonashape','doveloom','sofilace','rosylift'],
    chars: '≥3 orders, active, buy across many lines. Like novelty, respond well to variety. Content: multi-category curation, outfit pairing, aggressive cross-sell.' },
  { code: 'T8', name: 'At-Risk / Churning', rate: 27,
    prods: ['sonashape','posybra','doveloom','rosylift','daisybra','zoeshape'],
    chars: 'Bought ≥2 orders but silent for 90-150 days — off the rhythm of 2/3 of customers. Content: gentle win-back, remind them of the value already experienced, include trending items; consider a time-limited offer.' },
];

// ---- generic sample domains so the domain picker still demos ----
function genericDomain(accent: string, sender: string): Domain {
  const names = ['Signature Tee','Classic Polo','Linen Shirt','Wool Coat','Chino Pant','Leather Belt','Suede Shoe','Silk Scarf','Knit Sweater'];
  const catalog: Catalog = {};
  names.forEach((n, i) => {
    catalog['g' + i] = { name: n, img: `https://picsum.photos/seed/${encodeURIComponent(sender + n)}/420/320`, price: `$${19 + i * 10}.99` };
  });
  const keys = Object.keys(catalog);
  const segs: Segment[] = [
    { code: 'S1', name: 'New subscribers', rate: 42, prods: keys.slice(0, 6), chars: 'Sample segment — real segment data comes from the Segmentation module (only BraGoddess is wired in this prototype).' },
    { code: 'S2', name: 'Repeat buyers',   rate: 56, prods: keys.slice(1, 7), chars: 'Sample segment — real segment data pending.' },
    { code: 'S3', name: 'Lapsed 90-day',   rate: 24, prods: keys.slice(2, 8), chars: 'Sample segment — real segment data pending.' },
  ];
  return { accent, sender, real: false, banner: `https://picsum.photos/seed/${encodeURIComponent(sender + 'banner')}/1200/420`, catalog, segs };
}

export const DOMAINS: Record<string, Domain> = {
  BraGoddess: { accent: '#c12a4e', sender: 'Sandra @ BraGoddess', real: true, banner: IMG + 'banner.gif', catalog: CATALOG, segs: BRA_SEGS },
  GentsLux:   genericDomain('#1f3a5f', 'GentsLux'),
  LuxFitting: genericDomain('#6b4e9e', 'LuxFitting'),
  SantaFare:  genericDomain('#b8342b', 'SantaFare'),
};

export const DOMAIN_NAMES = Object.keys(DOMAINS);
