from core import ROOT,subjects
import mathematics,digital_architecture,programming_algorithms,theory_compilers,systems_databases,networks_aptitude
import focused,deepen,concept_checks,example_placement
import reasoning,gate_guides,worked_solutions
import tutorials.load
import math_notation
import json
subjects[2]['name']='Computer Organization & Architecture'
for l in subjects[0]['lessons']:
 l['topics'].append('Discrete Mathematics' if l['id'].split('-')[1] in ['propositions','quantifiers','sets','orders','algebraic','graphs','counting','recurrences'] else 'Linear Algebra' if l['id'] in ['0-matrices-rank','0-eigen-lu'] else 'Calculus' if l['id'] in ['0-limits-continuity','0-extrema-mvt','0-integration'] else 'Probability and Statistics')
next(l for l in subjects[0]['lessons'] if l['id']=='0-counting')['topics'].append('Combinatorics')
for s in subjects:
 for l in s['lessons']:
  l['method']=' '.join(x['body'] for x in l['tutorials']+l['sections'])
  l['minutes']=max(15,round(len((l['intuition']+' '+l['method']+' '+str(l['examples'])+' '+str([t['example'] for t in l['tutorials']])+' '+str(l['gateGuide'])).split())/40)+8)
lessons=[l for s in subjects for l in s['lessons']]
assert len({l['id'] for l in lessons})==len(lessons)
for l in lessons:
 assert len(l['sections'])>=3 and len(l['examples'])>=2 and len(l['checks'])==2,l['id']
 assert all(len(e['steps'])>=3 for e in l['examples']),l['id']
 assert len(l['gateGuide']['method'])>=3 and len(l['gateGuide']['traps'])>=2,l['id']
(ROOT/'data/syllabus.json').write_text(json.dumps(subjects,ensure_ascii=False,indent=2))
(ROOT/'data/lesson-questions.json').write_text(json.dumps([q for l in lessons for q in l['checks']],ensure_ascii=False,indent=2))
print(f'{sum(len(l["tutorials"]) for l in lessons)} detailed topic tutorials, {len(lessons)} lessons, {sum(len(l["examples"])+len(l["tutorials"]) for l in lessons)} worked examples, {sum(len(l["topics"]) for l in lessons)} named syllabus subtopics, {sum(len(l["checks"]) for l in lessons)} topic checks')

(ROOT/'data/topic-coverage.json').write_text(json.dumps([{"lesson":l['id'],"topic":topic,**{"targetLesson":ref['lesson'],"tutorial":ref['tutorial'],"anchor":ref['anchor']}} for l in lessons for topic,ref in l['topicCoverage'].items()],ensure_ascii=False,indent=2))

report=['# Detailed topic tutorials','',f'{sum(len(l["tutorials"]) for l in lessons)} concept tutorials, each followed immediately by a worked example, across {len(lessons)} lessons. Definitions and procedures precede the original supplementary explanations. Broad subject tags are navigation categories; repeated topics link to their detailed chapter.','']
for s in subjects:
 report.extend(['## '+s['name'],'','| Lesson | Teaching unit | Concepts explained |','| --- | --- | --- |'])
 for l in s['lessons']:
  for tutorial in l['tutorials']:
   report.append('| '+l['title']+' | '+tutorial['title']+' | '+', '.join(tutorial['topics'])+' |')
 report.append('')
(ROOT/'TOPIC_TUTORIALS.md').write_text('\n'.join(report))
