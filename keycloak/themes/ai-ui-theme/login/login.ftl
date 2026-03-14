<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Sign In — AI UI Generator</title>
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

  <!-- ── Right panel: form ── -->
  <div class="form-panel">
    <div class="form-card">

      <div class="form-header">
        <div class="form-logo">✦</div>
        <h2 class="form-title">Welcome back</h2>
        <p class="form-subtitle">Sign in to your account to continue</p>
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
