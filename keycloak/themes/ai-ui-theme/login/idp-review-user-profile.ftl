<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Review Profile — Talanted</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css"/>
  <style>
    .review-card {
      max-width: 420px;
      width: 100%;
      margin: auto;
    }
    .review-icon {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 20px;
      box-shadow: 0 0 40px rgba(99,102,241,0.3);
    }
    .review-title {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 8px;
      letter-spacing: -0.4px;
    }
    .review-desc {
      font-size: 14px;
      color: rgba(255,255,255,0.4);
      margin-bottom: 28px;
      line-height: 1.6;
    }
    .form-group {
      margin-bottom: 16px;
      text-align: left;
    }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.5);
      margin-bottom: 6px;
      letter-spacing: 0.3px;
    }
    .form-input {
      width: 100%;
      padding: 13px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: #fff;
      font-size: 15px;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }
    .form-input:focus {
      border-color: rgba(99,102,241,0.5);
      background: rgba(99,102,241,0.05);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
    }
    .btn-submit {
      width: 100%;
      padding: 14px 20px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      font-family: inherit;
      transition: all 0.2s;
      margin-top: 8px;
    }
    .btn-submit:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 30px rgba(99,102,241,0.35);
    }
  </style>
</head>
<body>

<div style="min-height:100vh; background:#020208; display:flex; align-items:center; justify-content:center; padding:20px; font-family:'Inter',sans-serif; position:relative; overflow:hidden;">

  <div style="position:absolute;top:-100px;left:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%);border-radius:50%;pointer-events:none;"></div>
  <div style="position:absolute;bottom:-80px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,rgba(168,85,247,0.1),transparent 70%);border-radius:50%;pointer-events:none;"></div>

  <div class="review-card">

    <div style="text-align:center;margin-bottom:28px;">
      <div class="review-icon">✦</div>
      <div class="review-title">Almost there</div>
      <div class="review-desc">Review your profile information before continuing.</div>
    </div>

    <form method="post" action="${url.loginAction}">

      <#if profile.attributesByName.firstName??>
      <div class="form-group">
        <label class="form-label" for="firstName">First name</label>
        <input class="form-input" type="text" id="firstName" name="firstName"
               value="${(profile.attributesByName.firstName.value)!""}" />
      </div>
      </#if>

      <#if profile.attributesByName.lastName??>
      <div class="form-group">
        <label class="form-label" for="lastName">Last name</label>
        <input class="form-input" type="text" id="lastName" name="lastName"
               value="${(profile.attributesByName.lastName.value)!""}" />
      </div>
      </#if>

      <#if profile.attributesByName.email??>
      <div class="form-group">
        <label class="form-label" for="email">Email</label>
        <input class="form-input" type="email" id="email" name="email"
               value="${(profile.attributesByName.email.value)!""}" />
      </div>
      </#if>

      <button type="submit" class="btn-submit">Continue</button>

    </form>

  </div>

</div>

</body>
</html>
