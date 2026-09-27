# IPv6 / IPv4 handling and TLS notes (capa-backend)

Purpose
-------
This document records the networking and TLS-related changes that were added to
the backend to work around DNS / IPv6 / TLS issues observed while connecting to
the remote Supabase Postgres instance from developer machines.

Files touched
------------
- `capa-backend/src/database/connection.js` — DNS/IPv6 fallback logic, DB password injection, TLS flag.
- `capa-backend/.env` — new dev variables: `DB_PASSWORD`, `DB_ALLOW_INSECURE_TLS`.

Summary of changes
------------------
- DB password injection: the runtime reads `DB_PASSWORD` from environment and,
  when needed, injects it into `DATABASE_URL` (URI-encoded). This avoids
  committing a plaintext password inside `DATABASE_URL` in the repo.
- IPv6 lookup & literal rewrite (fallback): to handle environments where DNS
  returns IPv6-only answers or where a hostname doesn't resolve to a usable
  IPv4 address, the connection code attempts an IPv6 lookup (Node's
  `dns.lookup(host, { family: 6 })`). If a numeric IPv6 result is required,
  the host portion of the parsed `DATABASE_URL` is rewritten to the IPv6
  literal form (square-bracketed) so the Postgres client can connect:

  Example literal form:

  ```
  postgresql://postgres:password@[2001:db8::1]:5432/postgres?sslmode=require
  ```

  Use note: this rewrite is a fallback only — it was added to improve
  connectivity from development environments affected by IPv6-only DNS
  answers.
- Dev TLS bypass: a development-only environment flag `DB_ALLOW_INSECURE_TLS`
  was added. When set to `1`, the PG client is configured with
  `ssl.rejectUnauthorized = false` and the process sets
  `NODE_TLS_REJECT_UNAUTHORIZED=0`. This is strictly for local testing and
  MUST NOT be enabled in production.

Why these changes exist
----------------------
Developer machines or certain DNS resolvers can return AAAA records (IPv6)
without a working IPv4 route, or the network path may cause certificate
validation errors. The changes are pragmatic fallbacks that make local
development possible when the environment otherwise blocks hostname resolution
or strict TLS verification.

How to use / test locally
-------------------------
1. Add a minimal `.env` to `capa-backend` (development only):

```
DATABASE_URL=postgresql://postgres@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
DB_PASSWORD=your_db_password_here
DB_ALLOW_INSECURE_TLS=1   # development only
```

2. Start the backend:

```powershell
cd capa-backend
npm install
npm run dev
```

3. Check an endpoint (example):

```powershell
curl http://localhost:3001/api/questions/affittuario
```

Deployment notes (Render / production)
------------------------------------
- Never enable `DB_ALLOW_INSECURE_TLS` in production.
- Prefer hostnames in `DATABASE_URL` and let the platform (Render, Heroku,
  etc.) resolve addresses. If the deployment environment supports IPv6 and
  you want a numeric IPv6 address, use the IPv6 literal form inside the URL
  (square brackets) and include the password:

```
postgresql://postgres:password@[2001:db8::1]:5432/postgres?sslmode=require
```

- If you see TLS verification failures in production, provide the proper CA or
  certificate chain to the runtime instead of disabling verification.

Reverting the changes
---------------------
- To remove the fallbacks: restore the previous `src/database/connection.js`
  (remove the IPv6 lookup/rewrite and the `DB_ALLOW_INSECURE_TLS` logic) and
  rely on the platform's default DNS/TLS behavior.

Troubleshooting
---------------
- Check the exact logic in `capa-backend/src/database/connection.js`.
- DNS checks you can run locally:

```powershell
nslookup db-hostname.supabase.co
Resolve-DnsName db-hostname.supabase.co -Type AAAA
```

If you want, I can:
- add a `DB_FORCE_IPV4` flag to force A-record resolution and skip the IPv6
  rewrite;
- or add a short automated test that validates both hostname and literal-IP
  connection attempts before the server starts.

Keep this file alongside the backend so deployers know why the connection code
contains defensive fallbacks and how to remove them before production.
