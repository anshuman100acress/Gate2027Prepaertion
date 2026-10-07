"""Attach reviewed topic depth packs only to the exact teaching units they extend."""
from . import maths, hardware, programming_algorithms, theory_compiler, systems_databases, networks_aptitude
from . import packs
from tutorials import lessons

required = {
    ref['tutorial'] + '::' + topic
    for lesson in lessons.values()
    for topic, ref in lesson['topicCoverage'].items()
}
assert set(packs) == required, {
    'missing': sorted(required - set(packs)),
    'unexpected': sorted(set(packs) - required),
}
units = {unit['id']: unit for lesson in lessons.values() for unit in lesson['tutorials']}
for key, pack in packs.items():
    tutorial, topic = key.split('::', 1)
    unit = units[tutorial]
    assert topic in unit['topics'], key
    pack['id'] = 'topic-study-' + tutorial + '-' + str(unit['topics'].index(topic) + 1)
    unit.setdefault('depth', []).append(pack)
for lesson in lessons.values():
    for topic, ref in lesson['topicCoverage'].items():
        ref['studyAnchor'] = packs[ref['tutorial'] + '::' + topic]['id']
