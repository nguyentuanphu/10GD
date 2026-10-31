# Optional password-reset email with Resend

The website and account creation work without mail configuration. Email is optional at sign-up, and no user-verification email is sent. A supplied address receives mail only when password recovery is requested. The reset link is random, expires after 15 minutes and can be used once. Keep the one-time backup recovery code too.

For real reset delivery:

1. Create a Resend account and verify a sending domain you control, using Resend's DNS records. This provider/sender requirement is separate from end-user verification. The shared testing sender cannot support arbitrary public recipients.
2. Add `RESEND_API_KEY` securely in the 10GD Netlify site's Functions runtime settings, with sending permission for that domain. Do not paste keys in chat or commit them.
3. Set `AUTH_EMAIL_FROM` to an address under the verified sending domain and `AUTH_PUBLIC_URL` to `https://10gd.netlify.app`.
4. Deploy the specifically reviewed release after owner approval. Test with an account and mailbox you control: register without a verification step, request a reset, open the emailed link, change the password and verify that the old password/session/link no longer works.

Existing users can save/change/remove a recovery address in Account & family using their current password. Use an address you own and check it carefully. No address confirmation is required before using the site or account. If mail is unconfigured, only email-reset requests report temporary unavailability; device tools, sign-up and backup-code recovery remain usable. No 2FA has been added.

Guest data stays in the current browser and can be backed up manually. Cloud storage/sync belongs to a selected account/family workspace; creating an account alone does not silently upload or merge guest work.

The retired `FAMILY_PASSWORD` variable is no longer read. Existing account/household data is retained.
