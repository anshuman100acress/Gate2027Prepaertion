"""Real browser checks for the protected mobile build, including cold offline reloads."""
import os
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('TEST_SITE_URL', 'http://127.0.0.1:3013/').rstrip('/') + '/'
with sync_playwright() as p:
    launch = {'headless': True, 'executable_path': '/usr/bin/chromium', 'args': ['--no-sandbox']}
    if URL.startswith('https://') and os.environ.get('HTTPS_PROXY'):
        launch['proxy'] = {'server': os.environ['HTTPS_PROXY']}
    browser = p.chromium.launch(**launch)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL + '#dashboard')
    page.wait_for_selector('.mobile-continue')
    page.wait_for_function('navigator.serviceWorker.controller !== null', timeout=20000)
    expect(page.locator('#mobile-nav')).to_be_visible()
    expect(page.locator('body>aside')).not_to_be_visible()
    expect(page.locator('#mobile-nav [data-mobile-nav="dashboard"]')).to_have_attribute('aria-current', 'page')
    assert page.locator('#mobile-nav a, #mobile-nav button').count() == 5
    assert page.evaluate('bank.length') == 10

    def fits():
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), page.url
        assert page.locator('#mobile-nav').bounding_box()['y'] + page.locator('#mobile-nav').bounding_box()['height'] <= 846

    fits()
    page.screenshot(path='/tmp/gatewise-mobile-home.png')
    manifest = page.evaluate('fetch("manifest.webmanifest").then(r => r.json())')
    assert manifest['display'] == 'standalone' and manifest['scope'] == '/'

    # A menu is a bottom sheet; browser Back dismisses it without changing the screen.
    page.locator('#mobile-more-open').click()
    expect(page.locator('#mobile-more')).to_be_visible()
    assert page.locator('#mobile-more').bounding_box()['x'] == 0
    page.go_back()
    expect(page.locator('#mobile-more')).not_to_be_visible()
    assert page.url.endswith('#dashboard')
    page.locator('#mobile-more-open').click()
    page.locator('#mobile-more a[href="#pyqs"]').click()
    page.wait_for_selector('#pyq-all')
    assert page.url.endswith('#pyqs')
    expect(page.locator('#mobile-more')).not_to_be_visible()
    page.go_back()
    page.wait_for_selector('.mobile-continue')
    assert page.url.endswith('#dashboard')
    page.locator('#mobile-more-open').click()
    page.locator('#mobile-preferences').click()
    expect(page.locator('#name')).to_be_visible()
    page.locator('#name').fill('Aspirant')
    page.locator('#saveprofile').click()
    expect(page.locator('.mobile-greeting h1')).to_contain_text('Aspirant')

    # Phone library starts with subjects, and the preview shortcut shows exactly three lessons.
    page.locator('#mobile-nav [data-mobile-nav="learn"]').click()
    page.wait_for_selector('.mobile-library-subject')
    assert page.locator('.mobile-library-subject').count() == 11
    fits()
    page.screenshot(path='/tmp/gatewise-mobile-library.png')
    page.locator('#mobile-free-previews').click()
    assert page.locator('.mobile-search-lesson').count() == 3
    page.locator('#curriculumsearch').fill('logic')
    expect(page.locator('.mobile-search-lesson')).to_have_count(1)
    page.locator('.mobile-search-lesson').click()
    page.wait_for_selector('#lessonarticle')
    assert not page.locator('.readerpath').evaluate('(element) => element.open')
    assert not page.locator('.lessoncontents').evaluate('(element) => element.open')
    page.locator('.readerpath summary').click()
    expect(page.locator('.readerlesson.selected')).to_be_visible()
    page.locator('.readerpath summary').click()
    page.locator('#mobile-back').click()
    page.wait_for_selector('.subjectroadmap, .roadmaplesson')
    page.locator('#mobile-back').click()
    page.wait_for_selector('.mobile-library-subject')

    # Reading has a sticky action bar and accessible, full-size note inputs.
    page.goto(URL + '#learn/0/0-propositions')
    page.wait_for_selector('#lessonarticle')
    fits()
    page.screenshot(path='/tmp/gatewise-mobile-lesson.png')
    page.locator('.lesson-tools [data-jump="lesson-practice"]').click()
    assert page.locator('#practice-details').evaluate('(element) => element.open')
    page.locator('.lesson-tools [data-jump="lesson-notes"]').click()
    page.locator('#lessonnotes').fill('My mobile offline note: implication is false only for T → F.')
    assert page.locator('#lessonnotes').evaluate('(element) => parseFloat(getComputedStyle(element).fontSize)') >= 16
    page.locator('#lessonnotes').blur()
    assert 'mobile offline note' in page.evaluate('state.notes["0-propositions"]')
    page.screenshot(path='/tmp/gatewise-mobile-notes.png')

    # Collapsed practice filters open when requested and stay open while changing selections.
    page.locator('#mobile-nav [data-mobile-nav="practice"]').click()
    page.wait_for_selector('#check')
    assert not page.locator('.practicefilters').evaluate('(element) => element.open')
    page.locator('.practicefilters summary').click()
    page.locator('#sourcefilter').select_option('foundation')
    assert page.locator('.practicefilters').evaluate('(element) => element.open')
    page.locator('#complexityfilter').select_option('1')
    assert page.locator('.practicefilters').evaluate('(element) => element.open')
    page.locator('.practicefilters summary').click()
    fits()
    for option in page.locator('.option').all():
        assert option.bounding_box()['height'] >= 44
    page.locator('#choices input').first.check()
    page.locator('#check').click()
    expect(page.locator('#feedback')).not_to_be_empty()
    page.locator('#next').click()
    expect(page.locator('#check')).to_be_enabled()
    page.screenshot(path='/tmp/gatewise-mobile-practice.png')

    # Phone account and focus buttons reach the same existing workspace tools.
    page.locator('#mobile-account').click()
    expect(page.locator('#accountemail')).to_be_visible()
    page.keyboard.press('Escape')
    page.locator('#mobile-timer').click()
    page.locator('#focusgoal').fill('Review one logic example')
    page.locator('#focusform button[type="submit"]').click()
    page.locator('[data-closefocus]').click()
    expect(page.locator('#focusdock')).to_be_visible()
    dock = page.locator('#focusdock').bounding_box()
    navigation = page.locator('#mobile-nav').bounding_box()
    assert dock['y'] + dock['height'] < navigation['y']
    page.locator('#focusdockopen').click()
    page.locator('#focusfinish').click()
    page.locator('[data-closefocus]').click()

    # Installation help works even on browsers that have no install prompt.
    page.locator('#mobile-nav [data-mobile-nav="dashboard"]').click()
    page.locator('.mobile-home [data-mobile-install]').click()
    expect(page.locator('#dialog')).to_contain_text('home screen')
    page.locator('#install-done').click()
    page.evaluate('''() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = async () => { window.installPromptUsed = true; };
      event.userChoice = Promise.resolve({ outcome: 'dismissed' });
      dispatchEvent(event);
    }''')
    page.locator('.mobile-home [data-mobile-install]').click()
    page.wait_for_function('window.installPromptUsed === true')

    # An offline cold reload uses the public cache and retains personal work, with paid gates intact.
    cache_urls = page.evaluate('''async () => {
      const names = (await caches.keys()).filter(key => key.startsWith('gatewise-public-'));
      return (await Promise.all(names.map(async key => (await (await caches.open(key)).keys()).map(request => request.url)))).flat();
    }''')
    assert cache_urls and not any('/api/' in url or '/auth/' in url or '/rest/' in url or '.pdf' in url or 'config.js' in url for url in cache_urls)
    context.set_offline(True)
    page.reload()
    page.wait_for_selector('.mobile-continue')
    expect(page.locator('#mobile-connection')).to_be_visible()
    assert page.evaluate('bank.length') == 10
    assert page.evaluate('subjects.flatMap(s => s.lessons).filter(l => !l.locked).length') == 3
    page.locator('#mobile-nav [data-mobile-nav="learn"]').click()
    page.locator('#mobile-free-previews').click()
    page.locator('.mobile-search-lesson').first.click()
    page.wait_for_selector('#lessonarticle')
    expect(page.locator('#lessonnotes')).to_contain_text('mobile offline note')
    page.goto(URL + '#learn/0/0-quantifiers')
    page.wait_for_selector('.course-lock')
    assert page.locator('.workedexample').count() == 0
    page.goto(URL + '#mocks')
    page.wait_for_selector('.course-lock')
    page.goto(URL + '#premium/recall')
    page.wait_for_selector('.course-lock')
    page.goto(URL + '#practice')
    page.wait_for_selector('#check')
    fits()
    page.screenshot(path='/tmp/gatewise-mobile-offline.png')
    context.set_offline(False)
    expect(page.locator('#mobile-connection')).not_to_be_visible(timeout=20000)

    # Narrow phones, larger phones and landscape stay usable; desktop retains its workspace.
    for width, height in [(320, 720), (375, 812), (430, 932), (740, 390), (844, 390)]:
        page.set_viewport_size({'width': width, 'height': height})
        for route, selector in [('#dashboard','.mobile-continue'),('#learn','.mobile-library-subject'),('#pricing','.course-plans'),('#revision','#revisionlist'),('#practice','#check')]:
            page.goto(URL + route)
            page.wait_for_selector(selector)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, route)
    desktop = browser.new_page(viewport={'width': 1440, 'height': 1000})
    desktop.on('pageerror', lambda error: errors.append(str(error)))
    desktop.goto(URL + '#dashboard')
    desktop.wait_for_selector('.hero')
    expect(desktop.locator('body>aside')).to_be_visible()
    expect(desktop.locator('#mobile-nav')).not_to_be_visible()
    assert desktop.locator('.mobile-home').count() == 0
    assert not errors, errors
    browser.close()
    print('Mobile UI passed: native shell, touch controls, subjects/previews, sheet Back navigation, notes, timer, install flow, offline cold reload, premium gates and 320–844px layouts; desktop preserved.')
