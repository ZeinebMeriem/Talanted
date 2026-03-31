<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Create Account — Talan UI Generator</title>
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
      <p class="brand-tagline">Join and start generating production-ready interfaces from natural language or documents.</p>

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
        <h2 class="form-title">Create your account</h2>
        <p class="form-subtitle">Start generating interfaces from text or documents.</p>
      </div>

      <#if message?has_content>
        <div class="alert alert-${message.type}">
          <span class="alert-icon">
            <#if message.type == 'error'>✕<#elseif message.type == 'success'>✓<#else>ℹ</#if>
          </span>
          <span>${kcSanitize(message.summary)?no_esc}</span>
        </div>
      </#if>

      <form action="${url.registrationAction}" method="post" class="login-form">

        <div class="field-row">
          <div class="field-group">
            <label class="field-label" for="firstName">First name</label>
            <input
              class="field-input <#if messagesPerField.existsError('firstName')>field-error</#if>"
              id="firstName" name="firstName" type="text"
              value="${(register.formData.firstName!'')}"
              placeholder="Meriem"
              autocomplete="given-name"
            />
          </div>
          <div class="field-group">
            <label class="field-label" for="lastName">Last name</label>
            <input
              class="field-input <#if messagesPerField.existsError('lastName')>field-error</#if>"
              id="lastName" name="lastName" type="text"
              value="${(register.formData.lastName!'')}"
              placeholder="Boukraa"
              autocomplete="family-name"
            />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label" for="email">Email</label>
          <input
            class="field-input <#if messagesPerField.existsError('email')>field-error</#if>"
            id="email" name="email" type="email"
            value="${(register.formData.email!'')}"
            placeholder="you@example.com"
            autocomplete="email"
          />
        </div>

        <#if !realm.registrationEmailAsUsername>
          <div class="field-group">
            <label class="field-label" for="username">Username</label>
            <input
              class="field-input <#if messagesPerField.existsError('username')>field-error</#if>"
              id="username" name="username" type="text"
              value="${(register.formData.username!'')}"
              placeholder="your_username"
              autocomplete="username"
            />
          </div>
        </#if>

        <div class="field-group">
          <label class="field-label" for="password">Password</label>
          <input
            class="field-input <#if messagesPerField.existsError('password','password-confirm')>field-error</#if>"
            id="password" name="password" type="password"
            placeholder="••••••••"
            autocomplete="new-password"
          />
        </div>

        <div class="field-group">
          <label class="field-label" for="password-confirm">Confirm password</label>
          <input
            class="field-input <#if messagesPerField.existsError('password-confirm')>field-error</#if>"
            id="password-confirm" name="password-confirm" type="password"
            placeholder="••••••••"
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="btn-submit">
          Create Account
          <span class="btn-arrow">→</span>
        </button>

      </form>

      <div class="register-row">
        <span>Already have an account?</span>
        <a href="${url.loginUrl}" class="register-link">Sign in</a>
      </div>

    </div>
  </div>

</div>

</body>
</html>
