// ============================================================================
// SEAM #2 — CONTENT GENERATION (AI generate / regenerate)
//
// Default copy is REAL BraGoddess campaign content, taken verbatim-in-spirit
// from the team's "BraGoddess Email Content.xlsx" — sheet "🌴 Wed 15 Jul 2026"
// (the DaisyBra "July Champion" 86% o.f.f promo): warm first-person "Sandra"
// letters, 5-star reviews, popout % badges, midnight urgency, per-segment angles
// (Comfort / Support / Smoothness / Softness).
//
// The content-agent dev replaces the body of `generateContent()` + `PRODUCT_COPY`
// with real AI output of the SAME shape (HTML-string per block; plain-text per
// product field). Keep merge tags ({{first_name}}) literal and the spam-dodge
// style ($ -> 💲, off -> o.f.f).
// ============================================================================

import type { Segment } from '../data/segments';

export type BlockKey = 'headline' | 'iknow' | 'offer' | 'ps' | 'story' | 'subject';

export type GenCtx = {
  domainName: string;
  theme: string;
  val: string;          // promo value, e.g. "75%"
  ship: string;         // e.g. "over 💲35", "on all orders", or ""
  seg?: Segment;        // current segment
  products: string[];   // product names p1..p6 of the segment
};

const shipLine = (s: string) => s || 'available';

// ---- real subject / preheader pairs (Wed 15 Jul 2026) ----
const SUBJECTS: { subject: string; preheader: string }[] = [
  { subject: '🤕 {{first_name}}, I’d feel terrible if you missed this…', preheader: 'Your “Holy Grail” of comfort — 86% less!' },
  { subject: '😱 {{first_name}}, you have an unused {VAL} o.f.f', preheader: 'I’m trying to hold your size 💨' },
  { subject: '💓 Thanks for taking this {VAL} o.f.f, {{first_name}}!', preheader: 'You’ve never tried support like this' },
  { subject: 'For our #1 Goddess: an exclusive {VAL} o.f.f invite 🥂', preheader: '{{first_name}}, you deserve this bestseller!' },
  { subject: '🔥 Last 50 items left, {{first_name}}!', preheader: 'Going out? Staying in? This serves both' },
];

// ---- real "Sandra" letters, one per angle (Body Part 1) ----
const STORIES: string[] = [
  // 0 · Comfort (default / shapewear)
  `<p>Hello <span class="tagchip">{{first_name}}</span>,</p><p>I’m so thrilled to share our July Champion for <strong>Comfort</strong>, the <strong>{HERO}</strong> — now at <strong>{VAL} o.f.f</strong>, but this ends in <strong>24 HOURS</strong>.</p><p>I hit my limit when I couldn’t enjoy my granddaughter’s recital because my bra was killing me. Never again. This one changed that: wireless comfort for hours, no painful digging, stays in place through everything.</p><p>Women are buying 3–5 at once — see why right below.</p>`,
  // 1 · Support (at-risk / win-back)
  `<p>Hello <span class="tagchip">{{first_name}}</span>,</p><p>It’s been a little while — and I couldn’t let you miss our July Champion for <strong>Support</strong>, the <strong>{HERO}</strong>, now at <strong>{VAL} o.f.f</strong> for the next <strong>24 HOURS</strong>.</p><p>Straps that kept slipping and aching shoulders? This wonder fixed that for me: wireless lift that actually holds, wide straps that don’t dig.</p><p>My neighbor Helen, 72, called: “Sandra, my shoulders don’t ache anymore — real support without wires!”</p>`,
  // 2 · Smoothness (loyal)
  `<p>Hello <span class="tagchip">{{first_name}}</span>,</p><p>Thank you for coming back to us again and again. Here’s our Winner for <strong>Smoothness</strong>, the <strong>{HERO}</strong> — now at <strong>{VAL} o.f.f</strong>, ending in <strong>24 HOURS</strong>.</p><p>No more bulges under a nice blouse: seamless smoothing for hours, no visible lines, sleek under everything.</p><p>Patricia, 69, raved: “Invisible under my white top — it smooths everything perfectly!”</p>`,
  // 3 · Softness (new customer)
  `<p>Hello <span class="tagchip">{{first_name}}</span>,</p><p>Thank you so much for choosing us! I wanted you to be one of the first to meet our Winner for <strong>Softness</strong>, the <strong>{HERO}</strong> — now at <strong>{VAL} o.f.f</strong>, ending in <strong>24 HOURS</strong>.</p><p>Cloud-soft comfort for hours, gentle on sensitive skin, cozy through everything.</p><p>Ruth, 70, texted: “Soft as a cloud — I wore it from morning to bedtime!”</p>`,
];

// pick the letter angle from the segment characteristics
function segAngle(seg?: Segment): number {
  const c = seg?.chars || '';
  if (/at-risk|churn|win-back|silent/i.test(c)) return 1;
  if (/new customer|first order/i.test(c)) return 3;
  if (/loyal|≥3 orders/i.test(c)) return 2;
  return 0;
}

export function generateContent(key: BlockKey, c: GenCtx, version: number): string {
  const v = Math.max(0, version | 0);
  const hero = c.products[0] || 'Daisy Bra';
  const alt = c.products[3] || c.products[1] || hero;
  const angle = segAngle(c.seg);
  const fill = (s: string) => s.replace(/{VAL}/g, c.val).replace(/{HERO}/g, hero);

  switch (key) {
    case 'subject': {
      const s = SUBJECTS[(angle + v) % SUBJECTS.length];
      return `<div class="s-subj">${fill(s.subject)}</div><div class="s-pre">${fill(s.preheader)}</div>`;
    }

    case 'headline':
      return [
        `<p><span class="accent">⚡ ${c.theme} Flash Deals —</span><br><span class="accent">${c.val} o.f.f the ${hero}.</span></p><p>Wireless support bras unlocked. Free shipping ${shipLine(c.ship)} — offer ends midnight tonight.</p><p class="rev">★★★★★ 12,000+ reviews · loved by 1,000,000+ women</p>`,
        `<p><span class="accent">🎁 A little thank-you gift —</span><br><span class="accent">${c.val} o.f.f, gone by midnight.</span></p><p>Our #1 comfort shaping bras. Free shipping ${shipLine(c.ship)}.</p><p class="rev">★★★★★ 12K+ reviews</p>`,
      ][v % 2];

    case 'story':
      return fill(STORIES[(angle + v) % STORIES.length]);

    case 'iknow':
      return [
        `<p>More styles, sizes, and solutions: yeah, we’ve got a wireless for that. I picked a few favorites for you below.</p>`,
        `<p>Still deciding? See which one feels most like you — there’s a fit for every shape below.</p>`,
      ][v % 2];

    case 'offer':
      return [
        `<p>Stop suffering through uncomfortable days when <strong>${c.val} o.f.f</strong> is waiting right now. Free shipping ${shipLine(c.ship)} — this closes at <strong>midnight tonight</strong>.</p><p>Best,<br>Sandra</p>`,
        `<p>Shipping is on us ${shipLine(c.ship)} — the ideal time to try what over 1,000,000 women are obsessed with. Ends <strong>midnight tonight</strong>.</p><p>Warmly,<br>Sandra</p>`,
      ][v % 2];

    case 'ps':
      return [
        `<p>P.S. Not quite into the ${hero}? No worries — the rest of our Wireless Support Collection is also unlocked at ${c.val} o.f.f till midnight tonight!</p>`,
        `<p>P.S. Most customers order 3+. Smart move — the <span class="accent">${alt}</span> in our bestselling shade sells out fastest. 😉</p>`,
      ][v % 2];
  }
}

// ============================================================================
// Per-product card copy (main text + review + popout badge), rendered on each
// product tile. Real copy for the catalog products; the content agent swaps this
// for AI output of the same shape. Plain text only (React escapes it).
// ============================================================================
export type ProductCopy = { tag: string; main: string; review: string; reviewer: string; popout: string };

export const PRODUCT_COPY: Record<string, ProductCopy> = {
  daisybra:      { tag: 'Sold out last week!',      main: 'Pain-Free Front Button Comfort',        review: 'The most comfortable bra I’ve ever worn — this front closure is a miracle for my joints.', reviewer: 'Irene C.',   popout: '85% o.f.f' },
  lushfitting:   { tag: '#1 Support',               main: 'Powerful Push-Up Seamless Bra',          review: 'Feels like second skin — my bulges are gone!',                                              reviewer: 'Laura L.',   popout: '70% o.f.f' },
  zenchic:       { tag: 'Low stock',                main: 'Seamless Sexy Push-Up Wireless Bra',     review: 'All-day ease, gorgeous lift, zero pinching. OBSESSED!',                                     reviewer: 'Nancy W.',   popout: '73% o.f.f' },
  zoeshape:      { tag: 'Over 10,000 happy women',  main: 'Instant Smooth Silhouette & Confidence', review: 'It smooths my back rolls perfectly without pinching. I feel elegant again!',               reviewer: 'Martha T.',  popout: '80% o.f.f' },
  posybra:       { tag: 'Loved by 50,000+ seniors', main: '#1 Do-Everything Front Button Bra',      review: 'No pinching, no red marks — comfort that lasts all day.',                                   reviewer: 'Clarissa C.',popout: '79% o.f.f' },
  doveloom:      { tag: 'Seniors’ new favorite',    main: 'So Soft, You’ll Forget It’s On',         review: 'My sensitive skin loves this fabric — zero redness or chafing.',                            reviewer: 'Barbara S.', popout: '79% o.f.f' },
  icyshorts:     { tag: '3,900+ sold in July',      main: 'Lightweight Breathable Summer Breeze',   review: 'So light and airy — I stopped sweating even on the hottest days!',                          reviewer: 'Clara D.',   popout: '87% o.f.f' },
  rosylift:      { tag: 'Experts recommend',        main: 'Ultimate Lifting & Shaping Corrector',   review: 'My back pain disappeared after wearing this daily.',                                        reviewer: 'Linda K.',   popout: '75% o.f.f' },
  sonashape:     { tag: 'Best seller',              main: 'Full-Coverage Shaping Support Bra',      review: 'Finally a bra that lifts and smooths at the same time!',                                    reviewer: 'Donna P.',   popout: '78% o.f.f' },
  veracomfort:   { tag: 'Rated 4.9 globally',       main: 'Ultra-Soft Skin-Friendly Everyday Bra',  review: 'The wide straps saved my shoulders — pain completely gone.',                                reviewer: 'Susan K.',   popout: '67% o.f.f' },
  sofilace:      { tag: 'Rising star',              main: 'Delicate Lace Wireless Lifting Bra',     review: 'Pretty, soft and supportive — my new go-to!',                                               reviewer: 'Anne M.',    popout: '71% o.f.f' },
  stretchactive: { tag: 'Move-with-you fit',        main: '4-Way Stretch Active Comfort Bra',       review: 'Perfect for workouts and lounging — never rides up.',                                       reviewer: 'Megan R.',   popout: '72% o.f.f' },
};

export const productCopy = (key: string): ProductCopy =>
  PRODUCT_COPY[key] || { tag: 'Customer favorite', main: 'Comfort & Confidence Bra', review: 'Love it — so comfy I wear it every day!', reviewer: 'Verified buyer', popout: '70% o.f.f' };
