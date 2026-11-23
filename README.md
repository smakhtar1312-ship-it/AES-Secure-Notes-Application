# Secure Notes Application

An AES-256-GCM encrypted personal notes web application built as a cybersecurity academic project. Users can register, log in, and manage private notes. All note content is encrypted in the database using AES-256-GCM. Access is strictly controlled — a user can never read, modify, or delete another user's notes.

---

## Problem Statement

Storing personal notes in plain text on a server is risky. If the database is compromised, all note content is immediately readable. Additionally, without proper access control, one user could read or modify another user's data simply by guessing or manipulating IDs.

This project demonstrates how to build a note-taking application that:
- Encrypts note content before storing it in the database
- Hashes passwords so they are never stored in readable form
- Uses server-side session management so authentication cannot be faked
- Enforces ownership checks on the server so the frontend cannot bypass access control

---

## Objectives

- Implement secure user registration and login
- Store passwords as bcrypt hashes (never plaintext)
- Encrypt note content with AES-256-GCM before saving to the database
- Enforce that users can only access their own notes
- Protect against common web vulnerabilities (XSS, SQL injection, CSRF)
- Validate all input before processing
- Handle errors safely without exposing internals

---

## Features

- User registration with email and password
- Secure login and logout
- Session-based authentication with HTTP-only cookies
- Create, view, edit, and delete notes
- AES-256-GCM encryption of note content at rest
- Server-side ownership enforcement on every operation
- Rate limiting on login and register endpoints
- Security headers via Helmet
- Input validation on all endpoints
- Centralized error handling (no stack traces to users)
- Server-side logging of security events

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Simple, component-based UI |
| Styling | Vanilla CSS | No extra dependencies |
| Routing | React Router v6 | Client-side routing |
| Backend | Node.js + Express | Widely known, easy to explain |
| Database | SQLite (via Prisma) | Zero config, file-based, great for demos |
| ORM | Prisma | Parameterized queries by default, type-safe |
| Password Hashing | bcryptjs (cost 12) | No native build issues, well-tested |
| Sessions | express-session + connect-sqlite3 | Server-side sessions, HTTP-only cookies |
| Encryption | Node.js built-in `crypto` (AES-256-GCM) | No extra dependencies |
| Validation | express-validator | Declarative, consistent |
| Rate Limiting | express-rate-limit | Protects auth endpoints |
| Security Headers | helmet | CSP, X-Content-Type-Options, etc. |
| Logging | winston | Structured server-side logs |
| Testing (backend) | Jest + supertest | API-level testing |

---

## Architecture

```
User Browser
     │
     ▼
React Frontend  (port 5173)
     │  fetch with credentials: 'include'
     ▼
Express Backend  (port 3001)
     │
     ├── helmet      → security headers
     ├── CORS        → restrict origin
     ├── express-session + SqliteStore  → session management
     ├── requireAuth middleware          → check session before routes
     ├── express-validator              → input validation
     ├── express-rate-limit             → rate limiting on /auth/*
     │
     ├── /api/auth/register   → hash password → store user
     ├── /api/auth/login      → verify hash → create session
     ├── /api/auth/logout     → destroy session
     ├── /api/auth/me         → return current user
     │
     ├── /api/notes           → list notes (WHERE userId = session.userId)
     ├── /api/notes/:id       → get note + ownership check
     ├── /api/notes (POST)    → encrypt content → store
     ├── /api/notes/:id (PUT) → ownership check → encrypt → update
     └── /api/notes/:id (DEL) → ownership check → delete
          │
          ▼
     Prisma ORM  (parameterized queries only)
          │
          ▼
     SQLite  database/notes.db
     (passwords stored as bcrypt hashes)
     (note content stored AES-256-GCM encrypted)
```

---

## Database Schema

### User table
```
id           INTEGER  PRIMARY KEY AUTOINCREMENT
email        TEXT     UNIQUE NOT NULL
passwordHash TEXT     NOT NULL          -- bcrypt hash, cost 12
createdAt    DATETIME DEFAULT now()
updatedAt    DATETIME
```

### Note table
```
id        INTEGER  PRIMARY KEY AUTOINCREMENT
userId    INTEGER  NOT NULL REFERENCES User(id) ON DELETE CASCADE
title     TEXT     NOT NULL
content   TEXT     NOT NULL  -- AES-256-GCM encrypted hex string
iv        TEXT     NOT NULL  -- 128-bit initialization vector (hex)
authTag   TEXT     NOT NULL  -- GCM authentication tag (hex)
createdAt DATETIME DEFAULT now()
updatedAt DATETIME
```

Every note has a `userId` foreign key. The `content` field is never stored in plain text — it is encrypted using AES-256-GCM before insert, and decrypted on read.

---

## Authentication Workflow

### Registration
```
1. User submits email + password
2. Backend validates email format, password length and complexity
3. Check if email already exists → reject if duplicate
4. Hash password with bcrypt (cost factor 12)
5. Store { email, passwordHash } in database
6. Return success (never return the hash)
```

### Login
```
1. User submits email + password
2. Backend validates input
3. Look up user by email
4. Compare submitted password with stored hash using bcrypt.compare()
5. If match → regenerate session (prevents session fixation)
6. Store userId in session
7. Set HTTP-only, SameSite=Strict cookie
8. Return user info (no hash, no session secret)
```

---

## Authorization Workflow

Every protected route passes through `requireAuth` middleware:

```
Request arrives
       │
       ▼
requireAuth middleware
       │
       ├── session.userId missing? → 401 Unauthorized
       │
       └── session.userId present → attach to req.userId → continue
                                              │
                                              ▼
                                    Notes controller
                                              │
                                    Find note in database
                                              │
                                    note.userId === req.userId?
                                              │
                                    NO → 403 Forbidden
                                    YES → proceed
```

The `userId` is **always taken from the session**. The client cannot pass a `userId` in the request body to access another user's notes — it is completely ignored.

---

## Security Mechanisms

### 1. AES-256-GCM Encryption
- Every note's content is encrypted before database storage
- Each note gets a unique random 128-bit IV
- GCM mode provides both confidentiality and integrity (authenticated encryption)
- The `authTag` prevents tampering — decryption fails if content was modified
- Encryption key stored in `.env`, never in source code

### 2. Password Hashing (bcrypt, cost 12)
- Passwords are hashed on registration
- Plain text password is never stored or logged
- bcrypt.compare() is used for verification — safe constant-time comparison
- Same error message for wrong email and wrong password (prevents account enumeration)

### 3. Session Security
- Sessions stored server-side in SQLite, not in the cookie
- Cookie is HTTP-only (JavaScript cannot read it)
- Cookie is SameSite=Strict (CSRF protection for cookie-based auth)
- Cookie is Secure in production (HTTPS only)
- Session is regenerated on login (prevents session fixation)
- Session is destroyed on logout

### 4. Input Validation
- All inputs validated with express-validator before processing
- Email normalization, length limits, format checks
- Password complexity requirements
- Note title and content length limits
- Route parameters (note ID) validated as integers

### 5. SQL Injection Prevention
- All database queries go through Prisma ORM
- Prisma uses parameterized queries internally — user input is never concatenated into SQL
- Verified with injection-style test strings in the test suite

### 6. XSS Prevention
- Note content is returned as plain text in API responses
- React renders text as `{note.content}` — not dangerouslySetInnerHTML
- React escapes all text by default
- Content Security Policy header via helmet restricts script sources to 'self'

### 7. Security Headers (via helmet)
- `Content-Security-Policy` — restricts script/style sources
- `X-Content-Type-Options: nosniff` — prevents MIME type sniffing
- `X-Frame-Options` — prevents clickjacking
- `Referrer-Policy` — controls referrer information
- `X-DNS-Prefetch-Control` — disables DNS prefetching

### 8. Rate Limiting
- Login and register endpoints: max 10 requests per 15 minutes per IP
- Reduces brute-force and credential stuffing attacks
- Returns `429 Too Many Requests` when exceeded

### 9. Error Handling
- Central error handler catches all thrown errors
- Full error details (stack trace, SQL, paths) logged server-side via winston
- Only safe generic messages returned to client: "Internal server error."
- Prisma-specific errors (duplicate key, not found) mapped to appropriate HTTP codes

### 10. CORS
- Backend only allows requests from `http://localhost:5173` in development
- `credentials: true` required for cookies to be sent cross-origin

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Create new account |
| POST | /api/auth/login | No | Login, create session |
| POST | /api/auth/logout | Yes | Destroy session |
| GET | /api/auth/me | Yes | Get current user info |
| GET | /api/notes | Yes | List own notes (titles only) |
| GET | /api/notes/:id | Yes | Get full note (decrypted) |
| POST | /api/notes | Yes | Create note (encrypted) |
| PUT | /api/notes/:id | Yes | Update note (re-encrypted) |
| DELETE | /api/notes/:id | Yes | Delete own note |

### HTTP Status Codes Used
| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation failed) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (wrong user) |
| 404 | Not Found |
| 409 | Conflict (duplicate email) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Testing

### Backend Tests (Jest + supertest)

Run: `cd backend && npm test`

Tests cover:

| Category | Tests |
|---|---|
| Registration | Valid, invalid email, weak password, duplicate, missing fields |
| Login | Correct credentials, wrong password, unknown email, missing fields |
| Auth Middleware | Unauthenticated access to protected routes |
| Create Notes | Authenticated create, unauthenticated, invalid input |
| Read Notes | Own notes, cross-user read (403), invalid ID, not found |
| Update Notes | Own update, cross-user update (403), unauthenticated |
| Delete Notes | Own delete, cross-user delete (403), unauthenticated, deleted note |
| Logout | Session invalidation after logout |
| XSS | Script payload stored as text, returned safely |
| SQL Injection | Injection string stored safely via Prisma |
| Session Security | Invalid session token rejected |

**Result: 35/35 tests pass**

---

## Installation

### Prerequisites
- Node.js 18+
- npm

### Steps

```bash
# 1. Clone or download the project
cd "AES-Secure Notes Application"

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up the database
npx prisma migrate dev --name init

# 4. Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

---

## Environment Configuration

The backend requires a `.env` file in the `backend/` folder.

Copy `.env.example` and fill in values:
```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | SQLite database path | `file:../database/notes.db` |
| `SESSION_SECRET` | Secret for signing session cookies | Random 32+ char string |
| `PORT` | Backend server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `ENCRYPTION_KEY` | AES-256 key — must be exactly 64 hex characters (32 bytes) | `a1b2...` (64 chars) |

> **Never commit the real `.env` file.** The `.gitignore` excludes it. Only `.env.example` is committed.

### Generating a secure ENCRYPTION_KEY
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Future Improvements

The following are possible improvements not yet implemented:

- HTTPS/TLS in production deployment
- Per-user encryption keys derived from password (client-side key derivation)
- Password reset via email
- Two-factor authentication (TOTP)
- Account deletion
- Note sharing between users
- Audit log for security events
- Docker containerization
- Rate limiting per user (not just per IP)
- Search/filter notes
- Note categories or tags

---

## Security Concepts Demonstrated

### Authentication
Authentication answers: **"Who are you?"**

When a user logs in, the server verifies the submitted password against the stored bcrypt hash. If it matches, a session is created and a session ID is sent to the browser via an HTTP-only cookie. On every subsequent request, the browser sends this cookie automatically, and the server looks up the session to identify the user.

### Authorization
Authorization answers: **"What are you allowed to do?"**

Even after authentication, the server checks whether the authenticated user actually owns the resource they are trying to access. For every note operation (read, update, delete), the server fetches the note from the database and compares `note.userId` with `req.session.userId`. If they do not match, the request is rejected with 403 Forbidden.

This is **object-level authorization** — enforced server-side, not in the UI.

### Password Hashing
Passwords should never be stored as plain text. If the database is leaked, plain text passwords would be immediately usable by an attacker.

bcrypt is a one-way hashing function designed to be slow. Even if an attacker gets the database, they cannot reverse the hash to find the password. They would have to try billions of combinations (brute force), which bcrypt makes computationally expensive.

Cost factor 12 means bcrypt runs 2^12 = 4096 internal iterations per hash.

### Confidentiality (AES-256-GCM)
Note content is encrypted with AES-256-GCM before being stored in the database. If the database file is accessed directly (e.g., the `notes.db` file is stolen), the note content appears as random hex — it cannot be read without the encryption key.

GCM (Galois/Counter Mode) also provides **authenticated encryption** — the `authTag` field ensures that if anyone tampers with the encrypted content in the database, decryption will fail. This provides both confidentiality and integrity.

Each note uses a unique random IV (Initialization Vector) so that two notes with the same content produce different ciphertext.

### Integrity
The server enforces that notes cannot be modified by unauthorized users. Ownership is checked server-side before any update or delete. The GCM auth tag also ensures the encrypted content itself has not been tampered with.

### Input Validation
All data from users is untrusted by default. Before processing any request, the backend validates:
- Email format
- Password complexity
- Note title and content length
- Route parameter types (note ID must be a positive integer)

If validation fails, the request is rejected with 400 Bad Request before reaching the database or business logic.

### SQL Injection
SQL injection is an attack where malicious input is crafted to alter the structure of a SQL query. For example, a note content of `'; DROP TABLE users; --` could destroy data if directly concatenated into a SQL string.

This project uses Prisma ORM, which always uses parameterized queries. User input is passed as a parameter value, never as part of the SQL structure. Injection attempts are stored as harmless text — verified by tests.

### XSS (Cross-Site Scripting)
XSS is an attack where malicious JavaScript is injected into a page and executed in another user's browser. For example, a note containing `<script>alert('hacked')</script>` could steal cookies or perform actions on behalf of the user.

This application prevents XSS in two ways:
1. React renders text content using `{note.content}` — this escapes HTML characters automatically
2. The Content Security Policy header restricts which scripts can execute

A test verifies that a script-like payload is returned as plain text and not executed.

### Session Security
After login, the user's identity is stored in a server-side session. The browser only receives a session ID cookie. The actual session data (userId) is stored on the server in a SQLite database.

Key protections:
- `HttpOnly` — JavaScript cannot read the session cookie
- `SameSite=Strict` — cookie is not sent on cross-site requests (CSRF protection)
- `Secure` — cookie is only sent over HTTPS in production
- Session regeneration on login — prevents session fixation attacks
- Session destruction on logout — the session ID becomes invalid immediately

### CSRF (Cross-Site Request Forgery)
CSRF is an attack where a malicious website tricks a logged-in user's browser into making a request to your application.

This application uses `SameSite=Strict` cookies, which means the browser will not send the session cookie with requests originating from another site. This provides CSRF protection without requiring a separate CSRF token, as long as all state-changing requests use methods other than GET (which they do — POST, PUT, DELETE).
