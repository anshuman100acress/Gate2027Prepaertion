"""Browser regression checks. Requires Playwright and Chromium; not needed to run the app."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
lessons=[l for s in json.loads((ROOT/'data/syllabus.json').read_text()) for l in s['lessons']]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000})
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('https://fonts.googleapis.com/**',lambda route:route.abort())
 page.route('https://fonts.gstatic.com/**',lambda route:route.abort())
 page.goto('http://127.0.0.1:3000/#learn');page.wait_for_selector('#curriculumsearch')
 assert page.locator('.curriculumlesson').count()==len(lessons)
 page.locator('#curriculumsearch').fill('LU decomposition')
 assert page.locator('.curriculumlesson').count()==1
 page.goto('http://127.0.0.1:3000/#learn/0/0-propositions');page.wait_for_selector('#lessonarticle')
 assert page.locator('.learningcheck').count()==0
 assert page.locator('.lessonsection').count()>=4
 assert page.locator('.labtable tbody tr').count()==4
 page.select_option('#logicexpression','contra');assert '3 of 4' in page.locator('#logicresult').inner_text()
 page.locator('#lessonnotes').fill('I need to distinguish converse and contrapositive.')
 page.locator('#bookmarklesson').click()
 page.locator('#examplesnext').click()
 assert page.locator('.workedexample').count()==2
 assert page.locator('.workedexample li').count()==6
 page.locator('#markread').click()
 state=page.evaluate('JSON.parse(localStorage.getItem("gatewise-v1"))')
 assert '0-propositions' in state['completed']
 assert '0-propositions' not in state['understood']
 assert page.locator('.learningcheck').count()==0
 page.locator('#optionalchecks').click()
 page.locator('[data-hint="0"]').click();assert page.locator('.hintbox').count()==1
 page.locator('[data-solution="0"]').click()
 assert '0-propositions' not in page.evaluate('JSON.parse(localStorage.getItem("gatewise-v1")).understood')
 page.locator('input[name="lessonanswer-0"][value="1"]').check()
 page.locator('[data-answer="0"]').click()
 page.locator('#lessonanswer-1').fill('3');page.locator('[data-answer="1"]').click()
 assert '0-propositions' in page.evaluate('JSON.parse(localStorage.getItem("gatewise-v1")).understood')
 page.reload();page.wait_for_selector('.learningcheck')
 assert page.locator('#lessonnotes').input_value()=='I need to distinguish converse and contrapositive.'
 assert page.locator('#stage-checks').get_attribute('aria-selected')=='true'
 page.locator('#stage-revision').click();page.locator('#schedulereview').click()
 page.goto('http://127.0.0.1:3000/#revision');page.wait_for_selector('#revisionfilter')
 page.select_option('#revisionfilter','notes');assert page.locator('.revisioncard').count()==1
 assert 'contrapositive' in page.locator('.usernote').inner_text()
 page.select_option('#revisionfilter','scheduled');assert page.locator('.revisioncard').count()==1
 page.goto('http://127.0.0.1:3000/#practice/0/0-propositions');page.wait_for_selector('#topicfilter')
 assert '2 questions' in page.locator('.filters').inner_text()
 assert 'Read the full lesson' in page.locator('#app').inner_text()
 page.goto('http://127.0.0.1:3000/#learn/7/7-virtual-files');page.wait_for_selector('#pagepolicy')
 assert 'Total page faults: 5' in page.locator('#pageresult p').inner_text()
 page.select_option('#pagepolicy','LRU');assert '4' in page.locator('#pageresult p').inner_text()
 page.goto('http://127.0.0.1:3000/#learn/4/4-search-sort');page.wait_for_selector('#searchstep')
 for _ in range(2):page.locator('#searchstep').click()
 assert 'Found 11 at zero-based index 5' in page.locator('#searchreason').inner_text()
 page.goto('http://127.0.0.1:3000/#mocks');page.wait_for_selector('#startmock');page.locator('#startmock').click()
 mock=page.evaluate('JSON.parse(localStorage.getItem("gatewise-mock"))')
 assert len(mock['questions'])==65 and sum(q['marks'] for q in mock['questions'])==100
 assert all('lesson' not in q for q in mock['questions'])
 page.goto('http://127.0.0.1:3000/#papers');page.wait_for_selector('#papercards')
 assert page.locator('#papercards .subjectcard').count()==24
 # Every lesson renders theory, examples, hints and a check without malformed DOM or missing content.
 for l in lessons:
  sid=l['id'].split('-')[0]
  page.goto(f'http://127.0.0.1:3000/#learn/{sid}/{l["id"]}')
  page.wait_for_selector('#lessonarticle')
  page.locator('#stage-theory').click()
  assert l['title'] in page.locator('.lessonhero').inner_text()
  assert len(page.locator('#stagecontent').inner_text())>900,l['id']
  page.locator('#stage-examples').click();assert page.locator('.workedexample').count()==2
  page.locator('#stage-checks').click();assert page.locator('.learningcheck').count()==2
  page.locator('[data-solution="1"]').click();assert l['checks'][1]['explanation'] in page.locator('#lessonfeedback-1').inner_text()
 page.set_viewport_size({'width':390,'height':844})
 for path in ['learn','learn/0/0-propositions','learn/4/4-search-sort','revision']:
  page.goto('http://127.0.0.1:3000/#'+path);page.wait_for_selector('#app')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),path
 # Existing summary completion must not count as having read the new curriculum.
 page.evaluate('localStorage.setItem("gatewise-v1",JSON.stringify({name:"Old user",completed:["0-0"],attempts:[],sessions:[],tasks:[],mockResults:[]}))')
 page.reload();page.wait_for_selector('#app h1')
 migrated=page.evaluate('JSON.parse(localStorage.getItem("gatewise-v1"))')
 assert migrated['legacyCompleted']==['0-0'] and migrated['completed']==[] and migrated['name']=='Old user'
 assert not errors,errors
 print(f'Passed: all {len(lessons)} lessons render; theory-first flow, worked steps, hints, read/check separation, notes, bookmarks, revision, resume, topic filtering, labs, mock allocation, PYQs, mobile and migration.')
 browser.close()
