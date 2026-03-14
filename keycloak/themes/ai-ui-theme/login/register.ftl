<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Create Account — AI UI Generator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css"/>
</head>
<body>

<div class="page">

  <!-- ── Left panel: branding ── -->
  <div class="brand-panel">
    <div class="brand-inner">
      <div class="brand-icon">✦</div>
      <h1 class="brand-name">AI UI Generator</h1>
      <p class="brand-tagline">Join and start building beautiful interfaces with AI.</p>

      <ul class="feature-list">
        <li><span class="feature-dot"></span>Natural language to UI in seconds</li>
        <li><span class="feature-dot"></span>React, HTML/CSS, Tailwind output</li>
        <li><span class="feature-dot"></span>Live preview &amp; code editor</li>
        <li><span class="feature-dot"></span>Download as ZIP</li>
      </ul>

      <div class="brand-badge">Powered by Gemini AI</div>
    </div>
  </div>

  <!-- ── Right panel: form ── -->
  <div class="form-panel">
    <div class="form-card">

      <div class="form-header">
        <div class="form-logo">✦</div>
        <h2 class="form-title">Create account</h2>
        <p class="form-subtitle">Fill in your details to get started</p>
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
