# Authentication setup

TrainLab AI signs users in with **Google** and **GitHub** OAuth. The backend
owns the flow: it redirects to the provider, handles the callback, upserts the
user, and issues a signed session cookie (a stateless JWT). The Next.js app
proxies `/api/*` to the backend, so every request — and the session cookie — is
same-origin.

You need to register an OAuth app with each provider and put the credentials in
your `.env`. **Secrets are never committed** (`.env` is gitignored).

## Callback URLs

Because requests reach the backend through the frontend proxy, the callback URL
is on the **frontend origin**:

| Provider | Local callback URL |
| -------- | ------------------ |
| Google   | `http://localhost:3000/api/v1/auth/google/callback` |
| GitHub   | `http://localhost:3000/api/v1/auth/github/callback` |

In production, swap `http://localhost:3000` for your real domain and set
`FRONTEND_URL` accordingly.

## Google

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) →
   **APIs & Services → Credentials**.
2. Configure the **OAuth consent screen** (External is fine for testing; add
   your email as a test user).
3. **Create Credentials → OAuth client ID → Web application**.
4. Under **Authorized redirect URIs**, add:
   `http://localhost:3000/api/v1/auth/google/callback`
5. Copy the **Client ID** and **Client secret** into `.env`:

   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

Scopes requested: `openid email profile`.

## GitHub

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   (https://github.com/settings/developers).
2. Set:
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/v1/auth/github/callback`
3. Generate a client secret, then copy both into `.env`:

   ```
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   ```

Scopes requested: `read:user user:email` (so the primary verified email can be
read even when the user's public email is hidden).

## Session key

Set a strong `SECRET_KEY` (used to sign the session JWT and OAuth state cookie):

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Put the result in `.env` as `SECRET_KEY=...`. Changing it invalidates all
existing sessions.

## Verify

1. `docker compose up --build` (or run both services locally).
2. Open http://localhost:3000 → **Sign in**.
3. Choose a provider, authorize, and you land on `/dashboard` with your profile.
4. **Log out** clears the session cookie and returns you to `/login`.

A provider whose credentials are blank is automatically disabled — its button
is greyed out and the backend returns `503` for that provider's login route.
