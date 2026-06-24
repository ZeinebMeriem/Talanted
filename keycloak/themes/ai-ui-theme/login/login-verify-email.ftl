<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Verify Email — Talanted</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css"/>
</head>
<body>

<div class="color-bar">
  <span style="background:#6366f1"></span>
  <span style="background:#818cf8"></span>
  <span style="background:#a855f7"></span>
  <span style="background:#c084fc"></span>
  <span style="background:#ec4899"></span>
</div>

<div class="page">

  <div class="brand-panel">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
    <div class="deco-circle deco-1"></div>
    <div class="deco-circle deco-2"></div>

    <div class="brand-inner">
      <div class="brand-logo">
        <svg width="40" height="40" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#6366f1"/>
              <stop offset="100%" stop-color="#a855f7"/>
            </linearGradient>
          </defs>
          <rect width="44" height="44" rx="12" fill="url(#lg1)"/>
          <rect x="8" y="13" width="28" height="5" rx="2.5" fill="white"/>
          <rect x="19.5" y="13" width="5" height="22" rx="2.5" fill="white"/>
          <circle cx="38" cy="8" r="5" fill="#f0abfc"/>
          <circle cx="38" cy="8" r="2.5" fill="white" opacity="0.8"/>
        </svg>
        <span class="brand-logo-wordmark">Talanted</span>
      </div>

      <div class="brand-eyebrow">AI-Powered Platform</div>

      <h1 class="brand-name">
        Turn ideas into<br/>
        <span class="accent">production UI instantly</span>
      </h1>

      <p class="brand-tagline">
        Describe your interface or upload a wireframe —
        <strong>Talanted</strong> generates clean, production-ready React code in seconds.
      </p>

      <ul class="feature-list">
        <li><span class="feature-dot"></span>Natural language to UI in seconds</li>
        <li><span class="feature-dot"></span>React + Tailwind production-ready code</li>
        <li><span class="feature-dot"></span>Live preview &amp; version history</li>
        <li><span class="feature-dot"></span>Document upload — PDF, image, wireframe</li>
        <li><span class="feature-dot"></span>Push to GitLab &amp; export as ZIP</li>
      </ul>

      <div class="brand-badge">✨ Talanted Platform</div>
    </div>
  </div>

  <div class="form-panel">
    <div class="form-card">

      <div class="form-header">
        <div class="form-logo">
          <svg width="32" height="32" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#a855f7"/>
              </linearGradient>
            </defs>
            <rect width="44" height="44" rx="12" fill="url(#lg2)"/>
            <rect x="8" y="13" width="28" height="5" rx="2.5" fill="white"/>
            <rect x="19.5" y="13" width="5" height="22" rx="2.5" fill="white"/>
            <circle cx="38" cy="8" r="5" fill="#f0abfc"/>
            <circle cx="38" cy="8" r="2.5" fill="white" opacity="0.8"/>
          </svg>
          <span class="form-logo-wordmark">Talanted</span>
        </div>

        <#if actionTokenContext??>
          <h2 class="form-title">Confirm your email ✉️</h2>
          <p class="form-subtitle">
            Click the button below to verify<br/>
            <strong style="color:#818cf8;">${(user.email!'your email address')}</strong>
          </p>
        <#else>
          <h2 class="form-title">Check your inbox ✉️</h2>
          <p class="form-subtitle">
            A verification link was sent to<br/>
            <strong style="color:#818cf8;">${(user.email!'your email address')}</strong>
          </p>
        </#if>
      </div>

      <#if message?has_content>
        <div class="alert alert-${message.type}">
          <span class="alert-icon">
            <#if message.type == 'error'>✕<#elseif message.type == 'success'>✓<#else>ℹ</#if>
          </span>
          <span>${kcSanitize(message.summary)?no_esc}</span>
        </div>
      </#if>

      <#if actionTokenContext??>
        <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:24px;">
          Click the button below to confirm your email address and activate your account.
        </p>
        <a href="${url.loginAction}" class="btn-submit" style="display:flex;align-items:center;justify-content:center;text-decoration:none;">
          Verify my email address
          <span class="btn-arrow">→</span>
        </a>
      <#else>
        <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:24px;">
          Didn't receive the email? Check your spam folder or resend it below.
        </p>
        <form action="${url.loginAction}" method="post" class="login-form">
          <button type="submit" class="btn-submit">
            Resend verification email
            <span class="btn-arrow">→</span>
          </button>
        </form>
      </#if>

      <div class="register-row" style="margin-top:16px;">
        <span>Already verified?</span>
        <a href="${url.loginUrl}" class="register-link">Back to sign in</a>
      </div>

    </div>
  </div>

</div>

</body>
</html>
