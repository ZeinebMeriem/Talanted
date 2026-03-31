<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Verify Email — Talan UI Generator</title>
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

  <!-- ── Right panel ── -->
  <div class="form-panel">
    <div class="form-card">

      <div class="form-header">
        <div class="verify-icon">✉</div>
        <h2 class="form-title">Check your email</h2>
        <p class="form-subtitle">
          A verification link has been sent to<br/>
          <strong style="color: #5480ba;">${(user.email!'your email')}</strong>
        </p>
      </div>

      <div class="verify-info">
        <p>Click the link in the email to activate your account. If you don't see it, check your spam folder.</p>
      </div>

      <div class="register-row" style="margin-top: 28px; flex-direction: column; gap: 12px;">
        <a href="${url.loginAction}" class="btn-submit" style="text-decoration: none; text-align: center;">
          Resend verification email
        </a>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>Wrong account?</span>
          <a href="${url.loginUrl}" class="register-link">Back to sign in</a>
        </div>
      </div>

    </div>
  </div>

</div>

</body>
</html>
