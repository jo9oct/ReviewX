"""
End-to-end auth test suite.

Run after starting the server:
  node server.js   (MongoDB must be running)

Then:
  python3 test_auth.py
"""

import urllib.request, urllib.error, json, pathlib, sys, time

BASE  = 'http://localhost:8090/api/v1'
# Unique email per run so re-running never hits a duplicate conflict
TS    = int(time.time())
EMAIL = f'test_{TS}@reviewx.dev'

results = []
passed  = 0
failed  = 0

def req(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body else None
    h    = {'Content-Type': 'application/json', **(headers or {})}
    r    = urllib.request.Request(f'{BASE}{path}', data=data, headers=h, method=method)
    try:
        res = urllib.request.urlopen(r, timeout=5)
        return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {}
    except Exception as ex:
        return None, str(ex)

def check(label, code, expected, body, extra=None):
    global passed, failed
    ok = code == expected
    if ok and extra:
        ok = extra(body)
    mark = '✓' if ok else '✗'
    if ok: passed += 1
    else:  failed += 1
    line = f'{mark}  [{code}→{expected}]  {label}'
    results.append(line)
    if not ok:
        results.append(f'   body: {json.dumps(body)[:240]}')
    return body

# ── 1. Validation errors ───────────────────────────────────────────────────────
code, body = req('POST', '/auth/register', {})
check('Register empty body → 422 with field errors',
      code, 422, body,
      lambda b: b.get('success') is False and len(b.get('errors', [])) >= 3)

code, body = req('POST', '/auth/register',
                 {'name': 'X', 'email': 'bad-email', 'password': 'short'})
check('Register bad email + short password → 422', code, 422, body)

code, body = req('POST', '/auth/login', {})
check('Login empty body → 422', code, 422, body)

# ── 2. Registration ───────────────────────────────────────────────────────────
code, body = req('POST', '/auth/register',
                 {'name': 'Alex Morgan', 'email': EMAIL, 'password': 'reviewx123'})
check('Register valid user → 201',
      code, 201, body,
      lambda b: (b.get('success') is True
                 and 'token' in b.get('data', {})
                 and b['data']['user']['role'] == 'member'
                 and b['data']['user']['email'] == EMAIL))
token = body.get('data', {}).get('token', '')

# ── 3. Duplicate email ────────────────────────────────────────────────────────
code, body = req('POST', '/auth/register',
                 {'name': 'Alex Morgan', 'email': EMAIL, 'password': 'reviewx123'})
check('Register duplicate email → 409', code, 409, body)

# ── 4. Role escalation blocked ────────────────────────────────────────────────
other_email = f'hacker_{TS}@reviewx.dev'
code, body = req('POST', '/auth/register',
                 {'name': 'Hacker', 'email': other_email,
                  'password': 'reviewx123', 'role': 'platform'})
check('Register with role=platform → created as member',
      code, 201, body,
      lambda b: b.get('data', {}).get('user', {}).get('role') == 'member')

# ── 5. Login ──────────────────────────────────────────────────────────────────
code, body = req('POST', '/auth/login',
                 {'email': EMAIL, 'password': 'wrongpassword'})
check('Login wrong password → 401', code, 401, body)

code, body = req('POST', '/auth/login',
                 {'email': 'nobody@nowhere.com', 'password': 'reviewx123'})
check('Login unknown email → 401 (same error)', code, 401, body)

code, body = req('POST', '/auth/login',
                 {'email': EMAIL, 'password': 'reviewx123'})
check('Login valid credentials → 200',
      code, 200, body,
      lambda b: b.get('success') is True and 'token' in b.get('data', {}))
login_token = body.get('data', {}).get('token', token)

# ── 6. Protected route ────────────────────────────────────────────────────────
code, body = req('GET', '/auth/me')
check('GET /me no token → 401', code, 401, body)

code, body = req('GET', '/auth/me',
                 headers={'Authorization': 'Bearer not.a.valid.token'})
check('GET /me malformed token → 401', code, 401, body)

code, body = req('GET', '/auth/me',
                 headers={'Authorization': f'Bearer {login_token}'})
check('GET /me valid token → 200 with correct user',
      code, 200, body,
      lambda b: (b.get('success') is True
                 and b['data']['user']['email'] == EMAIL))

# ── 7. Health check still works ───────────────────────────────────────────────
code, body = req('GET', '/health')
check('GET /health (DB connected) → 200',
      code, 200, body,
      lambda b: b.get('database', {}).get('status') == 'connected')

# ─────────────────────────────────────────────────────────────────────────────
results.append('')
results.append(f'Results: {passed} passed  {failed} failed  (test email: {EMAIL})')

print('\n'.join(results))
sys.exit(0 if failed == 0 else 1)
