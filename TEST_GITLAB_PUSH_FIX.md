# GitLab Push Feature - Fix & Testing Guide

## ✅ Fixes Applied

### 1. **Backend Fix: Prevent Duplicate Mock Credentials**
   - **File**: `spring-bff/src/main/java/com/aiuigenerator/bff/service/GitLabOAuth2Service.java`
   - **Issue**: Every time user clicked "Connect to GitLab", a new credential entry was created
   - **Solution**: Check if credential exists before creating; reuse if present
   - **Change**: Modified `createMockCredential()` method

### 2. **Frontend Fix: Handle Dev Mode Response**
   - **File**: `frontend/src/components/PushGitLabModal.tsx`
   - **Issue**: Frontend expected `authorizationUrl` from OAuth flow, but dev mode returns credential info
   - **Solution**: Detect dev mode response and reload credentials list instead of redirecting
   - **Change**: Updated `handleConnectGitLab()` method to:
     - Check if response contains `gitlabUrl` (dev mode)
     - If dev mode: reload credentials and show success message
     - If production: redirect to OAuth URL as before

### 3. **Database Cleanup**
   - Cleared old duplicate credentials from MongoDB
   - Command: `db.userGitLabCredentials.deleteMany({userId: 'dev-user'})`

---

## 🧪 Testing Steps (Manual)

### Step 1: Start the Application
```bash
cd c:/Users/merye/Downloads/ai-ui-generator-fixed/ai-ui-generator-fixed
docker-compose up -d
```

Wait for all services to be healthy (~30 seconds)

---

### Step 2: Open the UI
1. Open browser → **http://localhost:5173**
2. Sign in with Keycloak (dev credentials)
3. Create a new project or open existing project
4. Click **"Add Project"** to generate some code (or skip if already have code)

---

### Step 3: Test GitLab Push Flow

1. **Open Push Modal**
   - Click **📤 GITLAB** button in the toolbar
   - Should see: `"Connected GitLab instances"` section

2. **Verify No Duplicates** ✅
   - You should see **0 or 1** GitLab connection (not 6+)
   - If you see entries, each should be unique by username

3. **Test Connect Flow**
   - Click **"🔗 Connect to GitLab"**
   - In dev mode, should see:
     - ✓ Success message: "Connected to https://gitlab.com"
     - ✓ Modal reloads and shows the new connection in list
     - ✓ No redirect (unlike production OAuth flow)

4. **Verify Connection Details**
   - Connection should show:
     - URL: `https://gitlab.com`
     - Username: `dev-user`
     - Button: `Disconnect`

5. **Test Fill Form**
   - Radio button should be selected for the connection
   - Form fields should appear:
     - Project Path: (empty input, hint: "mygroup/myproject")
     - Branch Name: (default: "ai-generated")
     - Commit Message: (default date-based)
     - Checkbox: "Auto-create project"

6. **Test Disconnect** (Optional)
   - Click `Disconnect` button
   - Credentials should be removed from list
   - Connection details should disappear

---

## 🔍 Verification Checklist

| Feature | Expected | Status |
|---------|----------|--------|
| No duplicate credentials shown | 1 connection (not 6+) | [ ] Pass |
| Connect button triggers dev mode flow | Shows success message | [ ] Pass |
| Connection auto-reloaded | Shows in the list immediately | [ ] Pass |
| Form fields appear | Project Path, Branch, Message | [ ] Pass |
| Radio button works | Can select/deselect connection | [ ] Pass |
| Disconnect removes credential | List becomes empty | [ ] Pass |

---

## 🚀 Full Push Test (End-to-End)

1. **Connect to GitLab** (see Step 3)
2. **Fill Push Form**
   ```
   Project Path: dev-user/my-test-project
   Branch: ai-generated
   Commit Message: feat: AI-generated UI
   Auto-create: ✓ (checked)
   ```

3. **Click Push Button**
   - Should show: `⏳ Pushing...`
   - After 2-3 seconds, success message or error

4. **Check Push Success**
   - Success message shows: `✓ Successfully pushed to https://gitlab.com/dev-user/my-test-project`
   - Modal closes after 2 seconds

---

## 🐛 Troubleshooting

### Seeing Old Duplicates After Fix?
**Solution**: Clear MongoDB
```bash
docker exec ai-ui-mongo mongosh --eval "db.userGitLabCredentials.deleteMany({userId: 'dev-user'})"
```

### Connection Not Showing After Click?
1. Check browser console for errors (F12)
2. Check backend logs:
   ```bash
   docker-compose logs spring-bff --tail 20
   ```
   Look for: `Created mock GitLab credential` or `Reusing existing mock`

### Form Fields Not Appearing?
- Ensure connection is selected (radio button checked)
- Look for TypeScript errors in browser console

---

## 📊 Expected Backend Behavior

### On First Connect:
```
INFO: Creating new mock GitLab credential for user dev-user on https://gitlab.com
INFO: Mock GitLab credential saved for user dev-user on https://gitlab.com
INFO: Listed 1 GitLab credentials for user dev-user
```

### On Second Connect (same URL):
```
INFO: Reusing existing mock GitLab credential for user dev-user on https://gitlab.com
INFO: Mock GitLab credential saved for user dev-user on https://gitlab.com
INFO: Listed 1 GitLab credentials for user dev-user  ← Still 1, not 2!
```

---

## 📝 Files Modified

1. ✅ `spring-bff/src/main/java/com/aiuigenerator/bff/service/GitLabOAuth2Service.java`
   - Function: `createMockCredential()`
   - Lines: 290-315 (approx)

2. ✅ `frontend/src/components/PushGitLabModal.tsx`
   - Function: `handleConnectGitLab()`
   - Lines: 64-77 (approx)

---

## ✨ Next Steps (After Testing)

- [ ] Test production GitLab OAuth flow (requires real GitLab app credentials)
- [ ] Test push with real GitLab project
- [ ] Test with self-hosted GitLab instance
- [ ] Test multiple GitLab instances connections

---

Need help? Check the logs:
```bash
docker-compose logs -f spring-bff
docker-compose logs -f frontend
```
