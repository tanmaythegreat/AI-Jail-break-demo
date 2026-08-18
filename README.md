# Vault — Secret Extraction Chat Game

A login-gated webpage that starts a chat with an AI ("Vault"). Vault is holding a
secret passphrase and has been instructed never to reveal it, no matter what
technique you try (roleplay, "ignore previous instructions", claiming to be an
admin, translation tricks, etc). If it ever slips and includes the phrase in a
reply, the server detects the leak server-side and declares you the winner.

## Stack
- **Backend:** Node.js + Express, `express-session` for login sessions, `bcryptjs` for password hashing.
- **AI:** Groq's API (`openai/gpt-oss-20b` by default), called directly from the backend so the API key and the secret phrase never reach the browser. Groq has a free tier — just email or Google/GitHub sign-in, no phone number or card needed.
- **Frontend:** Plain HTML/CSS/JS, no build step.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env file and fill in your Groq API key(s):
   ```bash
   cp .env.example .env
   ```
   Get free keys at https://console.groq.com/keys (sign in with email or Google/GitHub, no phone or card required), then set:
   ```
   GROQ_API_KEY_1=your_key_here
   ```
   **Want to run past a single key's daily quota?** Sign up for a few more free Groq accounts and drop each key into `GROQ_API_KEY_2`, `GROQ_API_KEY_3`, ... up to `GROQ_API_KEY_10` (or more). The server picks a random key per message, and if one hits its rate limit or daily quota, it automatically retries the same message — same conversation history — on a different key. Nobody in the chat notices the swap.

   You can also change `SECRET_PHRASE` here to whatever you want the AI to guard, and `GROQ_MODEL` to any model your account has access to.

3. Run it:
   ```bash
   npm start
   ```
   Then open http://localhost:3000

## Logging in

A demo account is seeded automatically:
- username: `player`
- password: `password123`

You can also register a new account from the login screen (accounts are stored
in memory only — they reset when the server restarts). Swap in a real database
before deploying this anywhere public.

## How the challenge works

- The secret phrase and the "never reveal it" instructions live in a
  `system` message sent to Groq on every request — they never touch the
  frontend, so opening dev tools won't spoil it.
- Every AI reply is scanned server-side for the literal secret phrase. If it
  appears, `won: true` is returned and the win banner shows up — this doesn't
  rely on the AI "admitting" defeat, just on the phrase actually leaking.
- Conversation history is kept per login session (server-side), so refreshing
  the page keeps your progress; "Reset chat" clears it and starts over while
  staying logged in.

## Sharing it with friends for a few hours (free, no hosting needed)

You don't need to deploy anywhere — just run the server on your own laptop and
punch a temporary hole to the internet with a free tunnel. This is the
easiest zero-cost option for a "share with 20-30 people for a few hours" use
case:

1. Start the app locally as above (`npm start`) — it listens on port 3000.
2. Install `cloudflared` (Cloudflare's tunnel client — free, no account or
   domain required for this):
   - macOS: `brew install cloudflared`
   - Windows: `winget install --id Cloudflare.cloudflared`
   - Linux: see https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
3. In a second terminal, run:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   It prints a random public URL like `https://random-words.trycloudflare.com`.
   Share that link with your friends — that's it, no signup, no cost.
4. When you're done, `Ctrl+C` both processes. The URL stops working
   immediately (nothing keeps running after you close your laptop).

This keeps working as long as your laptop stays on and awake — there's no
official session time limit on these "quick tunnels," but they're meant for
short-lived sharing exactly like this, not for leaving up for weeks.
(ngrok is the other well-known option, but its free tier was cut down in
2026 to 2-hour sessions and 1GB of bandwidth, so cloudflared is the better
free choice here.)

### Will it hold up for 20-30 people over a few hours?

- **The Node server itself:** yes, easily. Express handles far more than 30
  concurrent chatters on a single laptop-grade process. Login sessions are
  stored in memory, which is fine as long as the process keeps running —
  just don't restart the server mid-session or everyone gets logged out.
- **Groq's free tier:** it's generous but still rate-limited per minute/day.
  With 20-30 friends chatting at once you may occasionally hit that ceiling.
  `server.js` already queues outgoing requests and retries with backoff on
  429s, so people won't see hard failures — replies will just queue up and
  arrive a little slower during bursts.

### A couple of things worth doing before you share the link

- Change `SECRET_PHRASE` and `SESSION_SECRET` in `.env` to your own values.
- Consider adding a couple more demo accounts (or just let people register
  their own — the register form is already there) so you're not asking
  everyone to share the single `player` login.
- Everyone's chat happens through *your* machine and *your* Mistral key, so
  keep an eye on it while it's live, and stop the tunnel/server once you're
  done.

## Notes / things to harden before real deployment

- Replace the in-memory `users` Map with a real database.
- Set a strong, random `SESSION_SECRET` in `.env`.
- Put this behind HTTPS and set `cookie.secure = true` in `server.js`.
- Add rate limiting on `/api/chat` and `/api/login` to prevent abuse/brute force.
