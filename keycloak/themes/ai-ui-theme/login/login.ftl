<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Sign In — Talanted</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css"/>
</head>
<body>

<!-- Color bar -->
<div class="color-bar">
  <span style="background:#6366f1"></span>
  <span style="background:#818cf8"></span>
  <span style="background:#a855f7"></span>
  <span style="background:#c084fc"></span>
  <span style="background:#ec4899"></span>
</div>

<div class="page">

  <!-- ── Left panel: branding ── -->
  <div class="brand-panel">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
    <div class="deco-circle deco-1"></div>
    <div class="deco-circle deco-2"></div>

    <div class="brand-inner">
      <!-- Inline SVG logo — no external file needed -->
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

  <!-- ── Right panel: form ── -->
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
        <h2 class="form-title">Welcome back 👋</h2>
        <p class="form-subtitle">Sign in to your Talanted account and keep building.</p>
      </div>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <div class="alert alert-${message.type}">
          <span class="alert-icon">
            <#if message.type == 'error'>✕<#elseif message.type == 'success'>✓<#else>ℹ</#if>
          </span>
          <span>${kcSanitize(message.summary)?no_esc}</span>
        </div>
      </#if>

      <form action="${url.loginAction}" method="post" class="login-form">

        <input type="hidden" id="id-hidden-input" name="credentialId"
               <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

        <div class="field-group">
          <label class="field-label" for="username">Username or email</label>
          <input
            class="field-input <#if messagesPerField.existsError('username','password')>field-error</#if>"
            tabindex="1"
            id="username"
            name="username"
            type="text"
            value="${(login.username!'')}"
            autofocus
            autocomplete="username"
            placeholder="you@example.com"
          />
        </div>

        <div class="field-group">
          <label class="field-label" for="password">Password</label>
          <div class="password-wrapper">
            <input
              class="field-input <#if messagesPerField.existsError('username','password')>field-error</#if>"
              tabindex="2"
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
            />
          </div>
        </div>

        <#if realm.rememberMe && !usernameEditDisabled??>
          <div class="remember-row">
            <label class="remember-label">
              <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"
                     <#if login.rememberMe??>checked</#if>/>
              <span>Remember me</span>
            </label>
          </div>
        </#if>

        <button tabindex="4" type="submit" class="btn-submit">
          Sign In
          <span class="btn-arrow">→</span>
        </button>

        <#if realm.resetPasswordAllowed>
          <div class="forgot-row">
            <a href="${url.loginResetCredentialsUrl}" class="forgot-link">Forgot password?</a>
          </div>
        </#if>

      </form>

      <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
        <div class="register-row">
          <span>Don't have an account?</span>
          <a href="${url.registrationUrl}" class="register-link">Create one</a>
        </div>
      </#if>

    </div>
  </div>

</div>

</body>
</html>
