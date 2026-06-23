<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Session Expired — Talanted</title>
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
        <div class="expired-icon">⏱</div>
        <h2 class="form-title">Session expired</h2>
        <p class="form-subtitle">Your login session has timed out.<br/>Please start again or continue where you left off.</p>
      </div>

      <div class="register-row" style="margin-top:28px;flex-direction:column;gap:12px;">
        <a href="${url.loginRestartFlowUrl!''}" class="btn-submit" style="text-decoration:none;text-align:center;">
          Restart sign in
          <span class="btn-arrow">→</span>
        </a>
        <#if url.loginContinueFlowUrl?has_content>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
          <span>Already started?</span>
          <a href="${url.loginContinueFlowUrl}" class="register-link">Continue</a>
        </div>
        </#if>
      </div>

    </div>
  </div>

</div>

</body>
</html>
