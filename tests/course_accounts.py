"""Protected course browser checks using the real SDK and simulated Supabase HTTP."""
import base64,copy,json,os,subprocess,time
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect,Error
ROOT=Path(__file__).resolve().parents[1]
HOST='https://gatewise-test.supabase.co'
URL='http://127.0.0.1:3000/'
full=json.loads((ROOT/'data/syllabus.json').read_text())
public=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {readCourseCatalog,protectedCatalog} from './scripts/course-catalog.mjs';console.log(JSON.stringify(protectedCatalog(await readCourseCatalog(process.cwd()))));"],cwd=ROOT))
users={'paid@example.test':'11111111-1111-4111-8111-111111111111','free@example.test':'22222222-2222-4222-8222-222222222222','owner@example.test':'33333333-3333-4333-8333-333333333333'}
roles={users['paid@example.test']:'paid',users['free@example.test']:'free',users['owner@example.test']:'owner'}
tokens={};records={};errors=[];pending=[];delay=False;fail_access=False
rows=[{'lesson_id':l['id'],'payload':l,'is_preview':i==0} for s in full for i,l in enumerate(s['lessons'])]
resources=[{'resource_id':name,'payload':json.loads((ROOT/f'data/{name}.json').read_text())} for name in ['questions','pyqs','lesson-questions']]
def session(email):
 uid=users[email];now=int(time.time());payload={'sub':uid,'email':email,'role':'authenticated','aud':'authenticated','iat':now,'exp':now+3600}
 enc=lambda v:base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
 token=enc({'alg':'HS256','typ':'JWT'})+'.'+enc(payload)+'.test';tokens[token]=uid
 return {'access_token':token,'refresh_token':'refresh-'+uid,'expires_in':3600,'expires_at':now+3600,'token_type':'bearer','user':{'id':uid,'email':email,'aud':'authenticated','role':'authenticated','app_metadata':{'provider':'email','providers':['email']},'user_metadata':{},'created_at':'2026-10-04T00:00:00Z','identities':[]}}
def handle(route):
 global delay
 r=route.request;p=urlparse(r.url);path=p.path;uid=tokens.get(r.headers.get('authorization','').replace('Bearer ',''));body=r.post_data_json if r.post_data else {}
 def respond(value=None,status=200):route.fulfill(status=status,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='' if status==204 else json.dumps(value))
 if r.method=='OPTIONS':route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'});return
 if path=='/auth/v1/token':respond(session(body['email']));return
 if path=='/auth/v1/logout':respond(status=204);return
 if path=='/rest/v1/rpc/course_access':
  if fail_access:respond({'message':'Unavailable'},503);return
  role=roles.get(uid,'free');respond({'courseId':'gate-cs-2027','role':'owner' if role=='owner' else 'learner','hasAccess':role in ['paid','owner'],'validUntil':'2099-01-01T00:00:00Z' if role=='paid' else '2020-01-01T00:00:00Z' if role=='expired' else None});return
 if not uid:respond({'message':'Unauthorized'},401);return
 if path=='/auth/v1/user':respond(session(next(k for k,v in users.items() if v==uid))['user'])
 elif path=='/rest/v1/study_progress':respond([records[uid]] if uid in records else [])
 elif path=='/rest/v1/rpc/save_study_progress':
  rev=records.get(uid,{}).get('revision',0)
  if body['p_expected_revision']!=rev:respond(-1)
  else:records[uid]={'data':body['p_data'],'revision':rev+1};respond(rev+1)
 elif path in ['/rest/v1/course_lessons','/rest/v1/course_resources']:
  assert roles.get(uid) in ['paid','owner'],'unauthorised full-content request'
  payload=rows if path.endswith('course_lessons') else resources
  if delay:pending.append((route,copy.deepcopy(payload)))
  else:respond(payload)
 else:raise AssertionError('Unexpected '+path)
def sign_in(page,email):
 page.locator('#account').click();page.locator('#accountemail').fill(email);page.locator('#accountpassword').fill('password123');page.locator('#accountsubmit').click();page.wait_for_function('!GatewiseProgress.locked && GatewiseCloud.user!==null');page.wait_for_function('GatewiseCourse.access.status!=="loading"')
def sign_out(page):
 page.locator('#account').click();page.locator('#signout').click();page.wait_for_function('!GatewiseProgress.locked && GatewiseCloud.user===null');page.wait_for_function('GatewiseCourse.access.status!=="loading"')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 ctx=browser.new_context();ctx.route('https://fonts.googleapis.com/**',lambda r:r.abort());ctx.route('https://fonts.gstatic.com/**',lambda r:r.abort())
 ctx.route('**/cloud-config.js',lambda r:r.fulfill(content_type='text/javascript',body=f'window.GATEWISE_CLOUD={{url:"{HOST}",publishableKey:"sb_publishable_test"}};'))
 ctx.route('**/course-config.js',lambda r:r.fulfill(content_type='text/javascript',body='window.GATEWISE_COURSE={mode:"protected",courseId:"gate-cs-2027",priceMinor:49900,checkoutEnabled:false};'))
 for name,payload in public.items():ctx.route('**/data/'+name+'.json',lambda r,request,payload=payload:r.fulfill(content_type='application/json',body=json.dumps(payload)))
 ctx.route(HOST+'/**',handle)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.course-lock');assert page.locator('.workedexample').count()==0
 page.locator('#lessonnotes').fill('My preview note');page.reload();page.wait_for_selector('#lessonnotes');expect(page.locator('#lessonnotes')).to_have_text('My preview note')
 page.goto(URL+'#learn/0/0-propositions');page.wait_for_selector('.workedexample')
 page.goto(URL+'#pricing');page.wait_for_selector('[data-course-checkout]');assert page.locator('[data-course-checkout]').is_disabled();assert '₹499' in page.locator('.course-paid').inner_text()
 sign_in(page,'paid@example.test');assert page.evaluate('GatewiseCourse.access.status')=='paid'
 page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.workedexample');assert page.locator('.course-lock').count()==0
 page.locator('#lessonnotes').fill('Paid account private note')
 page.goto(URL+'#mocks');page.wait_for_selector('#startmock');page.locator('#startmock').click();page.wait_for_selector('#submitmock')
 stored=page.evaluate('JSON.parse(GatewiseProgress.getItem("gatewise-mock"))');assert len(stored['questions'])==65;assert all(set(q)=={'id','marks'} for q in stored['questions'])
 sign_out(page);sign_in(page,'free@example.test');page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.course-lock');assert page.locator('#lessonnotes').inner_text()==''
 page.goto(URL+'#mocks');page.wait_for_selector('.course-lock');assert page.locator('#startmock').count()==0
 sign_out(page);sign_in(page,'owner@example.test');assert page.evaluate('GatewiseCourse.access.status')=='owner'
 page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.workedexample');assert page.locator('#lessonnotes').inner_text()==''
 sign_out(page);sign_in(page,'paid@example.test');roles[users['paid@example.test']]='expired';assert not page.evaluate('GatewiseCourse.refresh()');page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.course-lock');expect(page.locator('#lessonnotes')).to_have_text('Paid account private note')
 roles[users['paid@example.test']]='paid';assert page.evaluate('GatewiseCourse.refresh()');fail_access=True;assert not page.evaluate('GatewiseCourse.refresh()');assert page.evaluate('GatewiseCourse.data.subjects[0].lessons[1].locked');fail_access=False;assert page.evaluate('GatewiseCourse.refresh()')
 delay=True;page.evaluate('()=>{GatewiseCourse.refresh()}')
 for _ in range(30):
  page.wait_for_timeout(50)
  if len(pending)==2:break
 assert len(pending)==2
 sign_out(page);delay=False
 for route,payload in pending:
  try:route.fulfill(content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(payload))
  except Error:pass
 page.wait_for_timeout(200);assert not page.evaluate('GatewiseCourse.access.hasAccess');assert page.evaluate('GatewiseCourse.data.subjects[0].lessons[1].locked')
 page.goto(URL+'#pricing');page.wait_for_selector('.course-plans');page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/tmp/gatewise-pricing-mobile.png',full_page=True)
 # A browser success callback is not payment proof; only backend access enables lessons.
 ctx.route('**/course-config.js',lambda r:r.fulfill(content_type='text/javascript',body='window.GATEWISE_COURSE={mode:"protected",courseId:"gate-cs-2027",priceMinor:49900,checkoutEnabled:true};'))
 ctx.route('**/api/checkout',lambda r:r.fulfill(content_type='application/json',body=json.dumps({'orderId':'order_SERVER','keyId':'rzp_test_PUBLIC','amount':49900,'currency':'INR','durationMonths':12})))
 page.reload();page.wait_for_selector('[data-course-checkout]');sign_in(page,'free@example.test')
 page.goto(URL+'#pricing');page.wait_for_selector('[data-course-checkout]')
 page.evaluate("window.Razorpay=function(options){this.on=()=>{};this.open=()=>options.handler({razorpay_payment_id:'pay_FAKE',razorpay_signature:'FAKE'})}")
 page.locator('[data-course-checkout]').click();page.wait_for_function('GatewiseCourse.access.status==="preview"');assert not page.evaluate('GatewiseCourse.access.hasAccess')
 assert page.evaluate('GatewiseCourse.data.subjects[0].lessons[1].locked')
 roles[users['free@example.test']]='paid';assert page.evaluate('GatewiseCourse.refresh()');assert page.evaluate('GatewiseCourse.canMock()')
 assert not errors,errors
 browser.close()
 print('Protected browser checks passed: previews, rich notes, paid/owner access, expiry, failures, mock references, account isolation, stale responses, disabled checkout and mobile.')
