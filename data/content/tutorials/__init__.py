"""Authored concept tutorials, each paired with a worked solution."""
from core import subjects
lessons={l['id']:l for s in subjects for l in s['lessons']}
registry={}
def T(lesson,slug,topics,title,body,prompt,steps,answer,verification):
 topiclist=[t.strip() for t in topics.split(';')]
 parsed=[]
 for item in steps.split('~'):
  name,equation,explanation=item.strip().split('::',2)
  parsed.append({'title':name.strip(),'equation':equation.strip(),'explanation':explanation.strip()})
 assert len(parsed)>=3,(lesson,slug)
 tutorial={'id':lesson+'-'+slug,'title':title,'topics':topiclist,'body':body.strip(),'example':{'prompt':prompt,'strategy':' → '.join(step['title'] for step in parsed),'steps':parsed,'answer':answer,'verification':verification}}
 lessons[lesson].setdefault('tutorials',[]).append(tutorial)
 for topic in topiclist:
  previous=registry.get(topic)
  previous_unit=next((t for t in lessons[previous['lesson']]['tutorials'] if t['id']==previous['tutorial']),None) if previous else None
  if not previous_unit or len(topiclist)<=len(previous_unit['topics']):
   registry[topic]={'lesson':lesson,'tutorial':tutorial['id']}
