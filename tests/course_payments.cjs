const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {checkoutHandler,webhookHandler}=require('../server/course-server.cjs');
const env={GATEWISE_COURSE_MODE:'protected',GATEWISE_COURSE_OFFER_ENDS_AT:'2000-01-01T00:00:00Z',GATEWISE_SUPABASE_URL:'https://gatewise-test.supabase.co',GATEWISE_SUPABASE_SERVICE_ROLE_KEY:'sb_secret_serverOnly',GATEWISE_RAZORPAY_KEY_ID:'rzp_test_PUBLIC',GATEWISE_RAZORPAY_KEY_SECRET:'privateProviderSecret',GATEWISE_RAZORPAY_WEBHOOK_SECRET:'privateWebhookSecret'};
const uid='11111111-1111-4111-8111-111111111111';
const rows={courses:[{id:'gate-cs-2027',title:'GATE CS 2027',enabled:true}],account_roles:[],course_entitlements:[],payment_orders:[]};
let rpcCalls=[],providerCalls=[];
function query(table){let action='select',payload,filters=[];const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},is(k,v){filters.push(r=>r[k]===v);return q},lte(k,v){filters.push(r=>r[k]<=v);return q},gt(k,v){filters.push(r=>r[k]>v);return q},insert(v){action='insert';payload=v;return q},update(v){action='update';payload=v;return q},maybeSingle(){return execute(true)},then(ok,bad){return execute(false).then(ok,bad)}};async function execute(single){const found=rows[table].filter(r=>filters.every(f=>f(r)));if(action==='insert')rows[table].push(payload);if(action==='update')found.forEach(r=>Object.assign(r,payload));return {data:single?found[0]||null:action==='select'?found:null,error:null}}return q}
const supabase={auth:{getUser:async token=>token==='validToken'?{data:{user:{id:uid}}}:{data:{user:null},error:new Error('Invalid')}},from:query,rpc:async(name,args)=>{rpcCalls.push({name,args});return {data:{hasAccess:true},error:null}}};
const provider={createOrder:async order=>{providerCalls.push(order);return {id:'order_SERVER',amount:order.amount,currency:order.currency}},getPayment:async id=>({id,order_id:'order_SERVER',amount:49900,currency:'INR',amount_refunded:49900})};
const checkout=checkoutHandler({env,supabase,provider,randomUUID:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
const webhook=webhookHandler({env,supabase,provider});
async function invoke(fn,req={}){const headers={};let text;const res={setHeader:(k,v)=>headers[k]=v,end:s=>text=s};await fn({method:'POST',headers:{},...req},res);return {status:res.statusCode,headers,body:JSON.parse(text)}}
(async()=>{
 assert.equal((await invoke(checkout,{method:'GET'})).status,405);
 assert.equal((await invoke(checkout)).status,401);
 assert.equal((await invoke(checkout,{headers:{authorization:'Bearer forged'}})).status,401);
 const purchased=await invoke(checkout,{headers:{authorization:'Bearer validToken'},body:{amount:1,user_id:'other',course_id:'other',role:'owner'}});
 assert.equal(purchased.status,200);assert.equal(purchased.body.amount,49900);assert.equal(providerCalls[0].amount,49900);assert.equal(rows.payment_orders[0].user_id,uid);assert.equal(rows.payment_orders[0].course_id,'gate-cs-2027');assert.equal(rows.payment_orders[0].provider_order_id,'order_SERVER');assert.equal(rpcCalls.length,0,'order creation cannot grant access');
 assert.equal(purchased.headers['Cache-Control'],'no-store');for(const secret of ['serverOnly','privateProviderSecret','privateWebhookSecret'])assert(!JSON.stringify(purchased).includes(secret));
 rows.account_roles.push({user_id:uid,role:'owner'});assert.equal((await invoke(checkout,{headers:{authorization:'Bearer validToken'}})).status,409);rows.account_roles=[];
 rows.course_entitlements.push({user_id:uid,course_id:'gate-cs-2027',revoked_at:null,valid_from:'2020-01-01',valid_until:'2099-01-01'});assert.equal((await invoke(checkout,{headers:{authorization:'Bearer validToken'}})).status,409);rows.course_entitlements=[];
 assert.equal((await invoke(checkoutHandler({env:{...env,GATEWISE_COURSE_MODE:'open'},supabase,provider}))).status,503);
 assert.equal((await invoke(checkoutHandler({env:{...env,GATEWISE_SUPABASE_SERVICE_ROLE_KEY:'sb_publishable_no'},supabase,provider}))).status,503);
 const event={event:'payment.captured',payload:{payment:{entity:{id:'pay_VERIFIED',order_id:'order_SERVER',amount:49900,currency:'INR',status:'captured',captured:true}}}};
 const bytes=Buffer.from(JSON.stringify(event));
 function signed(body=bytes){return {body,headers:{'x-razorpay-signature':crypto.createHmac('sha256',env.GATEWISE_RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex'),'x-razorpay-event-id':'event_verified'}}}
 assert.equal((await invoke(webhook,{body:bytes,headers:{'x-razorpay-signature':'0'.repeat(64)}})).status,401);assert.equal(rpcCalls.length,0);
 assert.equal((await invoke(webhook,{body:event})).status,400,'parsed objects lose original signed bytes');
 assert.equal((await invoke(webhook,{body:Buffer.alloc(262145)})).status,413);
 assert.equal((await invoke(webhook,signed())).status,200);assert.equal(rpcCalls[0].name,'apply_course_payment');assert.equal(rpcCalls[0].args.p_order_id,'order_SERVER');assert.equal(rpcCalls[0].args.p_payment_id,'pay_VERIFIED');assert.equal(rpcCalls[0].args.p_amount,49900);
 assert.equal((await invoke(webhook,signed())).status,200);assert.deepEqual(rpcCalls[0].args,rpcCalls[1].args,'duplicate must use same trusted identity/fingerprint');
 const pending=JSON.parse(bytes);pending.payload.payment.entity.captured=false;assert.equal((await invoke(webhook,signed(Buffer.from(JSON.stringify(pending))))).status,400);
 const refund=Buffer.from(JSON.stringify({event:'refund.processed',payload:{refund:{entity:{payment_id:'pay_VERIFIED',amount:500,status:'processed',currency:'INR'}}}}));assert.equal((await invoke(webhook,signed(refund))).status,200);assert.equal(rpcCalls.at(-1).args.p_event_kind,'refunded');assert.equal(rpcCalls.at(-1).args.p_amount,49900,'refund RPC binds full trusted payment amount, not partial refund amount');
 assert.equal((await invoke(webhook,signed(Buffer.from('{bad')))).status,400);
 assert.equal((await invoke(webhook,signed(Buffer.from('{"event":"payment.failed"}')))).body.ignored,true);
 const failing={...supabase,rpc:async()=>({error:{message:env.GATEWISE_SUPABASE_SERVICE_ROLE_KEY}})};const denied=await invoke(webhookHandler({env,supabase:failing,provider}),signed());assert.equal(denied.status,503);assert(!JSON.stringify(denied).includes('serverOnly'));
 const native={method:'POST',headers:signed().headers,async *[Symbol.asyncIterator](){yield bytes.subarray(0,11);yield bytes.subarray(11)}};
 Object.defineProperty(native,'body',{get(){throw new Error('Do not invoke the platform JSON parser')}});
 const nativeHeaders={};let nativeResponse;const nativeRes={setHeader:(k,v)=>nativeHeaders[k]=v,end:s=>nativeResponse=s};
 await webhook(native,nativeRes);assert.equal(nativeRes.statusCode,200);assert.equal(JSON.parse(nativeResponse).received,true);
 // The request body cannot select the offer price or extend its deadline.
 const deadline='2026-10-31T18:30:00.000Z', cutoff=Date.parse(deadline);
 const saleEnv={...env,GATEWISE_COURSE_OFFER_ENDS_AT:deadline};
 for(const [now,amount] of [[cutoff-1,29900],[cutoff,49900],[cutoff+86400000,49900]]){
  const fn=checkoutHandler({env:saleEnv,supabase,provider,now:()=>now,randomUUID:crypto.randomUUID});
  const result=await invoke(fn,{headers:{authorization:'Bearer validToken'},body:{amount:29900,offerEndsAt:'2099-01-01'}});
  assert.equal(result.status,200);assert.equal(result.body.amount,amount);assert.equal(providerCalls.at(-1).amount,amount);assert.equal(rows.payment_orders.at(-1).amount,amount);
 }
 // A discounted order may be captured after expiry; bind its stored amount.
 const discounted=JSON.parse(bytes);discounted.payload.payment.entity.amount=29900;
 assert.equal((await invoke(webhookHandler({env:saleEnv,supabase,provider}),signed(Buffer.from(JSON.stringify(discounted))))).status,200);
 assert.equal(rpcCalls.at(-1).args.p_amount,29900);
 console.log('Payment handler checks passed: verified auth, server price/order binding, owner/paid protection, raw signatures, refunds, duplicates, key isolation and disabled setup.');
})().catch(e=>{console.error(e);process.exitCode=1});
