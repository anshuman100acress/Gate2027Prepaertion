"""Rich-text sticky-note browser checks against the source app on port 3000."""
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
        page.locator('[data-add-sticky]').click()
        page.locator('.sticky-title').fill(subject['name'] + ' reminders')
        page.locator('.sticky-card .sticky-content').fill('One useful idea for this module')
    assert len(page.evaluate('state.stickyNotes')) == len(SUBJECTS)
    page.goto(URL + '#learn/0')
    note = page.locator('.sticky-card').first
    editor = note.locator('.sticky-content')
    editor.fill('Rank equals pivot count')
    editor.press('Control+a')
    note.locator('[data-format="bold"]').click()
    assert editor.locator('b,strong').count() == 1
    note.locator('[data-format="italic"]').click()
    note.locator('[data-format="underline"]').click()
    note.locator('[data-format="backColor"]').click()
    note.locator('[data-note-color="blue"]').click()
    note_id = note.get_attribute('data-sticky-id')
    saved = page.evaluate('(id) => state.stickyNotes[id]', note_id)
    assert '<mark>' in saved['content'] and saved['color'] == 'blue'
    page.reload()
    note = page.locator('.sticky-card').first
    editor = note.locator('.sticky-content')
    assert editor.locator('b,strong').count() == 1
    assert editor.locator('i,em').count() == 1
    assert editor.locator('u').count() == 1
    assert editor.locator('mark').count() == 1
    expect(note).to_have_attribute('data-color', 'blue')

    # Lists, headings and safe links are actual browser editing actions.
    editor.fill('Bayes theorem')
    editor.press('Control+a')
    note.locator('[data-format="formatBlock"]').click()
    assert editor.locator('h2').count() == 1
    note.locator('[data-format="formatBlock"]').click()
    note.locator('[data-format="insertUnorderedList"]').click()
    assert editor.locator('ul li').count() == 1
    note.locator('[data-format="insertOrderedList"]').click()
    assert editor.locator('ol li').count() == 1
    editor.fill('Useful reference')
    editor.press('Control+a')
    note.locator('[data-format="link"]').click()
    note.locator('[aria-label="Link address"]').fill('https://example.com/formulas')
    note.locator('.sticky-link-form button[type="submit"]').click()
    expect(editor.locator('a')).to_have_attribute('href', 'https://example.com/formulas')
    page.reload()
    expect(page.locator('.sticky-card .sticky-content a')).to_have_attribute('rel', 'noopener noreferrer')

    # Rich paste keeps supported formatting and drops executable content/links.
    editor = page.locator('.sticky-card .sticky-content')
    editor.fill('')
    editor.evaluate('''el => {
      el.focus(); const data = new DataTransfer();
      data.setData('text/html', '<p><b>Keep bold</b><img src=x onerror="window.noteInjection=true"><script>window.noteInjection=true</script><a href="javascript:alert(1)">Unsafe link</a><span onclick="alert(1)" style="color:red">Safe text</span></p>');
      el.dispatchEvent(new ClipboardEvent('paste', {clipboardData:data, bubbles:true, cancelable:true}));
    }''')
    assert editor.locator('b,strong').count() >= 1, editor.inner_html()
    assert editor.locator('img,script,[onclick]').count() == 0
    assert editor.locator('a[href^="javascript:"]').count() == 0
    assert page.evaluate('window.noteInjection') is None
    # Treat server/cache HTML as untrusted too, while preserving older plain notes.
    page.evaluate('''payload => {
      state.stickyNotes[payload.id].content=payload.content;
      state.moduleNotes[0]='Earlier module note';state.notes['0-propositions']='Earlier topic note';save();
    }''', {'id': note_id, 'content': '<h2>Cloud heading</h2><b>Bold fact</b><svg onload="window.noteInjection=true"></svg><a href="data:text/html,bad">Bad link</a><p>Literal \\(x\\)</p>'})
    page.reload()
    assert page.locator('.sticky-card .sticky-content svg,.sticky-content [onload],.sticky-content a[href^="data:"],.sticky-content .katex').count() == 0
    expect(page.locator('#modulenotes')).to_have_text('Earlier module note')
    assert page.evaluate('window.noteInjection') is None

    # More than one independent sticky per module; lessons have their own board.
    page.locator('[data-add-sticky]').click()
    page.locator('.sticky-title').last.fill('Second math note')
    page.locator('.sticky-card .sticky-content').last.fill('Independent note')
    assert page.locator('.sticky-card').count() == 2
    page.goto(URL + '#learn/0/0-propositions')
    page.locator('[data-jump="lesson-sticky-notes"]').click()
    expect(page.locator('[data-add-sticky]')).to_be_focused()
    page.locator('[data-add-sticky]').click()
    page.locator('.sticky-title').fill('Contrapositive')
    page.locator('.sticky-card .sticky-content').fill('A topic-specific sticky note')
    expect(page.locator('#lessonnotes')).to_have_text('Earlier topic note')
    page.goto(URL + '#revision/notes')
    assert page.locator('.sticky-revision').count() == len(SUBJECTS) + 2
    assert page.locator('.sticky-preview svg,.sticky-preview [onload],.sticky-preview a[href^="data:"],.sticky-preview .katex').count() == 0
    with page.expect_download() as downloading:
        page.locator('#exportallnotes').click()
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'notes.md'
        downloading.value.save_as(path)
        exported = path.read_text()
        assert '**Bold fact**' in exported and 'Contrapositive' in exported
        assert 'Earlier module note' in exported and 'Earlier topic note' in exported
        assert '<svg' not in exported and 'data:text/html' not in exported

    page.goto(URL + '#learn/0')
    page.locator('.sticky-card').last.locator('[data-delete-sticky]').click()
    page.locator('.sticky-card').last.locator('[data-cancel-delete]').click()
    assert page.locator('.sticky-card').count() == 2
    page.locator('.sticky-card').last.locator('[data-delete-sticky]').click()
    page.locator('.sticky-card').last.locator('[data-confirm-delete]').click()
    assert page.locator('.sticky-card').count() == 1
    page.reload()
    assert page.locator('.sticky-card').count() == 1

    # Storage errors retain the draft and do not claim successful local saving.
    page.evaluate("() => {window.oldWrite=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError')}}")
    page.locator('.sticky-card .sticky-content').fill('Keep this unsaved draft')
    expect(page.locator('[data-sticky-card-status]')).to_contain_text('Not saved')
    page.evaluate('() => {Storage.prototype.setItem=window.oldWrite}')
    page.locator('.sticky-card .sticky-content').fill('Saved after retry')
    expect(page.locator('[data-sticky-card-status]')).to_have_text('')
    page.reload()
    expect(page.locator('.sticky-card .sticky-content')).to_have_text('Saved after retry')
    page.screenshot(path='/workspace/scratch/sticky-notes-desktop.png')
    page.set_viewport_size({'width': 390, 'height': 844})
    for route in ['learn/0', 'learn/0/0-propositions/lesson-sticky-notes', 'revision/notes']:
        page.goto(URL + '#' + route)
        page.wait_for_selector('#app h1')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), route
    page.goto(URL + '#learn/0')
    page.screenshot(path='/workspace/scratch/sticky-notes-mobile.png', full_page=True)
    assert not errors, errors
    print('Passed sticky notes: all modules, rich formatting, links, safe paste/cloud HTML, multiple notes, lesson boards, earlier notes, export, deletion, storage retry and mobile layout.')
    browser.close()
