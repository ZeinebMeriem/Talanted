<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Info — Talanted</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; min-height: 100vh; display: flex; flex-direction: column; }

    /* ── Top nav ── */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 13px 36px; border-bottom: 1px solid #e5e7eb;
      background: #fff; position: sticky; top: 0; z-index: 20;
    }
    .back-btn {
      display: inline-flex; align-items: center; gap: 7px;
      color: #374151; font-size: 13px; font-weight: 500;
      background: none; border: none; cursor: pointer;
      font-family: 'Inter', sans-serif; text-decoration: none;
      transition: color 0.15s;
    }
    .back-btn:hover { color: #111; }
    .topbar-signin {
      padding: 7px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; background: #111827; border: 1.5px solid #111827;
      color: #fff; font-family: 'Inter', sans-serif; text-decoration: none;
      transition: background 0.15s;
    }
    .topbar-signin:hover { background: #1f2937; }

    /* ── Dark body ── */
    .dark-body {
      flex: 1;
      background: radial-gradient(ellipse at 50% 40%, #0f1528 0%, #070b19 70%);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 40px 16px;
    }

    /* ── Brand ── */
    .brand-row {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; margin-bottom: 32px; user-select: none;
    }
    .brand-name {
      font-size: 34px; font-weight: 700; letter-spacing: -0.02em;
      color: #fff; font-family: 'Space Grotesk', sans-serif;
    }
    .brand-dash {
      width: 28px; height: 6px; background: #7c3aed;
      border-radius: 2px; margin-top: 14px; flex-shrink: 0;
    }

    /* ── Card ── */
    .card {
      width: 100%; max-width: 520px;
      background: #1e2640;
      border-radius: 8px;
      border: 1px solid rgba(71,85,105,0.5);
      padding: 40px 48px;
      box-shadow: 0 20px 50px rgba(2,4,10,0.5);
      text-align: center;
    }

    .card-icon { font-size: 40px; margin-bottom: 16px; display: block; }

    .card-title {
      font-size: 28px; font-weight: 600; letter-spacing: -0.02em;
      color: #fff; margin-bottom: 12px;
      font-family: 'Space Grotesk', sans-serif;
    }

    .card-msg {
      font-size: 14px; color: #cbd5e1; line-height: 1.65; margin-bottom: 32px;
    }

    /* ── Alert ── */
    .alert-info {
      padding: 12px 16px; margin-bottom: 28px;
      background: rgba(71,85,105,0.25);
      border: 1px solid rgba(71,85,105,0.5);
      border-radius: 6px;
      color: #cbd5e1; font-size: 13px; line-height: 1.5;
      text-align: left;
    }
    .alert-success {
      padding: 12px 16px; margin-bottom: 28px;
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 6px;
      color: #6ee7b7; font-size: 13px; line-height: 1.5;
      text-align: left;
    }
    .alert-error {
      padding: 12px 16px; margin-bottom: 28px;
      background: rgba(120,53,15,0.2);
      border: 1px solid #92400e;
      border-radius: 6px;
      color: #fde68a; font-size: 13px; line-height: 1.5;
      text-align: left;
    }

    /* ── Button ── */
    .btn-signin {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 14px;
      background: #7c3aed; color: #fff; border: none;
      border-radius: 6px; font-size: 15px; font-weight: 700;
      cursor: pointer; font-family: 'Inter', sans-serif;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(124,58,237,0.35);
      transition: background 0.15s;
    }
    .btn-signin:hover { background: #6c26d8; }

    /* ── Below-card link ── */
    .below-link {
      margin-top: 24px; font-size: 13px; color: #64748b;
      text-align: center;
    }
    .below-link a {
      color: #7c3aed; font-weight: 700; text-decoration: none;
    }
    .below-link a:hover { text-decoration: underline; }
  </style>
</head>
<body>

  <#-- Always use the configured frontend URL from theme.properties -->
  <#assign frontendBase = properties.frontendUrl!'http://localhost:5173'>

  <#-- Always open sign-in form; add login_hint with email if available -->
  <#if user?? && (user.email!'')?has_content>
    <#assign signInHref = frontendBase + "?auth=login&login_hint=" + (user.email)?url>
  <#else>
    <#assign signInHref = frontendBase + "?auth=login">
  </#if>

  <!-- Top nav -->
  <div class="topbar">
    <a class="back-btn" href="${frontendBase}">
      ← Back to home
    </a>
    <a class="topbar-signin" href="${signInHref}">Sign in</a>
  </div>

  <!-- Dark body -->
  <div class="dark-body">
    <div style="width:100%;max-width:520px;">

      <!-- Brand -->
      <div class="brand-row">
        <span class="brand-name">Talanted</span>
        <span class="brand-dash"></span>
      </div>

      <!-- Card -->
      <div class="card">

        <#if message?has_content && message.type == 'success'>
          <h1 class="card-title">Email verified!</h1>
          <p class="card-msg">Your email address has been confirmed.<br/>Your account is active and ready to use.</p>
          <div class="alert-success">
            ${kcSanitize(message.summary)?no_esc}
          </div>
        <#elseif message?has_content && message.type == 'error'>
          <h1 class="card-title">Something went wrong</h1>
          <p class="card-msg">There was an issue processing your request.</p>
          <div class="alert-error">
            ${kcSanitize(message.summary)?no_esc}
          </div>
        <#else>
          <h1 class="card-title">Account notice</h1>
          <p class="card-msg">Here's a status update for your account.</p>
          <#if message?has_content>
            <div class="alert-info">
              ${kcSanitize(message.summary)?no_esc}
            </div>
          </#if>
        </#if>

        <a class="btn-signin" href="${signInHref}">
          Go to Sign In →
        </a>

      </div>

      <div class="below-link">
        Don't have an account? <a href="${url.registrationUrl!url.loginUrl}">Sign Up</a>
      </div>

    </div>
  </div>

</body>
</html>
