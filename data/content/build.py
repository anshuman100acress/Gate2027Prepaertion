from core import ROOT,subjects
import mathematics,digital_architecture,programming_algorithms,theory_compilers,systems_databases,networks_aptitude
import focused,deepen,concept_checks,example_placement
import reasoning,gate_guides,worked_solutions
import tutorials.load
import topic_depth.load
import math_notation
import json
subjects[2]['name']='Computer Organization & Architecture'
for l in subjects[0]['lessons']:
 l['topics'].append('Discrete Mathematics' if l['id'].split('-')[1] in ['propositions','quantifiers','sets','orders','algebraic','graphs','counting','recurrences'] else 'Linear Algebra' if l['id'] in ['0-matrices-rank','0-eigen-lu'] else 'Calculus' if l['id'] in ['0-limits-continuity','0-extrema-mvt','0-integration'] else 'Probability and Statistics')
next(l for l in subjects[0]['lessons'] if l['id']=='0-counting')['topics'].append('Combinatorics')
for s in subjects:
 for l in s['lessons']:
  depth=[pack for tutorial in l['tutorials'] for pack in tutorial.get('depth',[])]
  l['method']=' '.join(x['body'] for x in l['tutorials']+l['sections']+depth)
  l['minutes']=max(15,round(len((l['intuition']+' '+l['method']+' '+str(l['examples'])+' '+str([t['example'] for t in l['tutorials']])+' '+str([p['examples'] for p in depth])+' '+str(l['gateGuide'])).split())/40)+8)
lessons=[l for s in subjects for l in s['lessons']]
def example_count(lesson):
 return len(lesson['examples'])+sum(1+sum(len(pack['examples']) for pack in tutorial.get('depth',[])) for tutorial in lesson['tutorials'])
assert len({l['id'] for l in lessons})==len(lessons)
for l in lessons:
 assert len(l['sections'])>=3 and len(l['examples'])>=2 and len(l['checks'])==2,l['id']
 assert all(len(e['steps'])>=3 for e in l['examples']),l['id']
 assert len(l['gateGuide']['method'])>=3 and len(l['gateGuide']['traps'])>=2,l['id']
(ROOT/'data/syllabus.json').write_text(json.dumps(subjects,ensure_ascii=False,indent=2))
(ROOT/'data/lesson-questions.json').write_text(json.dumps([q for l in lessons for q in l['checks']],ensure_ascii=False,indent=2))
print(f'{sum(len(l["tutorials"]) for l in lessons)} detailed topic tutorials, {len(lessons)} lessons, {sum(example_count(l) for l in lessons)} worked examples, {sum(len(l["topicCoverage"]) for l in lessons)} topic mappings, {sum(len(l["checks"]) for l in lessons)} topic checks')

(ROOT/'data/topic-coverage.json').write_text(json.dumps([{"lesson":l['id'],"topic":topic,**{"targetLesson":ref['lesson'],"tutorial":ref['tutorial'],"anchor":ref['anchor'],"studyAnchor":ref['studyAnchor'],"exampleTypes":["fundamental","application","trap"]}} for l in lessons for topic,ref in l['topicCoverage'].items()],ensure_ascii=False,indent=2))

report=['# Detailed topic tutorials','',f'{sum(len(l["tutorials"]) for l in lessons)} concept tutorials and {sum(example_count(l) for l in lessons)} worked examples across {len(lessons)} lessons. Every named topic has deeper explanation and three new example types: basic walkthrough, exam-style application and trap/edge case. Original examples and reading anchors are retained. Broad subject tags are navigation categories; repeated topics link to their detailed chapter.','']
for s in subjects:
 report.extend(['## '+s['name'],'','| Lesson | Teaching unit | Concepts explained | New topic examples |','| --- | --- | --- | --- |'])
 for l in s['lessons']:
  for tutorial in l['tutorials']:
   report.append('| '+l['title']+' | '+tutorial['title']+' | '+', '.join(tutorial['topics'])+' | '+str(sum(len(pack['examples']) for pack in tutorial.get('depth',[])))+' |')
 report.append('')
(ROOT/'TOPIC_TUTORIALS.md').write_text('\n'.join(report))
