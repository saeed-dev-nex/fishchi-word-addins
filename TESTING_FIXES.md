# Testing Guide - Fishchi Word Add-in Bug Fixes

This guide will help you test all the bug fixes that were applied to the Fishchi Word Add-in.

## 🚀 Quick Start

### Prerequisites

1. **Backend Server Running**
   ```bash
   # Make sure your backend is running on:
   https://localhost:5000
   
   # Or update the URL in:
   # src/taskpane/services/api.ts
   # src/taskpane/services/authService.ts
   ```

2. **Login Page Available**
   ```bash
   # Make sure your login page is accessible at:
   https://localhost:3000/login
   ```

3. **Build the Add-in**
   ```bash
   npm install
   npm run build:dev
   ```

4. **Start Development Server**
   ```bash
   npm run dev-server
   
   # This will start the add-in at:
   # https://localhost:3500
   ```

5. **Load in Word**
   ```bash
   npm start
   
   # This will sideload the add-in into Word
   ```

---

## 🧪 Test Plan

### Test 1: UUID Package Installation ✅

**What was fixed:** Missing `uuid` dependency

**How to test:**
1. Check that the package is installed:
   ```bash
   npm list uuid
   ```
2. Expected output: Should show `uuid@8.3.2` or similar version
3. Build should complete without errors about missing `uuid`

**Status Indicator:**
- ✅ PASS: Build completes successfully
- ❌ FAIL: Error "Cannot find module 'uuid'"

---

### Test 2: API Data Unwrapping ✅

**What was fixed:** Double data unwrapping causing runtime errors

**How to test:**
1. Open Word add-in task pane
2. Open browser DevTools (F12 or right-click → Inspect)
3. Go to Console tab
4. Login to the add-in
5. Select a project from the dropdown

**What to look for in Console:**
```
✅ GOOD:
API Response received: {success: true, hasData: true, ...}
[Array of projects displayed]

❌ BAD (old bug):
Cannot read property 'data' of undefined
TypeError: response.data is not a function
```

**Status Indicator:**
- ✅ PASS: Projects load and display correctly
- ❌ FAIL: Console shows errors about `.data`

---

### Test 3: Note Insertion into Word ✅

**What was fixed:** Note insertion was not implemented

**How to test:**
1. Login to add-in
2. Select a project
3. Click on a source to view its notes
4. Click on a note in the "فیش‌ها" (Notes) tab
5. Check Word document

**Expected Result:**
- Note content should be inserted at the end of the document
- A blank line should be added after the note
- Console shows: "Note inserted successfully: [note-id]"

**Status Indicator:**
- ✅ PASS: Note appears in Word document
- ❌ FAIL: Nothing happens or error in console

---

### Test 4: Word Commands (not Outlook) ✅

**What was fixed:** Commands file had Outlook-specific code

**How to test:**
1. Check if the add-in loads without errors in Word
2. If there's a ribbon button (check manifest.xml), click it
3. Check console for errors

**What to look for:**
```
✅ GOOD:
Office.js ready in commands.ts
Word command action performed

❌ BAD (old bug):
Cannot read property 'mailbox' of undefined
TypeError: Office.context.mailbox is undefined
```

**Status Indicator:**
- ✅ PASS: No mailbox-related errors
- ❌ FAIL: Console shows Outlook API errors

---

### Test 5: Login Flow ✅

**What was fixed:** Multiple login and authentication issues

**How to test:**
1. Open add-in in Word
2. Open browser DevTools Console
3. Click "ورود به حساب کاربری" (Login) button
4. Login dialog should open
5. Complete login in the dialog
6. Dialog should close automatically
7. Profile should load

**Console Output to Monitor:**
```
Expected Flow:
--------------
AuthProvider: Step 1 - Opening login dialog...
AuthProvider: Step 1 - Token received: Yes (length: XXX)
AuthProvider: Step 2 - Storing token...
AuthProvider: Step 2 - Token stored successfully
AuthProvider: Step 3 - Fetching user profile...
Attempting to fetch profile from /users/me
API Response received: {success: true, hasData: true, ...}
Profile response from /users/me: {_id: "...", username: "..."}
AuthProvider: Step 3 - Profile received: {...}
AuthProvider: Login successful! [username]
```

**Status Indicator:**
- ✅ PASS: All steps complete, user profile loads
- ❌ FAIL: Error at any step

---

### Test 6: Profile Endpoint Fallback ✅

**What was fixed:** Added fallback from /users/me to /users/profile

**How to test:**
1. If your server uses `/users/profile` instead of `/users/me`
2. Login should still work
3. Check console for fallback message

**Console Output:**
```
✅ If primary endpoint works:
Attempting to fetch profile from /users/me
Profile response from /users/me: {...}

✅ If fallback is used:
Attempting to fetch profile from /users/me
Failed to fetch from /users/me, trying /users/profile: [error]
Attempting to fetch profile from /users/profile
Profile response from /users/profile: {...}
```

**Status Indicator:**
- ✅ PASS: Login works with either endpoint
- ❌ FAIL: Login fails with both endpoints

---

### Test 7: API Response Validation ✅

**What was fixed:** Better validation and error messages for API responses

**How to test - Simulate Invalid Response:**
1. Temporarily modify server to return invalid response
2. Try to fetch data
3. Check error message clarity

**Expected Error Messages:**
```
✅ GOOD (new):
"Invalid projects response: Expected array of projects, got: object"
"Invalid profile response: missing required fields (username, email, or _id)"
"API returned success=false: User not found"

❌ BAD (old):
"API request failed but reported success"
"Cannot read property 'username' of null"
```

**Status Indicator:**
- ✅ PASS: Clear, specific error messages
- ❌ FAIL: Generic or unclear errors

---

### Test 8: ESLint Clean ✅

**What was fixed:** 43+ ESLint errors for missing global declarations

**How to test:**
```bash
npm run lint
```

**Expected Output:**
```
✅ PASS:
> office-addin-lint check
(no errors)

❌ FAIL:
✖ 43 problems (43 errors, 0 warnings)
```

**Status Indicator:**
- ✅ PASS: 0 errors, 0 warnings
- ❌ FAIL: Any errors displayed

---

### Test 9: Build Success ✅

**What was fixed:** All TypeScript and build errors

**How to test:**
```bash
npm run build
```

**Expected Output:**
```
✅ PASS:
webpack 5.x.x compiled successfully

❌ FAIL:
ERROR in src/...
Module not found: Error: Can't resolve '...'
```

**Status Indicator:**
- ✅ PASS: Build completes with only performance warnings (normal)
- ❌ FAIL: Build fails with errors

---

## 🔍 Detailed Login Testing

This is the most critical flow - test thoroughly!

### Step-by-Step Test Procedure

**1. Open Task Pane**
- Open Word
- Go to Home tab
- Click "Show Task Pane" button
- Task pane should open on the right

**2. Initial State**
- Should see Fishchi logo
- Should see "به فیشچی خوش آمدید" message
- Should see "ورود به حساب کاربری" button
- Button should be enabled (not disabled)

**3. Click Login**
- Click the login button
- Dialog should open in ~1-2 seconds
- Dialog should show your login page
- Dialog dimensions: 60% height, 40% width

**4. Complete Login**
- Enter credentials in dialog
- Submit login form
- Dialog should close automatically after successful login
- Don't close it manually!

**5. After Dialog Closes**
- Task pane should show loading spinner
- Console should show "Fetching user profile..."
- Within 2-3 seconds, should see main workspace

**6. Main Workspace**
- Should see user avatar and username at top
- Should see "خروج" (Logout) button
- Should see project dropdown
- Should see search box
- Should see tabs for "منابع" and "فیش‌ها"

---

## 🐛 Troubleshooting Quick Reference

### "Token not ready" - polling forever
**Fix:** Check that your login page redirects properly or closes the dialog after setting the token on the server.

### "401 Unauthorized"
**Fix:** 
1. Check that token is being stored: `OfficeRuntime.storage.getItem("fishchi-token")`
2. Check Authorization header in Network tab
3. Verify server auth middleware is working

### "data is null"
**Fix:**
1. Verify user exists in database
2. Check server returns `data` field in response
3. Verify response format: `{success: true, data: {...}}`

### "Profile is null or undefined"
**Fix:**
1. Check network tab - is request being made?
2. Check server response - does it have user data?
3. Check console logs for which endpoint is being tried

### CORS Error
**Fix:**
```javascript
// In server
app.use(cors({
  origin: ['https://localhost:3500', 'https://localhost:3000'],
  credentials: true
}));
```

### "Office is not ready"
**Fix:** 
- This is normal during initial load
- Should resolve in 1-2 seconds
- If persists, reload the task pane

---

## ✅ Success Criteria

All tests pass if:

- [x] `npm run lint` shows 0 errors
- [x] `npm run build` completes successfully
- [x] Add-in loads in Word without errors
- [x] Login flow completes successfully
- [x] Projects load and display
- [x] Sources load when project selected
- [x] Notes load when source clicked
- [x] Notes insert into Word document
- [x] Logout works correctly
- [x] Console shows detailed, helpful logs
- [x] Network tab shows successful API calls
- [x] No runtime errors in console

---

## 📊 Test Results Template

Copy this and fill it out after testing:

```
Test Date: _______________
Tester: _______________

[ ] Test 1: UUID Package - PASS/FAIL
[ ] Test 2: API Unwrapping - PASS/FAIL
[ ] Test 3: Note Insertion - PASS/FAIL
[ ] Test 4: Word Commands - PASS/FAIL
[ ] Test 5: Login Flow - PASS/FAIL
[ ] Test 6: Endpoint Fallback - PASS/FAIL
[ ] Test 7: API Validation - PASS/FAIL
[ ] Test 8: ESLint Clean - PASS/FAIL
[ ] Test 9: Build Success - PASS/FAIL

Notes:
_______________________________________
_______________________________________
_______________________________________

Overall Status: PASS / FAIL
```

---

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Commit the changes
2. ✅ Update version number in package.json
3. ✅ Deploy to staging/production

If any tests fail:
1. 📋 Review DEBUGGING_LOGIN.md for specific issue
2. 🔍 Check console logs and network tab
3. 🔧 Apply fixes from Common Issues section
4. 🔄 Re-test

---

**Happy Testing! 🚀**