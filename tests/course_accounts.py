"""Protected course browser checks using the real SDK and simulated Supabase HTTP."""
import base64,copy,json,os,subprocess,time
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect,Error
ROOT=Path(__file__).resolve().parents[1]
HOST='https://gatewise-test.supabase.co'
URL=os.environ.get('TEST_SITE_URL','http://127.0.0.1:3000/').rstrip('/')+'/'
full=json.loads((ROOT/'data/syllabus.json').read_text())
public=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {readCourseCatalog,protectedCatalog} from './scripts/course-catalog.mjs';console.log(JSON.stringify(protectedCatalog(await readCourseCatalog(process.cwd()))));"],cwd=ROOT))
users={'paid@example.test':'11111111-1111-4111-8111-111111111111','free@example.test':'22222222-2222-4222-8222-222222222222','owner@example.test':'33333333-3333-4333-8333-333333333333'}
roles={users['paid@example.test']:'paid',users['free@example.test']:'free',users['owner@example.test']:'owner'}
tokens={};records={};errors=[];pending=[];delay=False;fail_access=False
rows=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {readCourseCatalog,courseRows} from './scripts/course-catalog.mjs';console.log(JSON.stringify(courseRows(await readCourseCatalog(process.cwd()),'gate-cs-2027').lessons));"],cwd=ROOT))
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
 page.locator('#mobile-account' if page.locator('#mobile-account').is_visible() else '#account').click();page.locator('#accountemail').fill(email);page.locator('#accountpassword').fill('password123');page.locator('#accountsubmit').click();page.wait_for_function('!GatewiseProgress.locked && GatewiseCloud.user!==null');page.wait_for_function('GatewiseCourse.access.status!=="loading"')
def sign_out(page):
 page.locator('#mobile-account' if page.locator('#mobile-account').is_visible() else '#account').click();page.locator('#signout').click();page.wait_for_function('!GatewiseProgress.locked && GatewiseCloud.user===null');page.wait_for_function('GatewiseCourse.access.status!=="loading"')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 ctx=browser.new_context(service_workers="block");ctx.route('https://fonts.googleapis.com/**',lambda r:r.abort());ctx.route('https://fonts.gstatic.com/**',lambda r:r.abort())
 ctx.route('**/cloud-config.js',lambda r:r.fulfill(content_type='text/javascript',body=f'window.GATEWISE_CLOUD={{url:"{HOST}",publishableKey:"sb_publishable_test"}};'))
 ctx.route('**/course-config.js',lambda r:r.fulfill(content_type='text/javascript',body='window.GATEWISE_COURSE={mode:"protected",courseId:"gate-cs-2027",priceMinor:49900,questionCount:486,pyqCount:105,checkoutEnabled:false};'))
 for name,payload in public.items():ctx.route('**/data/'+name+'.json',lambda r,request,payload=payload:r.fulfill(content_type='application/json',body=json.dumps(payload)))
 ctx.route(HOST+'/**',handle)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.course-lock');assert page.locator('.workedexample').count()==0
 page.locator('#lessonnotes').fill('My preview note');page.reload();page.wait_for_selector('#lessonnotes');expect(page.locator('#lessonnotes')).to_have_text('My preview note')
 page.goto(URL+'#learn/0/0-propositions');page.wait_for_selector('.workedexample')
 assert page.evaluate('GatewiseCourse.data.bank.length')==10
 page.goto(URL+'#premium/topics/0-propositions-topic-1');page.wait_for_selector('.course-lock');assert page.locator('.guided-exercise').count()==0
 page.goto(URL+'#pricing');page.wait_for_selector('[data-course-checkout]');assert page.locator('[data-course-checkout]').is_disabled();assert '₹299' in page.locator('.course-price').last.inner_text();assert '₹499' in page.locator('.course-offer').inner_text();assert '31 October 2026' in page.locator('.course-offer').inner_text();assert '486 scored questions' in page.locator('.course-paid').inner_text()
 page.goto(URL+'#pyqs');page.wait_for_selector('#pyq-all');assert page.evaluate('bank.filter(q=>q.source).length')==1
 page.locator('#pyq-all').click();page.wait_for_selector('#check');page.locator('input[value="2"]').check();page.locator('#check').click();assert '63' in page.locator('#feedback').inner_text();assert 'Matched to official final key' in page.locator('.pyq-source').inner_text()
 page.locator('a[href="#pyqs"]').first.click();page.wait_for_selector('#pyq-all');assert page.locator('[data-pyq-paper]').count()==1
 sign_in(page,'paid@example.test');assert page.evaluate('GatewiseCourse.access.status')=='paid'
 assert page.evaluate('GatewiseCourse.data.bank.length')==486
 assert page.evaluate('bank.filter(q=>q.source).length')==105
 page.goto(URL+'#pyqs/2023_CS');page.wait_for_selector('[data-pyq-paper="2023_CS"]');page.locator('[data-pyq-paper="2023_CS"]').click();page.wait_for_selector('#check');assert '1 / 4' in page.locator('.sectionhead').inner_text();page.locator('input[value="0"]').check();page.locator('#check').click();assert '4' in page.locator('#feedback').inner_text()
 page.locator('#next').click();assert 'Q12' in page.locator('.pyq-source').inner_text()
 page.locator('input[value="1"]').check();page.locator('#check').click();assert '✓ Correct' in page.locator('#feedback').inner_text()
 # Premium additions on an otherwise free lesson arrive only after paid hydration.
 page.goto(URL+'#premium/topics/0-propositions-topic-1');page.wait_for_selector('.guided-exercise');assert page.locator('.guided-exercise').count()==5
 assert page.locator('.complexity-badge').count()==5
 page.locator('[data-topic-view="examples"]').click();assert page.locator('[data-topic-example]').count()==5
 page.locator('[data-topic-example]').last.locator('summary').click();assert 'Case A:' in page.locator('[data-topic-example]').last.inner_text()
 page.locator('.topic-formulas summary').click();page.wait_for_selector('.topic-formulas .katex');assert page.locator('.formula-card').count()>0
 page.locator('[data-topic-view="practice"]').click();assert page.locator('.guided-exercise').count()==5
 work=page.locator('[data-topic-work]').first;work.fill('My own truth table, before seeing the solution.')
 solution=page.locator('[data-topic-solution]').first;assert not solution.evaluate('(el)=>el.open')
 solution.locator('summary').click();solution.locator('[data-topic-rate="confident"]').click()
 page.reload();page.wait_for_selector('[data-topic-work]');assert page.locator('[data-topic-work]').first.input_value().startswith('My own truth table')
 assert 'confident' in page.locator('[data-topic-status]').first.inner_text()
 # Every paid guide must render all five levels and its worked-case view.
 for subject in full:
  for lesson in subject['lessons']:
   for guide in lesson['premiumTopics']:
    page.goto(URL+'#premium/topics/'+guide['id'])
    page.wait_for_selector('[data-topic-work="'+guide['id']+'/fundamental"]')
    assert page.locator('.guided-exercise').count()==5,guide['id']
    assert page.locator('.complexity-badge').evaluate_all('(els)=>els.map(e=>Number(e.dataset.complexity))')==[1,2,3,4,5],guide['id']
    page.locator('[data-topic-view="examples"]').click()
    assert page.locator('[data-topic-example]').count()==5,guide['id']
    page.locator('[data-topic-example]').last.locator('summary').click()
    assert page.locator('.katex-error').count()==0,guide['id']
 page.goto(URL+'#premium/topics');page.wait_for_selector('#guide-search');page.locator('#guide-search').fill('Bayes');assert page.locator('.guide-card').count()>0
 page.locator('.guide-card').filter(has=page.get_by_role('heading',name='Bayes theorem',exact=True)).click();page.wait_for_selector('.premium-sources a');assert 'ocw.mit.edu' in page.locator('.premium-sources a').first.get_attribute('href')
 page.goto(URL+'#practice/0/0-counting/mastery');page.wait_for_selector('#check');assert page.locator('.complexity-badge').count()==1
 assert page.locator('#sourcefilter').input_value()=='mastery';page.locator('input[value="2"]').check();page.locator('#check').click();assert '210' in page.locator('#feedback').inner_text()
 page.select_option('#complexityfilter','1');assert page.locator('#check').count()==0
 page.select_option('#complexityfilter','4');page.wait_for_selector('#check')
 page.goto(URL+'#premium/recall');page.wait_for_selector('#reveal-card');assert not page.locator('#recall-answer').is_visible()
 page.locator('#reveal-card').click();page.locator('[data-recall-rate="remembered"]').click()
 assert page.evaluate('Object.values(state.cardReviews).length')==1
 assert page.evaluate('Object.values(state.cardReviews)[0].due>Date.now()')
 page.goto(URL+'#premium/drills');page.wait_for_selector('#start-drill');page.select_option('#drill-subject','2');page.select_option('#drill-pool','clinic');page.select_option('#drill-count','5')
 assert '3 questions' in page.locator('#drill-available').inner_text();page.locator('#start-drill').click();page.wait_for_selector('#finish-drill')
 run=page.evaluate('JSON.parse(GatewiseProgress.getItem("gatewise-v1")).drillRun');assert len(run['ids'])==3;assert 'questions' not in run
 # Answer the known cache NAT correctly; leave the other two questions unanswered.
 nat_index=run['ids'].index('clinic-2-cache-0');page.locator(f'[data-drill-q="{nat_index}"]').click();page.locator('#nat').fill('19');page.locator('#nat').dispatch_event('change')
 page.reload();page.wait_for_selector('#finish-drill');assert page.locator('#nat').input_value()=='19'
 page.locator('#finish-drill').click();page.wait_for_selector('#new-drill');assert page.locator('.resultscore').inner_text().strip()=='1 / 3'
 assert page.evaluate('state.drillResults[0].correct')==1
 assert page.evaluate('state.attempts.filter(a=>a.qid==="clinic-2-cache-0")[0].correct')
 page.locator('#new-drill').click();page.select_option('#drill-subject','2');page.select_option('#drill-pool','clinic');page.locator('#start-drill').click();page.wait_for_selector('#finish-drill')
 page.evaluate('state.drillRun.end=Date.now()-1');page.wait_for_selector('#new-drill')
 assert page.evaluate('state.drillResults.length')==2
 # A wrong retry appears in performance, then a correct retry clears it.
 page.goto(URL+'#practice/2/2-cache');page.wait_for_selector('#sourcefilter');page.select_option('#sourcefilter','clinic')
 for _ in range(3):
  if page.locator('#nat').count():break
  page.locator('#next').click()
 page.locator('#nat').fill('0');page.locator('#check').click()
 page.goto(URL+'#premium/insights');page.wait_for_selector('.mistake-panel');assert '1 questions' in page.locator('.mistake-panel').inner_text()
 page.goto(URL+'#premium/drills');page.wait_for_selector('#new-drill');page.locator('#new-drill').click();page.wait_for_selector('#start-drill');page.select_option('#drill-pool','mistakes');assert '1 questions' in page.locator('#drill-available').inner_text();page.locator('#start-drill').click();page.locator('#nat').fill('19');page.locator('#finish-drill').click()
 page.goto(URL+'#premium/insights');page.wait_for_selector('.mistake-panel');assert '0 questions' in page.locator('.mistake-panel').inner_text()
 page.goto(URL+'#premium/topics/0-matrices-rank-topic-1');page.wait_for_selector('.guided-exercise');page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/tmp/gatewise-premium-topic-mobile.png',full_page=True);page.set_viewport_size({'width':1440,'height':1000})
 page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.workedexample');assert page.locator('.course-lock').count()==0
 page.locator('#lessonnotes').fill('Paid account private note')
 page.goto(URL+'#mocks');page.wait_for_selector('#startmock');page.locator('#startmock').click();page.wait_for_selector('#submitmock')
 stored=page.evaluate('JSON.parse(GatewiseProgress.getItem("gatewise-mock"))');assert len(stored['questions'])==65;assert all(set(q)=={'id','marks'} for q in stored['questions'])
 page.set_viewport_size({'width':390,'height':844});page.wait_for_selector('.mocknavigator summary');assert page.locator('#timer').is_visible();page.wait_for_function('!document.querySelector(".mocknavigator").open');page.locator('.mocknavigator summary').click();assert page.locator('#submitmock').is_visible();page.locator('.mocknavigator summary').click();page.locator('#saveNext').click();assert page.evaluate('mock.index')==1;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.set_viewport_size({'width':1440,'height':1000})
 sign_out(page);sign_in(page,'free@example.test');page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.course-lock');assert page.locator('#lessonnotes').inner_text()==''
 page.goto(URL+'#pyqs/2018_CS');page.wait_for_selector('#pyq-all');assert page.evaluate('bank.filter(q=>q.source).length')==1;assert page.locator('[data-pyq-paper]').count()==0
 page.goto(URL+'#mocks');page.wait_for_selector('.course-lock');assert page.locator('#startmock').count()==0
 page.goto(URL+'#premium/recall');page.wait_for_selector('.course-lock');assert page.locator('#reveal-card').count()==0
 assert page.evaluate('Object.keys(state.cardReviews).length')==0
 sign_out(page);sign_in(page,'owner@example.test');assert page.evaluate('GatewiseCourse.access.status')=='owner'
 page.goto(URL+'#premium/recall');page.wait_for_selector('#reveal-card')
 page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.workedexample');assert page.locator('#lessonnotes').inner_text()==''
 sign_out(page);sign_in(page,'paid@example.test');roles[users['paid@example.test']]='expired';assert not page.evaluate('GatewiseCourse.refresh()');page.goto(URL+'#learn/0/0-quantifiers');page.wait_for_selector('.course-lock');expect(page.locator('#lessonnotes')).to_have_text('Paid account private note')
 page.goto(URL+'#premium/topics/0-propositions-topic-1');page.wait_for_selector('.course-lock');assert page.locator('.guided-exercise').count()==0
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
 ctx.route('**/course-config.js',lambda r:r.fulfill(content_type='text/javascript',body='window.GATEWISE_COURSE={mode:"protected",courseId:"gate-cs-2027",priceMinor:49900,questionCount:486,pyqCount:105,checkoutEnabled:true};'))
 ctx.route('**/api/checkout',lambda r:r.fulfill(content_type='application/json',body=json.dumps({'orderId':'order_SERVER','keyId':'rzp_test_PUBLIC','amount':29900,'currency':'INR','durationMonths':12})))
 page.reload();page.wait_for_selector('[data-course-checkout]');sign_in(page,'free@example.test')
 page.goto(URL+'#pricing');page.wait_for_selector('[data-course-checkout]')
 page.evaluate("window.Razorpay=function(options){this.on=()=>{};this.open=()=>options.handler({razorpay_payment_id:'pay_FAKE',razorpay_signature:'FAKE'})}")
 page.locator('[data-course-checkout]').click();page.wait_for_function('GatewiseCourse.access.status==="preview"');assert not page.evaluate('GatewiseCourse.access.hasAccess')
 assert page.evaluate('GatewiseCourse.data.subjects[0].lessons[1].locked')
 roles[users['free@example.test']]='paid';page.evaluate('async()=>{await GatewiseCourse.refresh()}');page.wait_for_function('GatewiseCourse.canMock()')
 expiry_ctx=browser.new_context(service_workers="block");expiry_ctx.route('**/cloud-config.js',lambda r:r.fulfill(content_type='text/javascript',body='window.GATEWISE_CLOUD={};'))
 expiry_ctx.route('**/course-config.js',lambda r:r.fulfill(content_type='text/javascript',body='window.GATEWISE_COURSE={mode:"protected",checkoutEnabled:false};'))
 for name,payload in public.items():expiry_ctx.route('**/data/'+name+'.json',lambda r,request,payload=payload:r.fulfill(content_type='application/json',body=json.dumps(payload)))
 expiry=expiry_ctx.new_page();expiry.on('pageerror',lambda e:errors.append(str(e)));expiry.clock.install(time=datetime(2026,10,31,18,29,50,tzinfo=timezone.utc));expiry.goto(URL+'#pricing');expiry.wait_for_selector('.course-offer');assert '₹299' in expiry.locator('.course-price').last.inner_text()
 expiry.clock.fast_forward(11000);expect(expiry.locator('.course-price').last).to_contain_text('₹499');assert expiry.locator('.course-offer').count()==0;expiry_ctx.close()
 assert not errors,errors
 browser.close()
 print('Protected browser checks passed: exact free tier, paid topic practice, saved work, recall, timed drills and expiry, mistake retries, master access, account isolation, stale responses, checkout and mobile.')
