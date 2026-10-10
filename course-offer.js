/* Shared public offer rules; checkout evaluates them using the server clock. */
(function (root) {
  'use strict';
  const DEFAULT_REGULAR_PRICE_MINOR = 49900;
  const DEFAULT_OFFER_PRICE_MINOR = 29900;
  const DEFAULT_OFFER_ENDS_AT = '2026-10-31T18:30:00.000Z';
  function amount(value, fallback, name) {
    const raw = String(value ?? fallback).trim(), number = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(number) || number < 1 || number > 100000000) throw new Error(`${name} must be a positive integer in paise.`);
    return number;
  }
  function fromEnv(env = {}) {
    const regularPriceMinor = amount(env.GATEWISE_COURSE_PRICE_MINOR, DEFAULT_REGULAR_PRICE_MINOR, 'GATEWISE_COURSE_PRICE_MINOR');
    const offerPriceMinor = amount(env.GATEWISE_COURSE_OFFER_PRICE_MINOR, DEFAULT_OFFER_PRICE_MINOR, 'GATEWISE_COURSE_OFFER_PRICE_MINOR');
    const offerEndsAt = String(env.GATEWISE_COURSE_OFFER_ENDS_AT ?? DEFAULT_OFFER_ENDS_AT).trim();
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(offerEndsAt) || !Number.isFinite(Date.parse(offerEndsAt))) throw new Error('GATEWISE_COURSE_OFFER_ENDS_AT must be an ISO date with a time zone.');
    if (offerPriceMinor > regularPriceMinor) throw new Error('The offer price cannot exceed the regular price.');
    return { regularPriceMinor, offerPriceMinor, offerEndsAt };
  }
  function quote(settings, now = Date.now()) {
    const offerActive = settings.offerPriceMinor < settings.regularPriceMinor && now < Date.parse(settings.offerEndsAt);
    return { ...settings, priceMinor: offerActive ? settings.offerPriceMinor : settings.regularPriceMinor, offerActive };
  }
  const api = { DEFAULT_REGULAR_PRICE_MINOR, DEFAULT_OFFER_PRICE_MINOR, DEFAULT_OFFER_ENDS_AT, fromEnv, quote };
  root.GatewiseOffer = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
