You are reviewing the repo at ./ (vibe-flow-point-of-sale). This app is deployed on DigitalOcean App Platform. Build is failing with npm ci and prints generic “npm error Options:” help text. Logs also oddly mention Heroku help URLs. We must: (1) make DigitalOcean build succeed reliably, (2) KEEP the existing email system exactly as is (no new mail adapters), only fix misconfig/handling so invites work, (3) produce minimal diffs.

CONTEXT / SYMPTOM
- DigitalOcean build fails around “npm ci”. The log shows a generic npm help printout (likely caused by an invalid flag, unsupported npm version, or a script exiting with the wrong status).
- We previously set up invite emails via the current system (Resend). API keys are configured, but emails fail in production. We will NOT introduce a new driver—only ensure the current implementation works with proper env, sender, and error reporting.

GOALS
A) Pass DigitalOcean build consistently.
B) Use the existing invite email flow (Resend) with no architectural change, just correctness:
   - Fail early if env is missing.
   - Use a verified sender/from.
   - Return & show precise error messages in UI.
   - Do NOT add new adapters, transports, or 3rd-party services.

STEP-BY-STEP CHANGES

[1] LOCKFILE & ENGINES
- Inspect package.json and package-lock.json for mismatches:
  - Ensure package-lock.json is present, V2+ if npm 7+ is used. If engines.node is declared, match it to a stable LTS (e.g., ">=18 <19" or exact "18.x").
  - Add `"engines": { "node": "18.x", "npm": "9.x" }` to package.json (adjust to what the project actually supports).
  - If lockfile was generated on a different major npm than the one in the build env, bump the lockfile by running `npm i --package-lock-only` locally and committing.
- Confirm no stray flags in .npmrc that break npm ci on CI (remove deprecated config there).

[2] SCRIPTS SANITY
- In package.json scripts:
  - Keep only the scripts needed by App Platform:
    - "build": Vite build for production
    - "start": a proper production start (e.g., serve build OR node server entry)
  - If there is a "prepare" (husky) or "postinstall" script that runs dev-only tools, guard them:
    - Either remove them or make them conditional: skip on CI (e.g., `if [ "$CI" != "true" ]; then husky install; fi`).
- Ensure “build” does not rely on dev-only env variables that are missing in DO.

[3] DIGITALOCEAN APP PLATFORM SETTINGS (Docker or Runtime)
- If we use a Dockerfile:
  - Ensure the Dockerfile uses a Node 18 base, sets `ENV CI=true`, and runs:
    RUN npm ci
    RUN npm run build
    CMD ["npm","run","start"]
  - If peer dep issues exist, allow a fallback:
    RUN npm ci || npm ci --legacy-peer-deps
  - Avoid caching node_modules across stages incorrectly.
- If we’re using DO’s Node runtime (no Dockerfile):
  - Ensure Node version via "engines" field.
  - Ensure "build command" is `npm ci && npm run build`.
  - Ensure "run command" matches package.json "start".
  - Set NPM_CONFIG_LOGLEVEL=warn (optional). Do not pass odd flags to npm.

[4] REMOVE HEROKU-SPECIFIC ARTIFACTS
- Search the repo for Procfile, app.json, or Heroku-specific buildpack configs.
- If a Procfile exists, keep it if harmless, but make sure DO config is not trying to use Heroku buildpacks. Add a README note that DO uses Node runtime or Docker, not Heroku buildpacks.

[5] VITE / ENV VARIABLES
- Verify Vite build uses only `VITE_*` env vars at build time. If the code references non-VITE vars in client code, inline them via import.meta.env.VITE_...
- Ensure DO App Platform has the required env vars set for build and runtime. Document which are BUILD-TIME vs RUNTIME.

[6] KEEP EXISTING EMAIL FLOW (RESEND)
- Do NOT introduce a new mail system. Keep current Resend usage.
- Add minimal guards ONLY:
  - At the server/API edge where the email is sent:
    - Before calling Resend, assert RESEND_API_KEY and RESEND_FROM are non-empty. If missing, throw a descriptive 500 with `"Resend misconfig: RESEND_API_KEY/RESEND_FROM missing"`.
    - Ensure FROM header matches a verified sender (domain already verified in Resend).
  - Wrap the send call in try/catch and return the exact Resend error (status/code/message) to the client; do not swallow errors.
  - Don’t add retries/adapters; keep behavior identical aside from accurate errors.

[7] UI ERROR SURFACING (SMALL CHANGE)
- In the invite modal submit handler:
  - Disable the button while awaiting.
  - On error, show toast: `Invite failed: <short error, e.g., "Resend 403: domain not verified">`.
  - Keep the modal open on failure.
  - On success, show toast and close modal.
- This does not change email system; it only exposes the current system’s real error.

[8] CI REPRO / LOCAL CHECK
- Add a lightweight script "ci:build" in package.json that mirrors DO build:
  - "ci:build": "npm ci && npm run build"
- Run locally to ensure it mirrors DO behavior.
- If peerDeps conflicts are unavoidable, document `npm ci --legacy-peer-deps` as a fallback, but prefer fixing versions in package.json.

[9] OUTPUT
- Implement the minimum edits:
  - package.json ("engines", scripts cleanup, optional "ci:build")
  - Remove/guard postinstall/prepare that break CI
  - Server/API file for email: add guards + precise error return
  - Invite UI: disable/enable + error toast
  - README: small “DigitalOcean deploy” notes: Node version, build/start commands, required env vars; “Email setup” notes (verified sender).
- Produce a final patch diff of all files you changed.

ACCEPTANCE CRITERIA
- DigitalOcean build succeeds with Node 18 LTS and `npm ci && npm run build` (or Dockerfile equivalent).
- No Heroku buildpack assumptions in the DO pipeline.
- The invite flow uses the same existing Resend integration; if env/sender is wrong it shows a clear error; if correct, it sends and the UI confirms success.
- No new email adapters or alternate providers added.
- One-command local check: `npm run ci:build` passes.

Now:
1) Scan the repo for the places described.
2) Make the minimal changes above.
3) Show me the complete diffs and a short note explaining what caused the npm ci failure and how we fixed it.
