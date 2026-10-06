from . import maths,hardware,programming,algorithms,theory_compiler,systems,databases,networks,aptitude
from . import maths_additional,hardware_additional,programming_algorithms_additional,theory_compiler_additional,systems_databases_additional,networks_aptitude_additional
from . import registry,lessons
# Each actual topic must resolve to authored content; broad subject labels are navigation categories.
categories={'Discrete Mathematics','Linear Algebra','Calculus','Probability and Statistics','Combinatorics'}
def coverage(lesson):
 result={}
 for topic in lesson['topics']:
  if topic in categories:continue
  # Prefer a focused walkthrough; newer units refine equally narrow older chapters.
  matching=[t for t in reversed(lesson['tutorials']) if topic in t['topics']]
  local=min(matching,key=lambda t:len(t['topics'])) if matching else None
  ref={'lesson':lesson['id'],'tutorial':local['id']} if local else registry.get(topic)
  assert ref is not None,f"Unexplained topic: {lesson['id']} / {topic}"
  result[topic]={**ref,'anchor':'topic-'+ref['tutorial']}
 return result
for l in lessons.values():
 assert l.get('tutorials'),f"Lesson has no concept tutorials: {l['id']}"
 # Add newly explicit concepts such as elimination and decomposition to topic search/navigation.
 for tutorial in l['tutorials']:
  for topic in tutorial['topics']:
   if topic not in l['topics']:l['topics'].append(topic)
 for t in l['tutorials']:
  assert len(t['body'].split())>=110,(l['id'],t['id'],'Short explanation')
 l['topicCoverage']=coverage(l)
