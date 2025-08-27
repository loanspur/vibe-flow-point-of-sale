You are reviewing the repo at ./ (vibe-flow-point-of-sale). Tech: Vite + TypeScript + React + shadcn-ui + Tailwind + Supabase (DB/Auth). We use Resend for invite emails. Symptom: “Invite new user” triggers but email fails to send via Resend even though API keys are configured.

GOAL
- Make the “Invite user” flow reliable. If Resend fails, we should surface a precise error, log it, and gracefully fall back (to console transport or Supabase email if configured), so the UI never gets stuck in a false “sent” state.

WHAT TO DO (step-by-step)
1) Locate the invite/email flow:
   - Search for files/functions containing: resend, sendEmail, invite, invitation, mail, email, magic link, supabase.auth.admin.inviteUserByEmail, createClient, API routes/edge functions/serverless handlers.
   - Identify the single entry point when I click “Invite” in the UI (component + handler + API/server code).

2) Validate environment & config:
   - List all env vars referenced for email: RESEND_API_KEY, RESEND_FROM (must be a verified domain sender), RESEND_BCC/CC (if any), APP_BASE_URL, SUPABASE_*.
   - Add a runtime guard that throws a descriptive error if RESEND_API_KEY or RESEND_FROM are missing/blank.

3) Harden the Resend integration:
   - Wrap the Resend call in try/catch and log the FULL error object (status, name/code, message, response body). Do not swallow errors.
   - After calling Resend.emails.send, check the returned object: id, error fields, and HTTP status if exposed. If there’s an error, return it to the client in a typed error payload.
   - Ensure the From header uses a verified sender (e.g., "VibePOS <no-reply@YOUR_VERIFIED_DOMAIN>") and reply_to if needed. Validate the to: email is RFC5322-safe.
   - Add a tiny retry (exponential backoff: 3 attempts, 200ms/600ms/1200ms) only on transient status codes (429/5xx).

4) Add a pluggable mail adapter:
   - Create an interface Mailer { sendInvite(params): Promise<MailerResult> } with implementations:
     a) ResendMailer (default in production)
     b) ConsoleMailer (development/test fallback; logs the email payload instead of sending)
     c) (Optional) SupabaseInviteMailer: uses supabase.auth.admin.inviteUserByEmail if that’s our intended behavior
   - Choose adapter via NODE_ENV or EMAIL_DRIVER env (RESEND | CONSOLE | SUPABASE).

5) Improve the UI/UX around invite:
   - In the invite modal/form submit:
     - Disable the submit button during the request; show a spinner/loading state.
     - On success, show a distinct success toast with the recipient email.
     - On failure, show a toast with the exact error.short (e.g., "Resend: 403 – domain not verified") and a “Copy details” button that copies the full error JSON to clipboard.
   - Prevent the “changes may not be saved” browser alert by ensuring we’re not navigating/re-rendering modals incorrectly after submit; confirm controlled modal state resets only after a successful send.

6) Add structured logging:
   - Create a utilities/logger (console + levels). Log requestId, userId (if available), email, template id, driver, and the result (success/error).
   - Ensure no secrets (API keys) are logged.

7) Create a minimal test harness:
   - Add a simple script (e.g., scripts/test-invite.ts or an API route /api/dev/test-invite) that sends a test email to a SAFE non-customer address when EMAIL_DRIVER=CONSOLE and prints the rendered payload.
   - Add a Playwright/Vitest test that mocks the mail adapter and asserts:
     - Success path updates UI state.
     - Error path shows error toast and does NOT close the modal prematurely.

8) Common Resend pitfalls to check (code assertions + README notes):
   - RESEND_FROM must be a domain/address verified in Resend; fail early if not matching a verified sender.
   - If using templates, confirm template exists; if using HTML, ensure minimal valid HTML; no dangerous inline scripts.
   - Avoid empty subject or from; set a default subject like “You’re invited to VibePOS”.
   - If we generate magic links, ensure APP_BASE_URL and Supabase redirect URLs are correct and whitelisted.

9) Produce diffs:
   - Implement the adapter, retries, error surfacing, and UI improvements.
   - Add a README “Email Setup” section listing required env vars, verified sender steps, and how to switch drivers.
   - Output a final patch diff of all changed files.

ACCEPTANCE CRITERIA
- When “Invite” is clicked with valid env + verified sender: success toast appears; Resend returns an id; UI closes modal only on success.
- On failure (e.g., 403/422/429/5xx): a visible error toast with the short reason appears; modal remains open; console/log shows full structured error; no infinite modal reopen or unsaved-changes alert.
- With EMAIL_DRIVER=CONSOLE: the email payload prints to console and success toast appears, allowing manual verification in dev.
- A Playwright/Vitest test demonstrates both success and failure flows.

Now scan the repo, implement all of the above, and show me the complete diffs + any key code snippets changed (mailer adapter, API handler, UI component).
