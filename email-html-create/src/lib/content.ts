// ============================================================================
// SEAM #2 — CONTENT GENERATION (AI generate / regenerate)
//
// This file is the ONLY place email copy is produced. Right now it returns
// template-based default content (deterministic, varies by `version`). The
// content-agent dev replaces the body of `generateContent()` with a real AI
// call that returns the SAME shape: an HTML string for the given block `key`,
// segment, and `version` index. The UI (versions, edit, regenerate, subject
// styles) already works against this contract — nothing else needs to change.
//
// Return value: a fragment of email-safe HTML (uses <p>, <strong>,
// <span class="accent">, <span class="tagchip">{{merge_tag}}</span>).
// Merge tags like {{first_name}} MUST be emitted literally.
// ============================================================================

import type { Segment } from '../data/segments';

export type BlockKey = 'headline' | 'iknow' | 'offer' | 'ps' | 'story' | 'subject';

export type GenCtx = {
  domainName: string;
  theme: string;
  val: string;        // promo value, e.g. "75%"
  ship: string;       // shipping phrase, e.g. "on orders $35+" or ""
  seg?: Segment;      // current segment (for story/subject)
  heroName: string;   // first product name of the segment
};

export function generateContent(key: BlockKey, c: GenCtx, version: number): string {
  const v = Math.max(0, version | 0);
  switch (key) {
    case 'headline':
      return [
        `<p><span class="accent">${c.theme} at ${c.domainName} —</span><br><span class="accent">${c.val} off</span> ends midnight tonight.</p><p>Free shipping ${c.ship || 'available'}. Our picks for you are inside.</p><p class="rev">4.9/5 · 2,400+ reviews</p>`,
        `<p><span class="accent">Your ${c.theme.toLowerCase()} starts now.</span><br><span class="accent">${c.val} off</span> — today only.</p><p>Hand-picked from ${c.domainName}. Free shipping ${c.ship || 'available'}.</p><p class="rev">"Forgot it's there!" — verified buyer</p>`,
        `<p><span class="accent">Don't miss ${c.theme} —</span><br><span class="accent">${c.val} off</span> before midnight.</p><p>${c.domainName} bestsellers · free shipping ${c.ship || 'available'}.</p>`,
      ][v % 3];
    case 'iknow':
      return [
        `<p>No pressure — just wanted you to have the full picture before this closes at midnight.</p>`,
        `<p>Sharing early so you don't miss it: the offer ends tonight, and the favorites tend to go first.</p>`,
      ][v % 2];
    case 'offer':
      return [
        `<p>Right now everything above is <strong>${c.val} off</strong> at ${c.domainName}, with free shipping ${c.ship || 'available'}. Midnight tonight is the cut-off.</p>`,
        `<p>The full set of picks is <strong>${c.val} off</strong> today only — free shipping ${c.ship || 'available'}. It closes at midnight.</p>`,
      ][v % 2];
    case 'ps':
      return [
        `<p>P.S. Bestsellers sell out first — midnight is closer than it feels.</p>`,
        `<p>P.S. This is the lowest price of the season. Midnight, then it's gone.</p>`,
      ][v % 2];
    case 'story': {
      const lbl = c.seg?.name || '';
      const chars = c.seg?.chars || '';
      const shaping = /định hình|nâng/i.test(chars);
      const comfort = /thoải mái|dễ chịu|mềm/i.test(chars);
      const win = /rời bỏ|win-back|im /i.test(chars);
      const neu = /khách mới|đơn đầu/i.test(chars);
      const angle = win ? `It's been a while — we saved your favorites and picked a few new ones you haven't seen.`
        : neu ? `Welcome in — you chose well. Here are the pieces our community reaches for next.`
        : shaping ? `Built to shape and support — the ${c.heroName} is the piece our customers repurchase most.`
        : comfort ? `All-day comfort, nothing digging in — starting with the ${c.heroName}.`
        : `Chosen for you — the ${c.heroName} leads this set.`;
      return [
        `<p>For our <span class="accent">${lbl.toLowerCase()}</span>, we pulled the pieces moving fastest this ${c.theme.toLowerCase()}.</p><p>${angle} All ${c.val} off through midnight.</p>`,
        `<p>${angle}</p><p>Six ${c.domainName} picks matched to you — all ${c.val} off tonight.</p>`,
      ][v % 2];
    }
    case 'subject':
      return [
        `<div class="s-subj">${c.theme} — ${c.val} off ends tonight</div><div class="s-pre"><span class="tagchip">{{first_name}}</span>, picked for you · ${c.heroName} & more. Midnight cut-off.</div>`,
        `<div class="s-subj">${c.heroName} is ${c.val} off — your picks are live</div><div class="s-pre"><span class="tagchip">{{first_name}}</span>, ${c.domainName} favorites, free shipping ${c.ship || 'available'}.</div>`,
        `<div class="s-subj">Last call — ${c.val} off at ${c.domainName} tonight</div><div class="s-pre"><span class="tagchip">{{first_name}}</span>, don't miss the ${c.theme.toLowerCase()}.</div>`,
      ][v % 3];
  }
}
