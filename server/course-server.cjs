'use strict';
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const offer = require('../course-offer.js');
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
function settings(env = process.env, checkout = false, now = Date.now()) {
  const mode = (env.GATEWISE_COURSE_MODE || 'open').trim();
  if (checkout && mode !== 'protected') fail(503, 'Purchasing is not enabled on this deployment.');
  const courseId = (env.GATEWISE_COURSE_ID || 'gate-cs-2027').trim();
  let price;
  try { price = offer.quote(offer.fromEnv(env), now); } catch { fail(503, 'The course offer is not configured.'); }
  const amount = price.priceMinor;
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(courseId)) fail(503, 'The course offer is not configured.');
  const url = (env.GATEWISE_SUPABASE_URL || '').trim();
  const serviceKey = (env.GATEWISE_SUPABASE_SERVICE_ROLE_KEY || '').trim();
  let privileged = /^sb_secret_[A-Za-z0-9_-]+$/.test(serviceKey);
  try { privileged ||= serviceKey.split('.').length === 3 && JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64url')).role === 'service_role'; } catch {}
  const keyId = (env.GATEWISE_RAZORPAY_KEY_ID || '').trim();
  const keySecret = (env.GATEWISE_RAZORPAY_KEY_SECRET || '').trim();
  const webhookSecret = (env.GATEWISE_RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) || !privileged || !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId) || !keySecret || !webhookSecret) fail(503, 'Purchasing is not configured yet. Free previews and your notes remain available.');
  return { courseId, amount, ...price, currency: 'INR', durationMonths: 12, url, serviceKey, keyId, keySecret, webhookSecret };
}
function dependencies(config, supplied = {}) {
  const supabase = supplied.supabase || createClient(config.url, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  async function request(path, body) {
    const response = await fetch('https://api.razorpay.com/v1/' + path, {
      method: body ? 'POST' : 'GET', headers: { Authorization: 'Basic ' + Buffer.from(config.keyId + ':' + config.keySecret).toString('base64'), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) fail(502, 'The payment provider could not complete this request. Please retry.');
    return response.json();
  }
  const provider = supplied.provider || { createOrder: body => request('orders', body), getPayment: id => request('payments/' + encodeURIComponent(id)) };
  return { supabase, provider };
}
function result(value) { if (value.error) fail(503, 'Course access could not be updated. Please retry shortly.'); return value.data; }
function send(res, status, body) { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(JSON.stringify(body)); }
function responseError(res, error) { send(res, error instanceof HttpError ? error.status : 500, { message: error instanceof HttpError ? error.message : 'The request could not complete. Please retry shortly.' }); }
function method(req, res) { if (req.method === 'POST') return true; res.setHeader('Allow', 'POST'); send(res, 405, { message: 'Use POST for this request.' }); return false; }
function id(value, prefix) { return typeof value === 'string' && new RegExp('^' + prefix + '_[A-Za-z0-9]{1,128}$').test(value); }
async function rawBody(req) {
  const limit = 262144;
  if (Number(req.headers?.['content-length']) > limit) fail(413, 'Webhook body is too large.');
  // Vercel exposes req.body through a JSON-parsing getter. Read its restored
  // original stream instead, so signatures cover the exact provider bytes.
  if (!req.rawBody && typeof req[Symbol.asyncIterator] === 'function') {
    const chunks = []; let length = 0;
    for await (const chunk of req) { const b = Buffer.from(chunk); length += b.length; if (length > limit) fail(413, 'Webhook body is too large.'); chunks.push(b); }
    return Buffer.concat(chunks);
  }
  const value = req.rawBody ?? req.body;
  if (Buffer.isBuffer(value) || typeof value === 'string') { const b = Buffer.from(value); if (b.length > limit) fail(413, 'Webhook body is too large.'); return b; }
  if (value !== undefined && value !== null) fail(400, 'Webhook requires the original request body.');
  fail(400, 'Webhook requires the original request body.');
}
function checkoutHandler(supplied = {}) {
  return async (req, res) => {
    if (!method(req, res)) return;
    try {
      const config = settings(supplied.env || process.env, true, (supplied.now || Date.now)());
      const { supabase, provider } = dependencies(config, supplied);
      const authorization = req.headers?.authorization || '';
      const match = /^Bearer (\S{1,8192})$/.exec(authorization);
      if (!match) fail(401, 'Sign in before starting checkout.');
      const auth = await supabase.auth.getUser(match[1]);
      if (auth.error || !auth.data?.user?.id) fail(401, 'Your session could not be verified. Sign in again.');
      const userId = auth.data.user.id;
      const course = result(await supabase.from('courses').select('id,title,enabled').eq('id', config.courseId).maybeSingle());
      if (!course?.enabled) fail(503, 'This course is not available for purchase yet.');
      const role = result(await supabase.from('account_roles').select('role').eq('user_id', userId).maybeSingle());
      const now = new Date((supplied.now || Date.now)()).toISOString();
      const entitlements = result(await supabase.from('course_entitlements').select('id').eq('user_id', userId).eq('course_id', config.courseId).is('revoked_at', null).lte('valid_from', now).gt('valid_until', now));
      if (role?.role === 'owner' || entitlements?.length) fail(409, 'Your account already has full course access. Refresh your access to continue.');
      const orderId = (supplied.randomUUID || crypto.randomUUID)();
      result(await supabase.from('payment_orders').insert({ id: orderId, user_id: userId, course_id: config.courseId, amount: config.amount, currency: config.currency, duration_months: config.durationMonths, status: 'created' }));
      let order;
      try {
        order = await provider.createOrder({ amount: config.amount, currency: config.currency, receipt: orderId, payment_capture: 1 });
        if (!id(order?.id, 'order') || order.amount !== config.amount || order.currency !== config.currency) fail(502, 'The payment order could not be verified. Please retry.');
        result(await supabase.from('payment_orders').update({ provider_order_id: order.id }).eq('id', orderId));
      } catch (error) {
        await supabase.from('payment_orders').update({ status: 'failed' }).eq('id', orderId);
        throw error;
      }
      send(res, 200, { orderId: order.id, keyId: config.keyId, amount: config.amount, currency: config.currency, courseName: course.title, durationMonths: config.durationMonths });
    } catch (error) { responseError(res, error); }
  };
}
function webhookHandler(supplied = {}) {
  return async (req, res) => {
    if (!method(req, res)) return;
    try {
      const config = settings(supplied.env || process.env);
      const bytes = await rawBody(req);
      const signature = req.headers?.['x-razorpay-signature'];
      const digest = crypto.createHmac('sha256', config.webhookSecret).update(bytes).digest();
      if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature) || !crypto.timingSafeEqual(digest, Buffer.from(signature, 'hex'))) fail(401, 'Webhook signature could not be verified.');
      let event; try { event = JSON.parse(bytes.toString('utf8')); } catch { fail(400, 'Invalid webhook payload.'); }
      if (!event || typeof event !== 'object' || typeof event.event !== 'string') fail(400, 'Invalid webhook payload.');
      if (!['payment.captured', 'refund.processed'].includes(event.event)) { send(res, 200, { received: true, ignored: true }); return; }
      const { supabase, provider } = dependencies(config, supplied);
      let payment, kind;
      if (event.event === 'payment.captured') {
        payment = event.payload?.payment?.entity; kind = 'captured';
        if (payment?.status !== 'captured' || payment.captured !== true) fail(400, 'Payment has not been captured.');
      } else {
        const refund = event.payload?.refund?.entity; kind = 'refunded';
        if (!id(refund?.payment_id, 'pay') || refund.status !== 'processed' || !Number.isSafeInteger(refund.amount) || refund.amount < 1) fail(400, 'Refund has not been confirmed.');
        payment = await provider.getPayment(refund.payment_id);
        if (payment?.id !== refund.payment_id || !Number.isSafeInteger(payment.amount_refunded) || payment.amount_refunded < refund.amount || refund.amount > payment.amount || (refund.currency && refund.currency !== payment.currency)) fail(502, 'Refund details could not be verified. Please retry.');
      }
      if (!id(payment?.id, 'pay') || !id(payment?.order_id, 'order') || !Number.isSafeInteger(payment.amount) || payment.amount < 1 || payment.currency !== 'INR') fail(400, 'Invalid payment identity, amount or currency.');
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      const eventId = req.headers?.['x-razorpay-event-id'] || hash;
      if (typeof eventId !== 'string' || !/^[A-Za-z0-9_.:-]{1,256}$/.test(eventId)) fail(400, 'Invalid webhook event ID.');
      result(await supabase.rpc('apply_course_payment', { p_event_id: eventId, p_payload_hash: hash, p_order_id: payment.order_id, p_payment_id: payment.id, p_amount: payment.amount, p_currency: payment.currency, p_event_kind: kind }));
      send(res, 200, { received: true });
    } catch (error) { responseError(res, error); }
  };
}
module.exports = { checkoutHandler, webhookHandler, settings, rawBody };
