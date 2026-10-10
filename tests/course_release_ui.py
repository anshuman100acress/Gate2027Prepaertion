"""Read-only checks against the protected preview build or deployed website."""
import os
from playwright.sync_api import sync_playwright, expect

url = os.environ.get('TEST_SITE_URL', 'http://127.0.0.1:3001/').rstrip('/') + '/'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url + '#pricing')
    page.wait_for_selector('.course-plans')
    expect(page.locator('.course-price').last).to_contain_text('₹299')
    expect(page.locator('.course-offer')).to_contain_text('31 October 2026')
    expect(page.locator('.course-offer')).to_contain_text('11:59 pm')
    expect(page.locator('.course-paid')).to_contain_text('486 scored questions')
    assert page.evaluate('GatewiseCourse.protected')
    assert page.evaluate('bank.length') == 10
    assert page.evaluate('subjects.flatMap(s=>s.lessons).filter(l=>!l.locked).length') == 3
    page.goto(url + '#pyqs/2018_CS')
    page.wait_for_selector('#pyq-all')
    assert page.locator('[data-pyq-paper]').count() == 0
    expect(page.locator('.pyq-intro')).to_contain_text('104 PYQ MCQs')
    page.locator('#pyq-all').click()
    page.wait_for_selector('#check')
    expect(page.locator('.pyq-source')).to_contain_text('GATE 2026')
    expect(page.locator('.complexity-badge')).to_contain_text('Level 2')
    page.locator('input[value="2"]').check()
    page.locator('#check').click()
    expect(page.locator('#feedback')).to_contain_text('63 games')
    assert page.evaluate('bank.filter(q=>q.source).length') == 1
    page.locator('#app a[href="#pyqs"]').click()
    page.wait_for_selector('#pyq-all')
    assert page.locator('[data-pyq-paper]').count() == 1
    page.goto(url + '#learn/0/0-quantifiers')
    page.wait_for_selector('.course-lock')
    assert page.locator('.workedexample').count() == 0
    page.goto(url + '#mocks')
    page.wait_for_selector('.course-lock')
    page.goto(url + '#premium/recall')
    page.wait_for_selector('.course-lock')
    page.goto(url + '#pricing')
    page.wait_for_selector('.course-plans')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path='/tmp/gatewise-release-pricing-mobile.png', full_page=True)
    assert not errors, errors
    browser.close()
    print('Protected release UI passed: ₹299 deadline, 3 previews, exactly 1 free PYQ, 104 locked MCQs, locked lessons/mocks/tools, solution checking and mobile layout.')
