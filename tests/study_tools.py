"""Study timer UX checks with Playwright's clock; no real-time waiting needed."""
import os
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, expect

URL = 'http://localhost:3000/'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
    page.route('https://fonts.gstatic.com/**', lambda route: route.abort())
    initial = datetime(2026, 10, 4, 8, tzinfo=timezone.utc)
    page.clock.install(time=initial)
    page.clock.pause_at(initial)
    page.goto(URL)
    page.wait_for_function('appReady && !document.querySelector("#studytimer").disabled')
    expect(page.locator('[data-study-today]')).to_have_text('0s')
    page.goto(URL + '#learn/0/0-matrices-rank')
    page.wait_for_selector('#lessonarticle')
    page.locator('[data-openfocus]').click()
    expect(page.locator('#focustopic')).to_have_value('0-matrices-rank')
    page.locator('#focusgoal').fill('Find rank from pivot positions')
    page.locator('#focusform button[type=submit]').click()
    page.locator('button[data-closefocus]').click()
    expect(page.locator('#focusdock')).to_be_visible()
    page.clock.fast_forward(65000)
    expect(page.locator('#focusdock [data-focus-clock]')).to_have_text('00:01:05')
    page.locator('#focusquickpause').click()
    page.clock.fast_forward(60000)
    expect(page.locator('#focusdock [data-focus-clock]')).to_have_text('00:01:05')
    page.locator('[data-nav="practice"]').click()
    expect(page.locator('#focusdock [data-focus-clock]')).to_have_text('00:01:05')
    page.locator('#focusquickpause').click()
    page.clock.fast_forward(35000)
    page.reload()
    page.wait_for_function('appReady')
    expect(page.locator('#focusdock [data-focus-clock]')).to_have_text('00:01:40')
    page.locator('#studytimer').click()
    page.locator('#focusfinish').click()
    assert page.evaluate('state.focusSessions[0].durationMs') == 100000
    assert page.evaluate('state.completed') == [], 'timer must not mark lessons read'
    assert page.evaluate('state.understood') == [], 'timer must not imply understanding'
    page.locator('#focusrecall').fill('Rank counts independent pivot columns, not all nonzero rows.')
    page.locator('#focusmistake').fill('<img src=x onerror="window.bad=true"> literal note')
    page.locator('#focusnextaction').fill('Redo one elimination problem')
    page.locator('#focusreflection button[type=submit]').click()
    page.locator('#focusreview').click()
    assert page.evaluate('state.reviewDates["0-matrices-rank"]')
    page.locator('button[data-closefocus]').click()
    page.locator('[data-nav="study"]').click()
    expect(page.locator('[data-study-today]')).to_have_text('1m 40s')
    expect(page.locator('[data-study-total]')).to_have_text('1m 40s')
    expect(page.locator('.studyhistoryrow')).to_have_count(1)
    expect(page.locator('.studyhistoryrow')).to_contain_text('Redo one elimination problem')
    page.locator('[data-weekday]').last.click()
    expect(page.locator('.studyhistoryrow')).to_have_count(1)
    page.locator('#studyshowall').click()
    page.locator('[data-reflection]').click()
    assert page.locator('#focusmistake').input_value().startswith('<img src=x')
    assert page.evaluate('window.bad') is None
    page.locator('button[data-closefocus]').click()
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path='/tmp/gatewise-study-tools-desktop.png', full_page=True)

    # An overdue Pomodoro caps focus at 25m, skips elapsed break, and waits for the user.
    page.locator('#studytimer').click()
    page.select_option('#focusmode', '25')
    page.locator('#focusform button[type=submit]').click()
    page.clock.fast_forward(40 * 60000)
    expect(page.locator('[data-focus-status]').first).to_contain_text('Break complete')
    assert page.evaluate('state.focusSessions.length') == 2
    expect(page.locator('[data-study-count]')).to_have_text('2')
    expect(page.locator('.studyhistoryrow')).to_have_count(2)
    assert page.evaluate('state.focusSessions[0].durationMs') == 25 * 60000
    assert page.evaluate('GatewiseStudy.timer.phase') == 'break'
    assert page.evaluate('GatewiseStudy.timer.status') == 'ready'
    page.locator('#focusnext').click()
    page.clock.fast_forward(2 * 60000)
    page.locator('#focusfinish').click()
    assert page.evaluate('state.focusSessions.length') == 3
    page.locator('button[data-closefocus]').click()
    page.reload()
    page.wait_for_function('appReady')
    expect(page.locator('[data-study-total]')).to_have_text('28m 40s')
    assert page.evaluate('GatewiseStudy.timer') is None

    # Multiple tabs share the running timer and cannot double-count a finished session.
    page.locator('#studytimer').click()
    page.select_option('#focusmode', 'stopwatch')
    page.locator('#focusform button[type=submit]').click()
    page.clock.fast_forward(5000)
    tab = context.new_page()
    tab.on('pageerror', lambda error: errors.append(str(error)))
    tab_time = datetime.fromtimestamp(page.evaluate('Date.now()') / 1000, timezone.utc)
    tab.clock.install(time=tab_time)
    tab.clock.pause_at(tab_time)
    tab.goto(URL)
    tab.wait_for_function('appReady')
    expect(tab.locator('#focusdock [data-focus-clock]')).to_have_text('00:00:05')
    tab.locator('#studytimer').click()
    tab.locator('#focusfinish').click()
    page.wait_for_function('GatewiseStudy.timer === null')
    page.reload()
    page.wait_for_function('appReady')
    assert page.evaluate('state.focusSessions.length') == 4
    tab.close()

    # Mobile controls, the chart, modal and dock all remain inside the screen.
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    page.locator('#studytimer').click()
    page.screenshot(path='/tmp/gatewise-study-timer-mobile.png')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    page.locator('button[data-closefocus]').click()
    page.set_viewport_size({'width': 320, 'height': 700})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'header/weekly chart overflow at 320px'
    assert not errors, errors
    browser.close()
    print('Study tools checks passed: lesson context, stopwatch, pause, navigation/reload, goals/reflections, review scheduling, Pomodoro, totals, tabs and mobile.')
