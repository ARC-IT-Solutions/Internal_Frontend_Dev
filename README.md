# Lead Console — Internal Dashboard
Inquiries + Client Tickets + Role-Based Auth · Vanilla JS · Zero build step

---

## Project Structure

```
lead-console/
├── login.html              ← Login page (entry point)
├── index.html              ← Main dashboard (auth-guarded)
├── css/
│   ├── login.css           ← Login page styles
│   └── main.css            ← Dashboard styles + role-gated CSS
└── js/
    ├── auth.js             ← Auth logic, session, roles, permissions
    ├── state.js            ← Unified store (inquiries, tickets, user)
    ├── api.js              ← All HTTP calls + mock data
    ├── ui.js               ← DOM rendering (role-aware throughout)
    ├── notify.js           ← Push, audio, badge, visual bar
    └── main.js             ← Boot, auth guard, event wiring
```

---

## Quick Start

```bash
python3 -m http.server 8080
# open http://localhost:8080/login.html
```

ES Modules require HTTP — not `file://`.

---

## Roles & Permissions

| Permission          | Admin | Manager | Agent | Viewer |
|---------------------|:-----:|:-------:|:-----:|:------:|
| View all items      | ✓     | ✓       | —     | ✓      |
| View own items only | —     | —       | ✓     | —      |
| Update status       | ✓     | ✓       | ✓     | —      |
| Assign/Reassign     | ✓     | ✓       | —     | —      |
| Change priority     | ✓     | ✓       | —     | —      |
| Send replies        | ✓     | ✓       | ✓     | —      |
| Manage users        | ✓     | —       | —     | —      |

**Agents** only see items assigned to them or unassigned.
**Viewers** see everything but can only read — no status changes, no replies.

---

## Demo Users (Mock Mode)

| Name          | Email                  | Password   | Role    |
|---------------|------------------------|------------|---------|
| Admin User    | admin@company.com      | admin123   | Admin   |
| Ahmed Hassan  | ahmed@company.com      | ahmed123   | Manager |
| Sara Malik    | sara@company.com       | sara123    | Agent   |
| Khalid Nasser | khalid@company.com     | khalid123  | Agent   |
| Nour Ibrahim  | nour@company.com       | nour123    | Agent   |
| Rami Saleh    | rami@company.com       | rami123    | Viewer  |

---

## Connect Your Backend

**1. Set config in `js/api.js`:**
```js
const CONFIG = {
  BASE_URL: 'https://your-springboot-app.com/api',
  MOCK: false,
};
```

**2. Update login in `js/auth.js`** — uncomment the production block in `login()`:
```js
// Swap mock section for:
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { token, user } = await res.json();
// user must have: { id, name, email, role, avatar, department }
// role must be: 'admin' | 'manager' | 'agent' | 'viewer'
```

---

## Spring Boot API Contract

### Auth

#### `POST /api/auth/login`
```json
// Request
{ "email": "ahmed@company.com", "password": "ahmed123" }

// Response 200
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "usr_002",
    "name": "Ahmed Hassan",
    "email": "ahmed@company.com",
    "role": "manager",
    "avatar": "AH",
    "department": "Sales"
  }
}

// Response 401
{ "message": "Invalid email or password." }
```

### CORS Config (Spring Boot)
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://your-console-domain.com")
                .allowedMethods("GET", "POST", "PATCH", "OPTIONS")
                .allowedHeaders("*");
    }
}
```

### JWT Security (Spring Boot)
```java
// All requests to /api/** except /api/auth/** require Bearer token
// Extract role from JWT claims: claims.get("role", String.class)
// Role values: "admin", "manager", "agent", "viewer"
```

### All Other Endpoints

All requests include: `Authorization: Bearer <token>`

If backend returns `401`, the console auto-redirects to `login.html`.

```
GET    /api/inquiries              → list
PATCH  /api/inquiries/:id          → update status/assign/read
GET    /api/tickets                → list
PATCH  /api/tickets/:id            → update status/priority/assign/read
POST   /api/tickets/:id/replies    → { body: "..." }
GET    /api/employees              → ["Ahmed", "Sara", ...]
GET    /api/clients                → [{ id, name, email }, ...]
```

Full request/response shapes are in the previous version of this README.

---

## Session

- Sessions stored in `sessionStorage` — expire on tab close
- 8-hour session duration (configurable in `auth.js`)
- Token sent as `Authorization: Bearer <token>` on every API call
- 401 response from any endpoint → auto logout + redirect to login

To use `localStorage` instead (persist across tabs), change in `auth.js`:
```js
// Replace all sessionStorage calls with localStorage
localStorage.setItem(SESSION_KEY, ...)
localStorage.getItem(SESSION_KEY)
localStorage.removeItem(SESSION_KEY)
```

---

## Adding New Roles

Edit `auth.js`:

```js
export const ROLES = {
  admin:      { label: 'Admin',      level: 4 },
  manager:    { label: 'Manager',    level: 3 },
  supervisor: { label: 'Supervisor', level: 2.5 }, // ← new role
  agent:      { label: 'Agent',      level: 2 },
  viewer:     { label: 'Viewer',     level: 1 },
};

export const CAN = {
  updateStatus:   (role) => ['admin','manager','supervisor','agent'].includes(role),
  assign:         (role) => ['admin','manager','supervisor'].includes(role),
  // ...
};
```

Then add a CSS class in `main.css`:
```css
.role-supervisor { background: rgba(163,113,247,.15); color: #a371f7; }
```

---

## File Routing

| URL                        | Behaviour                          |
|----------------------------|------------------------------------|
| `/login.html`              | Login page (always public)         |
| `/index.html`              | Auth-guarded — redirects to login if no session |
| Any other page             | Add `getSession()` check in script |

The guard in `main.js`:
```js
const currentUser = getSession();
if (!currentUser) {
  window.location.replace('login.html');
  return;
}
```

---

## Browser Support
Chrome 80+, Firefox 75+, Safari 14+, Edge 80+. No IE. ES Modules required.

---

## Authentication & Role System

### Entry point

The app boots at `login.html`. On successful login the session is stored in `sessionStorage` and the user is redirected to `index.html`. If the session is missing or expired, `index.html` redirects back to `login.html` immediately.

### Roles & Permissions

| Action               | Admin | Manager | Agent | Viewer |
|----------------------|:-----:|:-------:|:-----:|:------:|
| View all items       |  ✓    |    ✓    |       |   ✓    |
| View own + unassigned|  ✓    |    ✓    |  ✓    |   ✓    |
| Update status        |  ✓    |    ✓    |  ✓    |        |
| Send replies         |  ✓    |    ✓    |  ✓    |        |
| Assign / reassign    |  ✓    |    ✓    |       |        |
| Change priority      |  ✓    |    ✓    |       |        |
| Manage users         |  ✓    |         |       |        |

Permissions are enforced in two places:
1. **`main.js`** — action event handlers check `can(action, user)` before calling the API
2. **`ui.js`** — controls are rendered `disabled` or hidden based on role, so the UI communicates constraints clearly

### Mock users (for demo / development)

| Name          | Email                  | Password    | Role    |
|---------------|------------------------|-------------|---------|
| Admin User    | admin@company.com      | admin123    | Admin   |
| Ahmed Hassan  | ahmed@company.com      | ahmed123    | Manager |
| Sara Malik    | sara@company.com       | sara123     | Agent   |
| Khalid Nasser | khalid@company.com     | khalid123   | Agent   |
| Nour Ibrahim  | nour@company.com       | nour123     | Agent   |
| Rami Saleh    | rami@company.com       | rami123     | Viewer  |

### Spring Boot auth endpoint

```java
// POST /api/auth/login
// Request:  { "email": "...", "password": "..." }
// Response: { "token": "eyJ...", "user": { "id", "name", "email", "role", "avatar", "department" } }

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        // 1. Look up user by email
        // 2. Verify bcrypt password
        // 3. Generate JWT with role claim
        // 4. Return token + user object
        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(new LoginResponse(token, userDto));
    }
}
```

JWT should include `role` as a claim so the backend can enforce permissions on every protected endpoint.

To switch from mock to real auth, in `js/auth.js`:
1. Comment out the mock block in `login()`
2. Uncomment the production `fetch` block
3. Set `CONFIG.MOCK = false` in `js/api.js`

### Session & token

- Session stored in `sessionStorage` (clears on tab/browser close)
- For persistent "remember me" sessions: swap `sessionStorage` → `localStorage` in `auth.js`
- Token is included as `Authorization: Bearer <token>` on every API call automatically
- If the backend returns `401`, the app clears the session and redirects to `login.html`
