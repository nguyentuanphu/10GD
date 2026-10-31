# Email recovery setup for 10GD

Code is prepared; real delivery requires your Resend account, a verified sender and Netlify runtime variables. Do not paste API keys in chat or commit them.

1. Create a Resend account and verify a domain you control, using the DNS records provided by Resend. Use a sender address under that verified domain. The shared testing sender is not suitable for recovery mail to arbitrary public users.
2. Create a Resend API key with sending permission for that domain. In the 10GD site's Netlify environment settings, add `RESEND_API_KEY` securely with Functions runtime scope.
3. Add `AUTH_EMAIL_FROM` as the verified sender (optionally including the display name “Bếp Gia Đình”). Set `AUTH_PUBLIC_URL` to `https://10gd.netlify.app` for the production recovery/verification link origin. No sender address or API key is invented by the application.
4. Deploy the reviewed application after owner approval. Verify delivery to a mailbox you control: register, save the one-time backup code, receive and open the email verification link, request a reset, open the reset link and change the password. Check spam/junk too. Confirm old password/session rejection and that the reset link cannot be reused.
5. Existing accounts have no automatically verified email. After login, open “Tài khoản & email”, enter the address and current password, then open the verification message. Until that completes, use the saved backup recovery code if needed.

If keys/sender are missing, email-reset requests report that recovery is temporarily unavailable. Registration can still succeed and displays the unsent verification state with a backup recovery code. A provider failure does not mark an address verified. Passwords are never included in messages. Verification is mailbox ownership confirmation, not an added second factor at each login.

The retired `FAMILY_PASSWORD` variable is no longer read. It can be removed from Netlify settings; existing account/household records are retained.
