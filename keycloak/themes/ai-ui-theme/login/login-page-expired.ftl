<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Session Expired — AI UI Generator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css"/>
</head>
<body>

<div class="page">

  <div class="brand-panel">
    <div class="brand-inner">
      <div class="brand-icon">✦</div>
      <h1 class="brand-name">AI UI Generator</h1>
      <p class="brand-tagline">Describe your idea. Get a working interface.</p>
      <ul class="feature-list">
        <li><span class="feature-dot"></span>Natural language to UI in seconds</li>
        <li><span class="feature-dot"></span>React, HTML/CSS, Tailwind output</li>
        <li><span class="feature-dot"></span>Live preview &amp; code editor</li>
        <li><span class="feature-dot"></span>Download as ZIP</li>
      </ul>
      <div class="brand-badge">Powered by Gemini AI</div>
    </div>
  </div>

  <div class="form-panel">
    <div class="form-card">

      <div class="form-header">
        <div class="expired-icon">⏱</div>
        <h2 class="form-title">Session expired</h2>
        <p class="form-subtitle">Your login session has timed out.<br/>Please start again or continue where you left off.</p>
      </div>

      <div class="register-row" style="margin-top: 28px; flex-direction: column; gap: 12px;">
        <a href="${url.loginRestartFlowUrl}" class="btn-submit" style="text-decoration: none; text-align: center;">
          Restart sign in
          <span class="btn-arrow">→</span>
        </a>
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span>Already started?</span>
          <a href="${url.loginContinueFlowUrl}" class="register-link">Continue</a>
        </div>
      </div>

    </div>
  </div>

</div>

</body>
</html>
