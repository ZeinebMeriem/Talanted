<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Sign In — Talanted</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css"/>
</head>
<body>

<div class="auth-root">

  <!-- ── Left decorative panel ── -->
  <div class="auth-left">
    <div class="auth-left-grid"></div>
    <div class="auth-left-blob" style="width:320px;height:320px;background:#019cda;top:-80px;right:-80px;"></div>
    <div class="auth-left-blob" style="width:200px;height:200px;background:#0d6fa3;bottom:100px;left:-60px;"></div>

    <!-- Brand -->
    <div class="auth-brand">
      <div class="auth-brand-dot"></div>
      Talanted
    </div>

    <!-- Hero -->
    <div class="auth-hero">
      <div class="auth-hero-tag">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI-Powered Platform
      </div>
      <h2>Turn ideas into<br/>production UI instantly.</h2>
      <p>
        Describe your interface or upload a wireframe —
        Talanted generates clean, production-ready React code in seconds.
      </p>
      <div class="auth-features">
        <div class="auth-feature">
          <div class="auth-feature-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          Natural language to UI in seconds
        </div>
        <div class="auth-feature">
          <div class="auth-feature-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
          </div>
          React + Tailwind production-ready code
        </div>
        <div class="auth-feature">
          <div class="auth-feature-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          </div>
          Live preview &amp; version history
        </div>
        <div class="auth-feature">
          <div class="auth-feature-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          </div>
          Push to GitLab &amp; export as ZIP
        </div>
      </div>
    </div>

    <!-- Testimonial -->
    <div class="auth-testimonial">
      <p>"Talanted completely changed how I build UIs. My team ships 3&#xD7; faster now."</p>
      <div class="auth-testimonial-author">
        <div class="auth-avatar">S</div>
        <div>
          <div class="auth-testimonial-name">Sofia Reyes</div>
          <div class="auth-testimonial-role">Senior Product Designer</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Right form panel ── -->
  <div class="auth-right">
    <div class="auth-card">

      <div class="auth-card-header">
        <h1>Sign in</h1>
        <p>Welcome back — good to see you again.</p>
      </div>

      <!-- Tab switcher -->
      <div class="auth-tabs">
        <button class="auth-tab active" type="button">Sign in</button>
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
          <a href="${url.registrationUrl}" class="auth-tab">Create account</a>
        <#else>
          <button class="auth-tab" type="button" disabled>Create account</button>
        </#if>
      </div>

      <!-- Keycloak messages (errors, info, success) -->
      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <div class="auth-alert auth-alert-${message.type}">
          <span class="auth-alert-icon">
            <#if message.type == 'error'>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <#elseif message.type == 'success'>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <#else>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </#if>
          </span>
          <span>${kcSanitize(message.summary)?no_esc}</span>
        </div>
      </#if>

      <!-- Social / identity providers -->
      <#if social.providers?has_content>
        <div class="auth-socials">
          <#list social.providers as p>
            <a href="${p.loginUrl}" class="auth-social-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              ${p.displayName}
            </a>
          </#list>
        </div>
        <div class="auth-divider">or continue with email</div>
      </#if>

      <!-- Login form -->
      <form action="${url.loginAction}" method="post" class="auth-form" novalidate>

        <input type="hidden" id="id-hidden-input" name="credentialId"
               <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

        <!-- Username / email -->
        <div class="auth-field">
          <label class="auth-label" for="username">Username or email</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <input
              class="auth-input<#if messagesPerField.existsError('username','password')> error</#if>"
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
        </div>

        <!-- Password -->
        <div class="auth-field">
          <label class="auth-label" for="password">Password</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input
              class="auth-input<#if messagesPerField.existsError('username','password')> error</#if>"
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
          <div class="auth-remember">
            <label>
              <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"
                     <#if login.rememberMe??>checked</#if>/>
              <span>Remember me</span>
            </label>
          </div>
        </#if>

        <#if realm.resetPasswordAllowed>
          <div class="auth-row">
            <a href="${url.loginResetCredentialsUrl}" class="auth-link">Forgot password?</a>
          </div>
        </#if>

        <button tabindex="4" type="submit" class="auth-btn">
          Sign in
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </button>

        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
          <p class="auth-terms">
            Don't have an account?
            <a href="${url.registrationUrl}" class="auth-link">Create one free</a>
          </p>
        </#if>

      </form>

    </div>
  </div>

</div>

</body>
</html>
