from core import ROOT,subjects
import mathematics,digital_architecture,programming_algorithms,theory_compilers,systems_databases,networks_aptitude
import focused,deepen,concept_checks
import json
subjects[2]['name']='Computer Organization & Architecture'
for l in subjects[0]['lessons']:
 l['topics'].append('Discrete Mathematics' if l['id'].split('-')[1] in ['propositions','quantifiers','sets','orders','algebraic','graphs','counting','recurrences'] else 'Linear Algebra' if l['id'] in ['0-matrices-rank','0-eigen-lu'] else 'Calculus' if l['id'] in ['0-limits-continuity','0-extrema-mvt','0-integration'] else 'Probability and Statistics')
next(l for l in subjects[0]['lessons'] if l['id']=='0-counting')['topics'].append('Combinatorics')
for s in subjects:
 for l in s['lessons']:
  l['method']=' '.join(x['body'] for x in l['sections'])
  l['minutes']=max(15,round(len((l['intuition']+' '+l['method']+' '+str(l['examples'])).split())/40)+8)
lessons=[l for s in subjects for l in s['lessons']]
assert len({l['id'] for l in lessons})==len(lessons)
for l in lessons:
 assert len(l['sections'])>=3 and len(l['examples'])>=2 and len(l['checks'])==2,l['id']
 assert all(len(e['steps'])>=3 for e in l['examples']),l['id']
(ROOT/'data/syllabus.json').write_text(json.dumps(subjects,ensure_ascii=False,indent=2))
(ROOT/'data/lesson-questions.json').write_text(json.dumps([q for l in lessons for q in l['checks']],ensure_ascii=False,indent=2))
print(f'{len(lessons)} lessons, {sum(len(l["examples"]) for l in lessons)} worked examples, {sum(len(l["topics"]) for l in lessons)} named syllabus subtopics, {sum(len(l["checks"]) for l in lessons)} topic checks')
