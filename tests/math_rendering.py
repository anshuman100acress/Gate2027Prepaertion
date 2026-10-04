"""Offline rendering, dynamic feedback, accessibility and narrow-screen math checks."""
import json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
subjects=json.loads((ROOT/'data/syllabus.json').read_text())
lessons=[l for s in subjects for l in s['lessons']]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000})
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 # Every external request is blocked: KaTeX scripts/styles/fonts must be local.
 page.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:3000/') else route.abort())
 for l in lessons:
  page.goto('http://127.0.0.1:3000/#learn/'+l['id'].split('-')[0]+'/'+l['id'])
  page.wait_for_selector('#lesson-method .katex')
  assert page.locator('.katex-error').count()==0,l['id']
  assert page.locator('.formulacard').count()==len(l['gateGuide']['formulas']),l['id']
  assert page.locator('.formulacard .katex').count()==len(l['gateGuide']['formulas']),l['id']
  assert page.locator('.katex-mathml math').count()==page.locator('.katex').count(),l['id']
  # The renderer must consume delimiters, leaving no raw TeX in visible teaching text.
  assert not re.search(r'\\[\(\[]|\\(?:frac|begin|sum|int)\b',page.locator('#stagecontent').inner_text()),l['id']
  if any(isinstance(step,dict) for e in l['examples'] for step in e['steps']):
   assert page.locator('.examplecontext').count()>0 and page.locator('.answercheck').count()>0,l['id']
  # All pages, including long sums and nested matrices, must fit a phone viewport.
  page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),l['id']
  page.set_viewport_size({'width':1440,'height':1000})
 page.goto('http://127.0.0.1:3000/#learn/0/0-propositions');page.wait_for_selector('.katex')
 page.locator('#practice-details > summary').click();page.locator('[data-solution="0"]').click()
 page.wait_for_selector('#lessonfeedback-0 .katex')
 assert page.locator('#lessonfeedback-0 .checksolution').is_visible()
 page.locator('#lessonfeedback-0 [data-returnexamples]').click()
 page.wait_for_function('Math.abs(document.querySelector("#worked-example-0").getBoundingClientRect().top)<100')
 # Original practice explanations and full mock review render inserted math too.
 page.goto('http://127.0.0.1:3000/#practice/0');page.wait_for_selector('#sourcefilter')
 page.select_option('#sourcefilter','original');page.select_option('#typefilter','NAT')
 page.locator('#nat').fill('0');page.locator('#check').click()
 page.wait_for_selector('#feedback .katex');assert page.locator('#feedback .katex-error').count()==0
 page.goto('http://127.0.0.1:3000/#mocks');page.wait_for_selector('#startmock');page.locator('#startmock').click()
 page.evaluate('finishMock()');page.wait_for_selector('.resultscore')
 assert page.locator('details .katex').count()>0
 assert page.locator('.katex-error').count()==0
 page.goto('http://127.0.0.1:3000/#learn/0/0-propositions');page.wait_for_selector('#lessonnotes')
 # Text entered by the user is preserved exactly and is not treated as authored math or HTML.
 note=r'My literal note: \(x^2\) <img src=x onerror=alert(1)>'
 page.locator('#lessonnotes').fill(note)
 page.goto('http://127.0.0.1:3000/#revision');page.wait_for_selector('#revisionfilter');page.select_option('#revisionfilter','notes')
 assert page.locator('.usernote').inner_text()==note
 assert page.locator('.usernote .katex,.usernote img').count()==0
 page.goto('http://127.0.0.1:3000/#learn/0/0-matrices-rank');page.wait_for_selector('.examplecontext')
 assert page.locator('.workedexample .mtable').count()>=2
 # Even hostile LaTeX supplied to the renderer cannot create trusted HTML or a javascript link.
 result=page.evaluate(r'''()=>katex.renderToString('\\href{javascript:alert(1)}{click}',{trust:false,throwOnError:false})''')
 assert 'href="javascript:' not in result
 page.set_viewport_size({'width':1440,'height':1000})
 page.screenshot(path='/tmp/gatewise-math-desktop.png',full_page=True)
 page.set_viewport_size({'width':390,'height':844})
 page.screenshot(path='/tmp/gatewise-math-mobile.png',full_page=True)
 assert not errors,errors
 print(f'Passed: {len(lessons)} lessons render math offline with MathML; phone layouts, matrices, dynamic solutions, example links and literal notes verified.')
 browser.close()
