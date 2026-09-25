"""
Full auth spec test — verifies /api/auth endpoints against the brief.
Run with: python3 test_auth_spec.py
(server + mongod must be running)
"""

import urllib.request, urllib.error, json, sys, time, pathlib

BASE  = 'http://localhost:8090/api/auth'
TS    = int(time.time())
EMAIL = f'spec_{TS}@reviewx.dev'
PWD   = 'reviewx123'

passed = failed = 0
log    = []

def req(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body else None
    h    = {'Content-Type': 'application/json', **(headers or {})}
    r    = urllib.request.Request(f'{BASE}{path}', data=data, headers=h, method=method)
    try:
        res = urllib.request.urlopen(r, timeout=5)
        return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:    return e.code, json.loads(e.read())
        except: return e.code, {}
    except Exception as ex:
        return None, str(ex)

def check(label, code, expected, body, extra=None):
    global passed, failed
    ok = (code == expected)
    if ok and extra:
        ok = extra(body)
    mark = '✓' if ok else '✗'
    if ok: passed += 1
    else:  failed += 1
    log.append(f'{mark}  [{code}→{expected}]  {label}')
    if not ok:
        log.append(f'   body: {json.dumps(body)[:300]}')
    return body

# ── Error shape ───────────────────────────────────────────────────────────────
# All errors must use { error: { message, code } }
def has_error_shape(b):
    return (
        isinstance(b.get('error'), dict)
        and 'message' in b['error']
        and 'code'    in b['error']
    )

# ── Validation (Joi) ──────────────────────────────────────────────────────────
code, body = req('POST', '/register', {})
check('Register empty body → 422 with error shape', code, 422, body,
      lambda b: has_error_shape(b) or b.get('success') is False)

code, body = req('POST', '/register',
                 {'name': 'X', 'email': 'not-an-email', 'password': 'short'})
check('Register bad email + short password → 422', code, 422, body)

code, body = req('POST', '/login', {})
check('Login empty body → 422', code, 422, body)

# ── Register success ──────────────────────────────────────────────────────────
code, body = req('POST', '/register',
                 {'name': 'Alex Morgan', 'email': EMAIL, 'password': PWD})
check('Register valid → 201 with token + user',
      code, 201, body,
      lambda b: (
          'token'    in b.get('data', {})
          and 'user' in b['data']
          and b['data']['user']['email'] == EMAIL
          and b['data']['user']['role']  == 'member'   # always member
          and 'passwordHash' not in b['data']['user']  # never exposed
      ))
token = body.get('data', {}).get('token', '')

# ── Role cannot be escalated ──────────────────────────────────────────────────
code, body = req('POST', '/register',
                 {'name': 'Hacker', 'email': f'h_{TS}@reviewx.dev',
                  'password': PWD, 'role': 'platform_admin'})
check('Register with role=platform_admin → created as member',
      code, 201, body,
      lambda b: b.get('data', {}).get('user', {}).get('role') == 'member')

# ── Duplicate email → 409 ────────────────────────────────────────────────────
code, body = req('POST', '/register',
                 {'name': 'Alex Morgan', 'email': EMAIL, 'password': PWD})
check('Duplicate email → 409', code, 409, body, has_error_shape)

# ── Login: wrong password → generic 401 ──────────────────────────────────────
code, body = req('POST', '/login', {'email': EMAIL, 'password': 'wrongpass'})
check('Login wrong password → 401 generic', code, 401, body,
      lambda b: has_error_shape(b) and 'credential' in b['error']['message'].lower())

# ── Login: unknown email → same generic 401 (no enumeration) ─────────────────
code, body = req('POST', '/login',
                 {'email': f'nobody_{TS}@nowhere.com', 'password': PWD})
check('Login unknown email → 401 same message (no enumeration)',
      code, 401, body,
      lambda b: has_error_shape(b) and 'credential' in b['error']['message'].lower())

# ── Login success ─────────────────────────────────────────────────────────────
code, body = req('POST', '/login', {'email': EMAIL, 'password': PWD})
check('Login valid → 200 with token + user',
      code, 200, body,
      lambda b: (
          'token' in b.get('data', {})
          and b['data']['user']['email'] == EMAIL
          and 'passwordHash' not in b['data']['user']
      ))
login_token = body.get('data', {}).get('token', token)

# ── GET /me: no token ─────────────────────────────────────────────────────────
code, body = req('GET', '/me')
check('GET /me no token → 401 with error shape', code, 401, body, has_error_shape)

# ── GET /me: malformed token ──────────────────────────────────────────────────
code, body = req('GET', '/me', headers={'Authorization': 'Bearer notavalidtoken'})
check('GET /me bad token → 401 with error shape', code, 401, body, has_error_shape)

# ── GET /me: valid token ──────────────────────────────────────────────────────
code, body = req('GET', '/me', headers={'Authorization': f'Bearer {login_token}'})
check('GET /me valid token → 200 correct user, no passwordHash',
      code, 200, body,
      lambda b: (
          b.get('data', {}).get('user', {}).get('email') == EMAIL
          and 'passwordHash' not in b.get('data', {}).get('user', {})
      ))

# ── JWT payload contains userId + role ───────────────────────────────────────
import base64
try:
    parts   = login_token.split('.')
    padding = '=' * (4 - len(parts[1]) % 4)
    payload = json.loads(base64.urlsafe_b64decode(parts[1] + padding))
    has_userId = 'userId' in payload
    has_role   = 'role'   in payload
    check('JWT payload has userId + role fields', 200, 200, {},
          lambda _: has_userId and has_role)
except Exception as ex:
    check(f'JWT payload decode failed: {ex}', None, 200, {})

# ─────────────────────────────────────────────────────────────────────────────
log.append('')
log.append(f'Results: {passed} passed  {failed} failed')

output = '\n'.join(log)
print(output)
pathlib.Path('/home/dagne/spec_results.txt').write_text(output)
sys.exit(0 if failed == 0 else 1)
