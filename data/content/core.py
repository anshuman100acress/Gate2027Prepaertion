import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
subjects=json.loads((ROOT/'data/syllabus.json').read_text())
for s in subjects:s['lessons']=[]

def L(s,slug,title,topics,prerequisite,intuition,sections,examples,pitfalls,revision,checks):
 def chunks(text):return [x.strip() for x in text.split('||') if x.strip()]
 sections=[{'title':x.split('::',1)[0].strip(),'body':x.split('::',1)[1].strip()} for x in chunks(sections)]
 examples=[{'prompt':x.split('::',1)[0].strip(),'steps':[y.strip() for y in x.split('::',1)[1].split('~')]} for x in chunks(examples)]
 lesson={'id':f'{s}-{slug}','title':title,'topics':[x.strip() for x in topics.split(';')],'prerequisite':prerequisite,'intuition':intuition,'sections':sections,'examples':examples,'pitfalls':chunks(pitfalls),'revision':chunks(revision),'checks':[],'concept':intuition,'method':' '.join(x['body'] for x in sections),'example':examples[0]['prompt']}
 for i,(prompt,answer,hint,solution) in enumerate(checks):
  lesson['checks'].append({'id':f'check-{s}-{slug}-{i}','type':'NAT','prompt':prompt,'answer':answer,'hint':hint,'explanation':solution,'subject':s,'lesson':lesson['id'],'marks':1,'level':'Foundation' if i==0 else 'Application'})
 words=len(re.findall(r'\S+',intuition+' '+lesson['method']+' '+str(examples)))
 lesson['minutes']=max(12,round(words/65)+8)
 subjects[s]['lessons'].append(lesson)
