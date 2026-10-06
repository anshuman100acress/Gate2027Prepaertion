"""Exercise the actual bundled Supabase SDK against simulated HTTP responses.

Run the source app on port 3000. No Supabase account or email is created by this test.
"""
import base64
import copy
import json
import os
import time
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

URL = 'http://localhost:3000/'
HOST = 'https://gatewise-test.supabase.co'
USERS = {'a@example.test': '11111111-1111-4111-8111-111111111111', 'b@example.test': '22222222-2222-4222-8222-222222222222'}
records, tokens, requests, errors = {}, {}, [], []
fail_saves = False
conflict_once = False
concurrent_uid = None


def token_for(email):
    uid = USERS[email]
    payload = {'sub': uid, 'email': email, 'role': 'authenticated', 'aud': 'authenticated', 'iat': int(time.time()), 'exp': int(time.time()) + 3600}
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    token = encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode(payload) + '.test-signature'
    tokens[token] = uid
    return {'access_token': token, 'refresh_token': 'refresh-' + uid, 'expires_in': 3600, 'expires_at': payload['exp'], 'token_type': 'bearer', 'user': {'id': uid, 'email': email, 'aud': 'authenticated', 'role': 'authenticated', 'app_metadata': {'provider': 'email', 'providers': ['email']}, 'user_metadata': {}, 'created_at': '2026-10-04T00:00:00Z', 'identities': []}}


def handle(route):
    global conflict_once
    request = route.request
    parsed = urlparse(request.url)
    path = parsed.path
    requests.append((path, request.method))
    def respond(value=None, status=200):
        route.fulfill(status=status, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body='' if status == 204 else json.dumps(value))
    if request.method == 'OPTIONS':
        route.fulfill(status=204, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'})
        return
    data = request.post_data_json if request.post_data else {}
    if path == '/auth/v1/token':
        if parse_qs(parsed.query).get('grant_type') == ['pkce']:
            assert data.get('auth_code') == 'recovery-code' and data.get('code_verifier')
            respond(token_for('a@example.test'))
            return
        if data.get('email') not in USERS or data.get('password') != 'password123':
            respond({'message': 'Invalid login credentials', 'error_code': 'invalid_credentials'}, 400)
        else:
            respond(token_for(data['email']))
        return
    if path == '/auth/v1/signup':
        respond({'id': USERS['a@example.test'], 'email': data['email'], 'identities': []})
        return
    if path == '/auth/v1/recover':
        respond({})
        return
    if path == '/auth/v1/logout':
        respond(status=204)
        return
    uid = tokens.get(request.headers.get('authorization', '').replace('Bearer ', ''))
    if not uid:
        respond({'message': 'Unauthorized'}, 401)
        return
    if path == '/auth/v1/user':
        email = next(email for email, value in USERS.items() if value == uid)
        respond(token_for(email)['user'])
    elif path == '/rest/v1/study_progress':
        assert parse_qs(parsed.query)['user_id'] == ['eq.' + uid], 'Client requested another user record'
        respond([records[uid]] if uid in records else [])
    elif path == '/rest/v1/rpc/save_study_progress':
        assert 'user_id' not in data, 'RPC must infer the owner from auth'
        assert 'access_token' not in json.dumps(data['p_data']), 'Auth token leaked into study progress'
        if fail_saves:
            respond({'message': 'Simulated failure'}, 503)
            return
        if conflict_once and uid == concurrent_uid:
            conflict_once = False
            previous = records[uid]
            updated = copy.deepcopy(previous['data'])
            updated['progress']['notes']['other-device'] = 'Concurrent server note'
            records[uid] = {'data': updated, 'revision': previous['revision'] + 1}
        expected_revision = records.get(uid, {}).get('revision', 0)
        if data['p_expected_revision'] != expected_revision:
            respond(-1)
        else:
            records[uid] = {'data': data['p_data'], 'revision': expected_revision + 1}
            respond(expected_revision + 1)
    else:
        raise AssertionError('Unexpected Supabase request: ' + request.url)


def context(browser):
    ctx = browser.new_context()
    ctx.route('**/cloud-config.js', lambda route: route.fulfill(content_type='text/javascript', body=f'window.GATEWISE_CLOUD={{url:{json.dumps(HOST)},publishableKey:"sb_publishable_test"}};'))
    ctx.route(HOST + '/**', handle)
    page = ctx.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    return ctx, page


def open_app(page):
    page.goto(URL)
    expect(page.locator('#app h1')).to_contain_text('Your next chapter')


def signin(page, email):
    page.locator('#account').click()
    page.locator('#accountemail').fill(email)
    page.locator('#accountpassword').fill('password123')
    page.locator('#accountsubmit').click()
    expect(page.locator('#account')).to_have_text('My account')
    expect(page.locator('#app h1')).to_contain_text('Your next chapter')
    page.wait_for_function('!GatewiseProgress.locked && GatewiseCloud.user !== null')


def change(page, expression):
    page.evaluate('() => {' + expression + '; save(); }')


def sync(page):
    assert page.evaluate('() => GatewiseCloud.syncNow()'), 'Sync failed'
    page.wait_for_function('!GatewiseProgress.pending()')


def add_sticky(page, title, content):
    page.locator('[data-add-sticky]').click()
    note = page.locator('.sticky-card').last
    note.locator('.sticky-title').fill(title)
    note.locator('.sticky-content').fill(content)
    return note.get_attribute('data-sticky-id')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True)
    ca, a = context(browser)
    cb, b = context(browser)
    open_app(a)
    change(a, "state.notes['guest-topic']='Guest only'; state.moduleNotes['0']='Guest module';state.stickyNotes['guest-sticky']={scope:'module',moduleId:0,title:'Guest sticky',content:'<b>Guest formula</b>',color:'yellow'}; state.completed=['0-propositions']")
    signin(a, 'a@example.test')
    assert a.evaluate('state.notes["guest-topic"]') is None, 'Guest data leaked into account without import'
    assert a.evaluate('state.moduleNotes') == {}, 'Guest module notes leaked into account without import'
    assert a.evaluate('state.stickyNotes') == {}, 'Guest sticky notes leaked into account without import'
    change(a, "state.notes['matrix']='Rank equals pivot count';state.completed=['0-propositions'];state.bookmarks=['0-propositions'];state.reviewDates['0-propositions']='2026-10-06';state.hours=3;state.attempts.push({eventId:crypto.randomUUID(),qid:'test',correct:true,subject:0,date:today()})")
    sync(a)
    open_app(b)
    signin(b, 'a@example.test')
    assert b.evaluate('state.notes.matrix') == 'Rank equals pivot count'
    assert b.evaluate('state.completed') == ['0-propositions']
    assert b.evaluate('state.hours') == 3

    # Real note editors autosave, show sync state and update another device's open editor.
    a.goto(URL + '#learn/0')
    expect(a.locator('#modulenotes')).to_be_visible()
    a.locator('#modulenotes').fill('Module formulas from device A')
    a.wait_for_function('!GatewiseProgress.pending()')
    expect(a.locator('#modulenotesstatus')).to_have_text('Up to date across devices')
    assert records[USERS['a@example.test']]['data']['progress']['moduleNotes']['0'] == 'Module formulas from device A'
    b.goto(URL + '#learn/0')
    b.locator('[data-note-sync]').click()
    expect(b.locator('#modulenotes')).to_have_text('Module formulas from device A')
    b.locator('#modulenotes').focus()
    a.locator('#modulenotes').fill('Updated formulas from device A')
    sync(a)
    sync(b)
    expect(b.locator('#modulenotes')).to_have_text('Module formulas from device A')
    expect(b.locator('#modulenotesstatus')).to_contain_text('Updated on another device')
    b.locator('#app h1').click()
    expect(b.locator('#modulenotes')).to_have_text('Updated formulas from device A')

    # Independent module notes merge; clearing a note also reaches the other device.
    b.goto(URL + '#learn/1')
    b.locator('#modulenotes').fill('Digital logic from device B')
    sync(b)
    sync(a)
    assert a.evaluate('state.moduleNotes[1]') == 'Digital logic from device B'
    a.locator('#modulenotes').fill('')
    sync(a)
    sync(b)
    assert b.evaluate('state.moduleNotes[0]') is None

    # Topic notes use the same editor and refresh without rebuilding the lesson.
    a.goto(URL + '#learn/0/0-propositions')
    a.locator('[data-jump="lesson-notes"]').click()
    expect(a.locator('#lessonnotes')).to_be_focused()
    a.locator('#lessonnotes').fill('Contrapositive topic note from A')
    a.locator('#lessonnotes').press('Control+a')
    a.locator('.noteseditor [data-format="bold"]').click()
    sync(a)
    b.goto(URL + '#learn/0/0-propositions')
    b.locator('#practice-details > summary').click()
    b.locator('#lessonanswer-1').fill('7')
    b.locator('[data-note-sync]').click()
    expect(b.locator('#lessonnotes')).to_have_text('Contrapositive topic note from A')
    assert b.locator('#lessonnotes b,#lessonnotes strong').count() == 1, 'Topic-note formatting must sync too'
    expect(b.locator('#lessonanswer-1')).to_have_value('7')

    # Module notes remain local offline and automatically upload on reconnect.
    b.goto(URL + '#revision/notes')
    b.locator('#revisionfilter').select_option('scheduled')
    a.goto(URL + '#learn/0')
    ca.set_offline(True)
    a.locator('#modulenotes').fill('Module note saved offline')
    expect(a.locator('#modulenotesstatus')).to_contain_text('Offline')
    ca.set_offline(False)
    a.wait_for_function('!GatewiseProgress.pending()')
    sync(b)
    assert b.evaluate('state.moduleNotes[0]') == 'Module note saved offline'
    expect(b.locator('#revisionfilter')).to_have_value('scheduled')

    # Sticky-note HTML, title and color autosave through the real account SDK.
    note_id = add_sticky(a, 'Pivot formulas', 'Rank equals pivot count')
    note_a = a.locator(f'[data-sticky-id="{note_id}"]')
    note_a.locator('.sticky-content').press('Control+a')
    note_a.locator('[data-format="bold"]').click()
    note_a.locator('[data-note-color="blue"]').click()
    a.wait_for_function('!GatewiseProgress.pending()')
    expect(a.locator('[data-sticky-status]')).to_have_text('Up to date across devices')
    assert '<b>' in records[USERS['a@example.test']]['data']['progress']['stickyNotes'][note_id]['content']
    b.goto(URL + '#learn/0')
    b.locator('[data-sticky-sync]').click()
    note_b = b.locator(f'[data-sticky-id="{note_id}"]')
    expect(note_b.locator('.sticky-title')).to_have_value('Pivot formulas')
    expect(note_b).to_have_attribute('data-color', 'blue')
    assert note_b.locator('.sticky-content b').count() == 1
    note_b.locator('.sticky-content').focus()
    note_a.locator('.sticky-title').fill('Updated pivot formulas')
    sync(a)
    sync(b)
    expect(note_b.locator('.sticky-title')).to_have_value('Pivot formulas')
    expect(note_b.locator('[data-sticky-card-status]')).to_contain_text('Updated on another device')
    b.locator('#app h1').click()
    expect(note_b.locator('.sticky-title')).to_have_value('Updated pivot formulas')

    # Two disconnected devices create separate notes for the same module.
    ca.set_offline(True)
    cb.set_offline(True)
    local_id = add_sticky(a, 'Device A note', 'Local formula')
    remote_id = add_sticky(b, 'Device B note', 'Other device formula')
    expect(a.locator('[data-sticky-status]')).to_contain_text('Offline')
    ca.set_offline(False)
    cb.set_offline(False)
    sync(a)
    sync(b)
    sync(a)
    assert {note_id, local_id, remote_id}.issubset(a.evaluate('Object.keys(state.stickyNotes)'))
    assert {note_id, local_id, remote_id}.issubset(b.evaluate('Object.keys(state.stickyNotes)'))

    # Failed cloud saves remain cached through reload and upload on retry.
    fail_saves = True
    note_a.locator('.sticky-title').fill('Keep this title until retry')
    assert not a.evaluate('() => GatewiseCloud.syncNow()')
    expect(a.locator('[data-sticky-status]')).to_contain_text('Retry sync')
    a.reload()
    a.wait_for_function('appReady && !GatewiseProgress.locked && GatewiseCloud.user !== null')
    expect(note_a.locator('.sticky-title')).to_have_value('Keep this title until retry')
    fail_saves = False
    sync(a)
    sync(b)
    expect(note_b.locator('.sticky-title')).to_have_value('Keep this title until retry')

    # A focused note is retained for copying after remote deletion, then removed on blur.
    note_b.locator('.sticky-content').focus()
    note_a.locator('[data-delete-sticky]').click()
    note_a.locator('[data-confirm-delete]').click()
    sync(a)
    sync(b)
    expect(note_b.locator('[data-sticky-card-status]')).to_contain_text('Deleted on another device')
    b.locator('#app h1').click()
    expect(note_b).to_have_count(0)
    assert note_id not in records[USERS['a@example.test']]['data']['progress']['stickyNotes']

    a.goto(URL + '#learn/0/0-propositions')
    lesson_note_id = add_sticky(a, 'Topic sticky', 'Contrapositive reference')
    sync(a)
    b.goto(URL + '#learn/0/0-propositions')
    b.locator('[data-sticky-sync]').click()
    expect(b.locator(f'[data-sticky-id="{lesson_note_id}"] .sticky-content')).to_have_text('Contrapositive reference')
    a.goto(URL + '#dashboard')
    b.goto(URL + '#dashboard')
    # Finished study sessions and journal entries merge across devices like question history.
    change(a, "const now=Date.now();const run=GatewiseTime.create({sessionId:'device-a-focus',mode:'stopwatch',context:{kind:'learning',lesson:'0-matrices-rank',subject:0,label:'Matrices'},goal:'Identify pivots'},now-60000);state.focusSessions.push(GatewiseTime.record(run,now));state.focusReflections['device-a-focus']={recall:'Rank is the pivot count',nextAction:'Redo one rank problem'}")
    sync(a)
    sync(b)
    assert b.evaluate('state.focusSessions[0].durationMs') == 60000
    assert b.evaluate('state.focusReflections["device-a-focus"].recall') == 'Rank is the pivot count'
    change(b, "const now=Date.now();const run=GatewiseTime.create({sessionId:'device-b-focus',mode:'stopwatch',context:{kind:'revision',lesson:'0-matrices-rank',subject:0,label:'Matrices'},goal:'Check row operations'},now-30000);state.focusSessions.push(GatewiseTime.record(run,now));state.focusReflections['device-b-focus']={mistake:'Forgot the row swap sign'}")
    sync(b)
    sync(a)
    assert a.evaluate('state.focusSessions.length') == 2
    assert a.evaluate('state.focusReflections["device-b-focus"].mistake') == 'Forgot the row swap sign'
    # Two devices passing different checks derive the same lesson status after merging.
    change(a, "state.lessonChecks['check-0-propositions-0']={correct:true,date:today()}")
    change(b, "state.lessonChecks['check-0-propositions-1']={correct:true,date:today()}")
    sync(a)
    sync(b)
    sync(a)
    assert '0-propositions' in a.evaluate('state.understood')
    change(b, "state.notes['graph']='BFS uses a queue';state.bookmarks=[];delete state.reviewDates['0-propositions']")
    sync(b)
    sync(a)
    assert a.evaluate('state.notes.graph') == 'BFS uses a queue'
    assert a.evaluate('state.bookmarks') == []
    assert a.evaluate('state.reviewDates["0-propositions"]') is None

    # Two-device writes combine unrelated changes and retry a revision conflict.
    concurrent_uid = USERS['a@example.test']
    conflict_once = True
    change(a, "state.notes['matrix']='Gaussian elimination uses row operations'")
    sync(a)
    assert a.evaluate('state.notes["other-device"]') == 'Concurrent server note'
    assert records[concurrent_uid]['data']['progress']['notes']['matrix'] == 'Gaussian elimination uses row operations'

    # Pending offline work survives a reload; reconnect uploads it.
    ca.set_offline(True)
    change(a, "state.notes['offline']='Saved during travel'")
    assert not a.evaluate('() => GatewiseCloud.syncNow()')
    expect(a.locator('#cloudstatus')).to_contain_text('Offline')
    ca.set_offline(False)
    a.reload()
    a.wait_for_function('appReady && GatewiseCloud.user !== null')
    sync(a)
    sync(b)
    assert b.evaluate('state.notes.offline') == 'Saved during travel'

    # Test active mock and paper drafts, answers, histories, and completed-draft tombstones.
    a.locator('[data-nav="mocks"]').click()
    a.locator('#startmock').click()
    change(a, "mock.answers[0]=1;saveMock();paperRun={sessionId:crypto.randomUUID(),id:'2018_CS',count:65,answers:{0:'B'},start:Date.now(),end:Date.now()+3600000};persistPaper()")
    sync(a)
    sync(b)
    assert b.evaluate('mock.questions.length') == 65
    assert b.evaluate('mock.answers[0]') == 1
    assert b.evaluate('paperRun.answers[0]') == 'B'
    change(b, "mock.answers[1]=2;saveMock();paperRun.answers[1]='C';persistPaper()")
    sync(b)
    sync(a)
    assert a.evaluate('mock.answers[1]') == 2
    assert a.evaluate('paperRun.answers[1]') == 'C'
    a.evaluate('finishMock()')
    sync(a)
    # Device B still has the old mock. Its stale answer must not restore a submitted test.
    b.evaluate('mock.answers[2]=0;saveMock()')
    sync(b)
    assert b.evaluate('mock') is None
    assert b.evaluate('state.mockResults.length') == 1
    b.evaluate('finishPaper()')
    sync(b)
    sync(a)
    assert a.evaluate('paperRun') is None
    assert a.evaluate('state.paperResults.length') == 1

    # Explicit import is idempotent; failures never claim a successful save.
    a.locator('#account').click()
    a.locator('#importguest').click()
    a.wait_for_function('state.notes["guest-topic"] === "Guest only"')
    assert a.evaluate('state.moduleNotes[0]') == 'Module note saved offline', 'Import must retain the existing account module note'
    assert a.evaluate('state.stickyNotes["guest-sticky"].content') == '<b>Guest formula</b>'
    a.locator('#closeaccount').click()
    sync(a)
    fail_saves = True
    change(a, "state.notes['retry']='Pending after server failure'")
    assert not a.evaluate('() => GatewiseCloud.syncNow()')
    expect(a.locator('#cloudstatus')).to_contain_text('Retry sync')
    assert a.evaluate('GatewiseProgress.pending()')
    fail_saves = False
    sync(a)

    # Sign-out returns to guest; another account must not see A's cache or server data.
    a.locator('#account').click()
    a.locator('#signout').click()
    a.wait_for_function('GatewiseCloud.user === null && !GatewiseProgress.locked')
    assert a.evaluate('state.notes["guest-topic"]') == 'Guest only'
    assert a.evaluate('state.notes.matrix') is None
    signin(a, 'b@example.test')
    assert a.evaluate('state.notes') == {}
    assert a.evaluate('state.moduleNotes') == {}, 'Another account must not see module notes'
    assert a.evaluate('state.stickyNotes') == {}, 'Another account must not see rich sticky notes'
    assert a.evaluate('state.mockResults') == []
    assert a.evaluate('state.focusSessions') == []
    assert a.evaluate('GatewiseStudy.timer') is None
    change(a, "state.notes['private']='User B only'")
    sync(a)
    sync(b)
    assert b.evaluate('state.notes.private') is None

    # Two tabs of one browser share a cache and must retain each other's pending edits.
    tab = ca.new_page()
    tab.on('pageerror', lambda error: errors.append(str(error)))
    open_app(tab)
    assert tab.evaluate('GatewiseCloud.user.id') == USERS['b@example.test']
    fail_saves = True
    change(a, "state.notes['tab-one']='First tab edit'")
    change(tab, "state.notes['tab-two']='Second tab edit'")
    fail_saves = False
    sync(tab)
    sync(a)
    assert records[USERS['b@example.test']]['data']['progress']['notes']['tab-one'] == 'First tab edit'
    assert records[USERS['b@example.test']]['data']['progress']['notes']['tab-two'] == 'Second tab edit'
    tab.close()

    # Sign-out retains pending changes under A's ID, never in the guest or B workspace.
    b.locator('#studytimer').click()
    b.locator('#focusgoal').fill('Private unfinished timer for user A')
    b.locator('#focusform button[type=submit]').click()
    b.locator('button[data-closefocus]').click()
    assert b.evaluate('GatewiseStudy.timer.status') == 'running'
    fail_saves = True
    change(b, "state.notes['pending-signout']='Keep this until the next sign-in'")
    b.locator('#account').click()
    b.locator('#signout').click()
    b.wait_for_function('GatewiseCloud.user === null && !GatewiseProgress.locked')
    assert b.evaluate('state.notes["pending-signout"]') is None
    assert b.evaluate('GatewiseStudy.timer') is None
    assert b.evaluate('JSON.parse(localStorage.getItem("gatewise-focus-draft:"+' + json.dumps(USERS['a@example.test']) + ')).timer.status') == 'paused'
    assert b.evaluate('localStorage.getItem("gatewise-account:"+' + json.dumps(USERS['a@example.test']) + ')') is not None
    fail_saves = False
    signin(b, 'a@example.test')
    sync(b)
    b.wait_for_function('GatewiseStudy.timer?.status === "paused"')
    assert b.evaluate('GatewiseStudy.timer.goal') == 'Private unfinished timer for user A'
    assert records[USERS['a@example.test']]['data']['progress']['notes']['pending-signout'] == 'Keep this until the next sign-in'

    # Confirmation and reset UX use the actual SDK endpoints (no real email sent).
    cc, c = context(browser)
    open_app(c)
    c.locator('#account').click()
    c.locator('[data-accountmode="signup"]').click()
    c.locator('#accountemail').fill('a@example.test')
    c.locator('#accountpassword').fill('password123')
    c.locator('#accountsubmit').click()
    expect(c.locator('#accountmessage')).to_contain_text('Check your email')
    c.locator('[data-accountmode="reset"]').click()
    c.locator('#accountemail').fill('a@example.test')
    c.locator('#accountsubmit').click()
    expect(c.locator('#accountmessage')).to_contain_text('reset link')
    c.goto(URL + '?code=recovery-code')
    expect(c.locator('#dialog h2')).to_have_text('Choose a new password')
    c.locator('#accountpassword').fill('newpassword123')
    c.locator('#accountsubmit').click()
    expect(c.locator('#accountmessage')).to_contain_text('Password updated')
    assert c.locator('#accountpassword').input_value() == ''
    c.locator('#closeaccount').click()
    c.set_viewport_size({'width': 390, 'height': 844})
    c.locator('#account').click()
    assert c.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Account controls overflow on phone'
    c.screenshot(path='/tmp/gatewise-cloud-account-mobile.png')

    assert not errors, errors
    assert len(records) == 2
    browser.close()
    print('Cloud account checks passed: SDK auth, isolated users, two devices, conflicts, offline/cache, drafts, histories, import, failures and password flows.')
