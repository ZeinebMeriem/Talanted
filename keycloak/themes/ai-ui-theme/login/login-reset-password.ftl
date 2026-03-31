<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Reset Password — Talan UI Generator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Arvo:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css"/>
</head>
<body>

<!-- Color bar -->
<div class="color-bar">
  <span style="background:#5480ba"></span>
  <span style="background:#8f9424"></span>
  <span style="background:#e04580"></span>
  <span style="background:#6b367d"></span>
  <span style="background:#1d662e"></span>
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
      <div class="brand-logo">
        <img src="${url.resourcesPath}/img/talan-logo.svg" alt="Talan" style="height:42px;" />
      </div>

      <div class="brand-eyebrow">Internal Tool</div>

      <h1 class="brand-name">Build UIs from<br/>a single prompt</h1>
      <p class="brand-tagline">Describe your interface or upload a document — our AI pipeline generates production-ready React code instantly.</p>

      <ul class="feature-list">
        <li><span class="feature-dot"></span>Natural language to UI in seconds</li>
        <li><span class="feature-dot"></span>React + Tailwind production-ready code</li>
        <li><span class="feature-dot"></span>Live preview &amp; version history</li>
        <li><span class="feature-dot"></span>Document upload — PDF, image, wireframe</li>
      </ul>

      <div class="brand-badge">Powered by AI</div>
    </div>
  </div>

  <!-- ── Right panel: form ── -->
  <div class="form-panel">
    <div class="form-card">

      <div class="form-header">
        <div class="form-logo">
          <img src="${url.resourcesPath}/img/talan-logo.svg" alt="Talan" style="height:34px;" />
        </div>
        <h2 class="form-title">Reset password</h2>
        <p class="form-subtitle">Enter your email and we'll send you a reset link.</p>
      </div>

      <#if message?has_content>
        <div class="alert alert-${message.type}">
          <span class="alert-icon">
            <#if message.type == 'error'>✕<#elseif message.type == 'success'>✓<#else>ℹ</#if>
          </span>
          <span>${kcSanitize(message.summary)?no_esc}</span>
        </div>
      </#if>

      <form action="${url.loginAction}" method="post" class="login-form">

        <div class="field-group">
          <label class="field-label" for="username">Username or email</label>
          <input
            class="field-input"
            tabindex="1"
            id="username"
            name="username"
            type="text"
            value="${(auth.attemptedUsername!'')}"
            autofocus
            autocomplete="username"
            placeholder="you@example.com"
          />
        </div>

        <button tabindex="2" type="submit" class="btn-submit">
          Send Reset Link
          <span class="btn-arrow">→</span>
        </button>

      </form>

      <div class="register-row">
        <span>Remember your password?</span>
        <a href="${url.loginUrl}" class="register-link">Back to sign in</a>
      </div>

    </div>
  </div>

</div>

</body>
</html>
