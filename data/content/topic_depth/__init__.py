"""Focused topic explanations and three different kinds of worked examples."""
packs = {}
KINDS = ('fundamental', 'application', 'trap')

def E(kind, prompt, steps, answer, verification):
    parsed = []
    for item in steps.split('~'):
        title, equation, explanation = item.strip().split('::', 2)
        parsed.append({'title': title.strip(), 'equation': equation.strip(), 'explanation': explanation.strip()})
    assert kind in KINDS and len(parsed) >= 3, (kind, prompt)
    assert all(step['title'] and step['explanation'] for step in parsed), prompt
    assert prompt and answer and verification, prompt
    return {'kind': kind, 'prompt': prompt, 'strategy': ' → '.join(step['title'] for step in parsed),
            'steps': parsed, 'answer': answer, 'verification': verification}

def P(tutorial, topic, explanation, *examples):
    key = tutorial + '::' + topic
    assert key not in packs, key
    assert len(explanation.split()) >= 80, (key, 'Expand the topic explanation')
    assert tuple(example['kind'] for example in examples) == KINDS, key
    assert len({example['prompt'] for example in examples}) == 3, key
    packs[key] = {'topic': topic, 'body': explanation.strip(), 'examples': list(examples)}
