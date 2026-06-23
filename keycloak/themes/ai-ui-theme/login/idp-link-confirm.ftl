<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Link Account — Talanted</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; }

    .page {
      min-height: 100vh;
      background: #020208;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .orb1 {
      position: absolute; border-radius: 50%; pointer-events: none;
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%);
      top: -150px; left: -150px;
    }
    .orb2 {
      position: absolute; border-radius: 50%; pointer-events: none;
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%);
      bottom: -100px; right: -100px;
    }
    .card {
      position: relative; z-index: 10;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 40px 36px;
      width: 100%;
      max-width: 420px;
      text-align: center;
    }
    .icon-wrap {
      width: 64px; height: 64px;
      background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2));
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 22px; font-weight: 800; color: #fff;
      margin-bottom: 10px; letter-spacing: -0.4px;
    }
    .desc {
      font-size: 14px; color: rgba(255,255,255,0.4);
      line-height: 1.7; margin-bottom: 32px;
    }
    .email-badge {
      display: inline-block;
      background: rgba(99,102,241,0.1);
      border: 1px solid rgba(99,102,241,0.25);
      border-radius: 8px;
      padding: 4px 12px;
      color: #a5b4fc;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .actions { display: flex; flex-direction: column; gap: 12px; }
    .btn-primary {
      width: 100%; padding: 14px 20px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border: none; border-radius: 12px; cursor: pointer;
      font-size: 15px; font-weight: 700; color: #fff;
      font-family: inherit; letter-spacing: 0.2px;
      transition: all 0.2s;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 30px rgba(99,102,241,0.4);
    }
    .sep {
      display: flex; align-items: center; gap: 12px;
    }
    .sep-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
    .sep-text { font-size: 12px; color: rgba(255,255,255,0.2); }
    .btn-secondary {
      width: 100%; padding: 14px 20px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; cursor: pointer;
      font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.45);
      font-family: inherit;
      transition: all 0.2s;
    }
    .btn-secondary:hover {
      border-color: rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.7);
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
<div class="page">
  <div class="orb1"></div>
  <div class="orb2"></div>

  <div class="card">
    <div class="icon-wrap">🔗</div>
    <div class="title">Account already exists</div>
    <div class="desc">
      An account with this email already exists.<br/>
      How would you like to continue?
    </div>

    <#if idpDisplayName?has_content>
      <div class="email-badge">${idpDisplayName}</div>
    </#if>

    <div class="actions">
      <form method="post" action="${url.loginAction}">
        <input type="hidden" name="submitAction" value="linkAccount"/>
        <button type="submit" class="btn-primary">
          Add to existing account
        </button>
      </form>

      <div class="sep">
        <div class="sep-line"></div>
        <span class="sep-text">or</span>
        <div class="sep-line"></div>
      </div>

      <form method="post" action="${url.loginAction}">
        <input type="hidden" name="submitAction" value="updateProfile"/>
        <button type="submit" class="btn-secondary">
          Review profile
        </button>
      </form>
    </div>
  </div>
</div>
</body>
</html>
