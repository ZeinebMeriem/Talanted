<#assign requiredActions = []>
<#if requiredActions?has_content></#if>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Reset your password — AI UI Generator</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:14px 20px;text-align:center;">
                    <span style="font-size:22px;color:#ffffff;font-weight:800;letter-spacing:-0.5px;">✦ AI UI Generator</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(99,102,241,0.10);overflow:hidden;">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa);height:4px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:48px 48px 40px;">

                    <!-- Icon -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:50%;width:64px;height:64px;text-align:center;vertical-align:middle;">
                          <span style="font-size:28px;line-height:64px;">🔐</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e1b4b;letter-spacing:-0.3px;">Reset your password</p>
                    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Hi <strong style="color:#4338ca;">${user.firstName!user.username}</strong>,<br/>
                      Someone requested a password reset for your <strong>AI UI Generator</strong> account. If this was you, click the button below.
                    </p>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;">
                          <a href="${link}"
                             style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                            Reset my password &nbsp;→
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Expiry notice -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
                          <p style="margin:0;font-size:13px;color:#92400e;">
                            ⏱ &nbsp;This link expires in <strong>${linkExpirationFormatter(linkExpiry)}</strong>. After that, you'll need to request a new one.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link -->
                    <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="margin:0 0 32px;font-size:12px;word-break:break-all;">
                      <a href="${link}" style="color:#6366f1;text-decoration:none;">${link}</a>
                    </p>

                    <!-- Not you -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#f9fafb;border-radius:10px;padding:16px 18px;">
                          <p style="margin:0;font-size:13px;color:#6b7280;">
                            🛡 &nbsp;<strong>Didn't request this?</strong> Ignore this email — your password won't change and your account is safe.
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">AI UI Generator &nbsp;·&nbsp; Powered by Gemini AI</p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">This email was sent automatically. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
