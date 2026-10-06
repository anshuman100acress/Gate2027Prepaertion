"""Coverage, arithmetic and browser navigation checks for the detailed teaching units."""
import json,os,re,sys
from fractions import Fraction
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
subjects=json.loads((ROOT/'data/syllabus.json').read_text())
lessons={l['id']:l for s in subjects for l in s['lessons']}
units=[t for l in lessons.values() for t in l['tutorials']]
tutorials={t['id']:t for t in units}
coverage=json.loads((ROOT/'data/topic-coverage.json').read_text())
assert len(tutorials)==len(units)==257
example_count=sum(len(l['examples'])+len(l['tutorials']) for l in lessons.values())
assert example_count==401
for row in coverage:
 target=tutorials[row['tutorial']]
 assert row['targetLesson'] in lessons and row['topic'] in target['topics'],row
 assert row['anchor']=='topic-'+target['id']
for t in tutorials.values():
 assert len(t['body'].split())>=110,t['id']
 assert len(t['example']['steps'])>=3 and t['example']['answer'] and t['example']['verification'],t['id']
# Check the exact matrices and row-operation arithmetic in the requested elimination example.
gaussian=tutorials['0-matrices-rank-gaussian']['example']
def matrix(step):
 match=re.search(r'\\begin\{bmatrix\}(.*?)\\end\{bmatrix\}',step['equation'])
 return [[Fraction(x) for x in row.split('&')] for row in match[1].split('\\\\')]
initial,first,second=map(matrix,gaussian['steps'][:3])
expected=[initial[0],[b-2*a for a,b in zip(initial[0],initial[1])],[c-a for a,c in zip(initial[0],initial[2])]]
assert first==expected
assert second==[first[0],first[1],[c-b for b,c in zip(first[1],first[2])]]
solution=[Fraction(1),Fraction(2),Fraction(3)]
assert all(sum(a*x for a,x in zip(row[:3],solution))==row[3] for row in initial)
assert 'Rank' in lessons['0-matrices-rank']['topicCoverage']
assert 'Gaussian elimination' in lessons['0-matrices-rank']['topicCoverage']
# These named topics previously opened examples for a different operation.
focused={
 ('0-counting','Inclusion–exclusion'):'0-counting-inclusion-exclusion-three-sets',
 ('4-bfs-dfs','Graph traversals'):'4-graph-algorithms-traversal-components',
}
for (lesson,topic),tutorial in focused.items():
 assert lessons[lesson]['topicCoverage'][topic]['tutorial']==tutorial
categories={'Discrete Mathematics','Linear Algebra','Calculus','Probability and Statistics','Combinatorics'}
assert len(coverage)==sum(len(set(l['topics'])-categories) for l in lessons.values())
for l in lessons.values():
 for topic,ref in l['topicCoverage'].items():
  local=[t for t in reversed(l['tutorials']) if topic in t['topics']]
  if local:assert ref['tutorial']==min(local,key=lambda t:len(t['topics']))['id']
if '--data-only' in sys.argv:
 print(f'Passed: {len(coverage)} topic mappings, {len(tutorials)} tutorials, {example_count} paired examples, focused topic selection and elimination arithmetic.')
 sys.exit(0)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000})
 page.route('https://fonts.googleapis.com/**',lambda route:route.abort())
 page.route('https://fonts.gstatic.com/**',lambda route:route.abort())
 page.goto('http://127.0.0.1:3000/#learn');page.wait_for_selector('#curriculumsearch')
 assert str(example_count) in page.locator('.learningnumbers').inner_text()
 page.locator('#curriculumsearch').fill('Gaussian elimination')
 assert page.locator('.curriculumlesson[href="#learn/0/0-matrices-rank"]').count()==1
 page.goto('http://127.0.0.1:3000/#learn/0/0-matrices-rank');page.wait_for_selector('.concepttutorial')
 assert page.locator('.concepttutorial').count()==len(lessons['0-matrices-rank']['tutorials'])
 assert not page.locator('#practice-details').evaluate('(el)=>el.open')
 assert page.locator('.concepttutorial').first.evaluate('(el)=>!!(el.compareDocumentPosition(document.querySelector("#supplementary-sequence"))&Node.DOCUMENT_POSITION_FOLLOWING)')
 page.locator('#lessonnotes').fill('Pivot rows give rank; a contradiction is a nonzero augmented entry with zero coefficients.')
 page.locator('.lessonhero').get_by_role('link',name='Gaussian elimination',exact=True).click()
 page.wait_for_function('Math.abs(document.querySelector("#topic-0-matrices-rank-gaussian").getBoundingClientRect().top)<100')
 assert page.evaluate('JSON.parse(localStorage.getItem("gatewise-v1")).reading["0-matrices-rank"].anchor')=='topic-0-matrices-rank-gaussian'
 assert page.locator('#worked-example-tutorial-0-matrices-rank-gaussian .mtable').count()==3
 page.reload();page.wait_for_selector('#resumereading');page.locator('#resumereading').click()
 page.wait_for_function('Math.abs(document.querySelector("#topic-0-matrices-rank-gaussian").getBoundingClientRect().top)<100')
 assert 'Pivot rows' in page.locator('#lessonnotes').inner_text()
 # Repeated topic links resolve to the most specific authored walkthrough.
 page.goto('http://127.0.0.1:3000/#learn/9/9-tcp-web');page.wait_for_selector('.lessonhero .topicchips')
 page.locator('.lessonhero .topicchips a').filter(has_text='DNS').click()
 dns_anchor=lessons['9-tcp-web']['topicCoverage']['DNS']['anchor']
 page.wait_for_selector('#'+dns_anchor)
 page.wait_for_function('(id)=>Math.abs(document.getElementById(id).getBoundingClientRect().top)<100',arg=dns_anchor)
 # Direct links work on first load, with the renderer already active.
 page.goto('http://127.0.0.1:3000/#learn/0/0-matrices-rank/topic-0-matrices-rank-independence-rank')
 page.wait_for_function('Math.abs(document.querySelector("#topic-0-matrices-rank-independence-rank")?.getBoundingClientRect().top)<100')
 page.set_viewport_size({'width':390,'height':844})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/tmp/gatewise-rank-mobile.png')
 page.set_viewport_size({'width':1440,'height':1000})
 page.locator('#topic-0-matrices-rank-gaussian').scroll_into_view_if_needed()
 page.screenshot(path='/tmp/gatewise-elimination-desktop.png')
 browser.close()
print(f'Passed: {len(coverage)} topic mappings resolve to {len(tutorials)} authored chapters; elimination arithmetic, topic links, direct links, continuous examples, notes, resume and mobile verified.')
