"""Module/lesson note UI checks against the source app on port 3000."""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
SUBJECTS = json.loads((ROOT / 'data/syllabus.json').read_text())
URL = 'http://127.0.0.1:3000/'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for subject in SUBJECTS:
        page.goto(URL + '#learn/' + str(subject['id']))
        expect(page.locator('#modulenotes')).to_be_visible()
        assert page.locator('.noteseditor textarea').count() == 0
        expect(page.locator('#modulenotes')).to_have_attribute('contenteditable', 'true')
        page.locator('#modulenotes').fill(subject['name'] + '\nMy module formulas')
        expect(page.locator('#modulenotesstatus')).to_contain_text('Saved on this device')
    page.reload()
    expect(page.locator('#modulenotes')).to_have_text(SUBJECTS[-1]['name'] + '\nMy module formulas', use_inner_text=True)
    assert len(page.evaluate('state.moduleNotes')) == len(SUBJECTS)

    literal = '</textarea><img src=x onerror="window.noteInjection=true"> \\(x\\)'
    page.goto(URL + '#learn/0')
    page.locator('#modulenotes').fill(literal)
    page.reload()
    expect(page.locator('#modulenotes')).to_have_text(literal)
    assert page.locator('.noteseditor img').count() == 0
    assert page.evaluate('window.noteInjection') is None
    page.goto(URL + '#learn/0/0-propositions')
    page.locator('[data-jump="lesson-notes"]').click()
    expect(page.locator('#lessonnotes')).to_be_focused()
    page.locator('#lessonnotes').fill('The contrapositive has the same truth value.\nKeep converse separate.')
    page.reload()
    expect(page.locator('#lessonnotes')).to_contain_text('contrapositive')
    page.locator('[href="#revision/notes"]').last.click()
    expect(page.locator('#revisionfilter')).to_have_value('notes')
    assert page.locator('.modulenotecard').count() == len(SUBJECTS)
    assert page.locator('.revisioncard').count() == len(SUBJECTS) + 1
    assert page.locator('.modulenotecard img').count() == 0
    expect(page.locator('.modulenotecard').first.locator('.usernote')).to_have_text(literal)
    with page.expect_download() as downloading:
        page.locator('#exportallnotes').click()
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'notes.md'
        downloading.value.save_as(path)
        text = path.read_text()
        assert 'Module notes' in text and literal in text and 'contrapositive' in text

    page.locator('a', has_text='Edit topic notes').click()
    expect(page.locator('#lessonnotes')).to_be_focused()
    page.locator('#lessonnotes').fill('')
    page.goto(URL + '#learn/0')
    page.locator('#modulenotes').fill('')
    page.reload()
    expect(page.locator('#modulenotes')).to_have_text('')
    assert page.evaluate('state.moduleNotes[0]') is None
    assert page.evaluate('state.notes["0-propositions"]') is None

    # A failed local write must never display a successful save.
    page.evaluate("() => {window.originalStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}}")
    page.locator('#modulenotes').fill('Keep this draft if storage is full')
    expect(page.locator('#modulenotesstatus')).to_contain_text('Unable to save')
    page.evaluate('() => {Storage.prototype.setItem=window.originalStorageWrite}')
    page.locator('#modulenotes').fill('Retried after freeing space')
    expect(page.locator('#modulenotesstatus')).to_contain_text('Saved on this device')
    page.locator('[data-note-sync]').click()
    expect(page.locator('#dialog')).to_be_visible()
    expect(page.locator('#dialog')).to_contain_text('Accounts are not enabled')
    page.locator('#closeaccount').click()

    page.set_viewport_size({'width': 390, 'height': 844})
    for route in ['learn/0', 'learn/0/0-propositions/lesson-notes', 'revision/notes']:
        page.goto(URL + '#' + route)
        page.wait_for_selector('#app h1')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), route
    assert not errors, errors
    print(f'Passed notes UI: {len(SUBJECTS)} modules, topic shortcut, local persistence, literal text, revision, export, deletion, storage failure and mobile layout.')
    browser.close()
