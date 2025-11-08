# Fix: Add-in Requires Multiple Refreshes After Login

## 🐛 Problem Description

When opening the Word add-in for the first time after logging in, the add-in would not recognize the user was logged in. Users had to refresh the add-in multiple times before it would work properly.

### Symptoms
- User logs in successfully
- Token is stored in OfficeRuntime.storage
- User closes and reopens the add-in
- Add-in shows login screen instead of main workspace
- User must refresh 2-3 times before add-in recognizes they're logged in

### Root Cause

**Race condition in Office initialization flow**

The issue was in `src/taskpane/index.tsx`:

```typescript
// ❌ BEFORE - THE PROBLEM:
let isOfficeInitialized = false;

// First render happens immediately
if (!isOfficeInitialized) {
  render(App);  // isOfficeInitialized = false (captured at this moment)
}

// Office.onReady fires later
Office.onReady(() => {
  isOfficeInitialized = true;  // Variable updates
  render(App);  // Re-render called
});
```

**The Problem:**
1. `isOfficeInitialized` is a plain JavaScript variable
2. First render passes `false` to `AuthProvider`
3. `AuthProvider` receives the prop and sets up its `useEffect` with `isOfficeInitialized` in the dependency array
4. Office.onReady() fires and updates the variable
5. `render()` is called again, creating a **new** `AuthProvider` instance
6. But React sees it as the same component tree and doesn't trigger the useEffect because the prop value appears unchanged from React's perspective
7. The `useEffect` in `AuthContext` that checks for stored tokens **never runs**
8. User appears logged out even though token exists

### Why It Works After Multiple Refreshes

When you manually refresh:
- Sometimes Office.onReady() fires faster
- Sometimes the render timing is different
- Eventually, the race condition resolves in your favor
- But it's unpredictable and frustrating

---

## ✅ Solution

Convert the initialization logic to use **React state** instead of a plain variable.

### Changes Made

**File:** `src/taskpane/index.tsx`

**Before:**
```typescript
let isOfficeInitialized = false;

const render = (Component: React.FC) => {
  root.render(
    <AuthProvider isOfficeInitialized={isOfficeInitialized}>
      <Component />
    </AuthProvider>
  );
};

Office.onReady(() => {
  isOfficeInitialized = true;
  render(App);
});

if (!isOfficeInitialized) {
  render(App);
}
```

**After:**
```typescript
const AppWrapper: React.FC = () => {
  const [isOfficeInitialized, setIsOfficeInitialized] = React.useState(false);

  React.useEffect(() => {
    console.log("AppWrapper: Setting up Office.onReady listener...");

    Office.onReady(() => {
      console.log("Office.onReady() called, updating state.");
      setIsOfficeInitialized(true);  // Triggers re-render
    });
  }, []);

  return (
    <React.StrictMode>
      <FluentProvider theme={webLightTheme}>
        <AuthProvider isOfficeInitialized={isOfficeInitialized}>
          <App />
        </AuthProvider>
      </FluentProvider>
    </React.StrictMode>
  );
};

root.render(<AppWrapper />);
```

### Why This Works

1. **React State Management:** `isOfficeInitialized` is now a React state variable
2. **Single Render Tree:** Only one component tree is rendered
3. **State Updates Trigger Re-renders:** When `setIsOfficeInitialized(true)` is called, React properly updates the prop
4. **useEffect Dependency:** The `AuthContext` useEffect has `isOfficeInitialized` in its dependency array, so it runs when the value changes
5. **Token Check Happens:** The stored token is properly retrieved and validated on first load

### Flow After Fix

```
1. App loads → AppWrapper renders with isOfficeInitialized = false
   └─> AuthProvider receives false
       └─> useEffect waits (doesn't run checkLoginStatus)
       └─> Shows loading spinner

2. Office.onReady() fires → setIsOfficeInitialized(true)
   └─> AppWrapper re-renders with isOfficeInitialized = true
       └─> AuthProvider receives true
           └─> useEffect detects change and runs checkLoginStatus()
               └─> Retrieves token from OfficeRuntime.storage
               └─> Validates token with server
               └─> Sets isAuthenticated = true
               └─> Shows MainWorkspace

✅ User sees main workspace immediately, no refresh needed!
```

---

## 🔍 Verification

After the fix, check the console logs to verify correct behavior:

### Expected Console Output (First Load After Login)

```
✅ GOOD - Correct Flow:
Initial render: Mounting AppWrapper component
AppWrapper: Rendering with isOfficeInitialized = false
AppWrapper: Setting up Office.onReady listener...
AuthProvider: Waiting for Office to initialize...

[Office.onReady fires]

Office.onReady() called, updating state.
AppWrapper: Rendering with isOfficeInitialized = true
AuthProvider: Office is ready. Checking login status...
Token found in storage.
AuthProvider: Validating token by fetching profile...
Attempting to fetch profile from /users/profile
Server uses 'status' field instead of 'success'
Unwrapping 'data' field from response
AuthProvider: Token validated. User is logged in. کاربر تست

[MainWorkspace renders]
```

### Bad Output (Would Indicate Problem Still Exists)

```
❌ BAD - Would indicate the bug is not fixed:
Initial render: Mounting AppWrapper component
AuthProvider: Waiting for Office to initialize...
Office.onReady() called, updating state.
AuthProvider: Waiting for Office to initialize...

[useEffect never runs to check for token]
[Shows login screen despite token existing]
```

---

## 🧪 Testing

### Test Case 1: First Load After Login
1. Open Word add-in
2. Click "Login"
3. Complete login in dialog
4. Close task pane
5. Reopen task pane
6. **Expected:** MainWorkspace shows immediately, no refresh needed

### Test Case 2: Fresh Load (Not Logged In)
1. Clear storage: `await OfficeRuntime.storage.removeItem("fishchi-token")`
2. Refresh add-in
3. **Expected:** Login screen shows immediately

### Test Case 3: Invalid/Expired Token
1. Manually set invalid token: `await OfficeRuntime.storage.setItem("fishchi-token", "invalid")`
2. Refresh add-in
3. **Expected:** Token validation fails, login screen shows

---

## 📊 Impact

### Before Fix
- ❌ Users confused by login not persisting
- ❌ Multiple refreshes needed (bad UX)
- ❌ Unpredictable behavior
- ❌ Support tickets about "login not working"

### After Fix
- ✅ Login persists across sessions
- ✅ No refresh needed
- ✅ Predictable, reliable behavior
- ✅ Smooth user experience

---

## 🔧 Technical Details

### React State vs Plain Variable

**Plain Variable (❌):**
- Changes don't trigger re-renders
- Props captured at render time
- Race conditions possible
- Unpredictable behavior

**React State (✅):**
- Changes trigger re-renders
- Props update reactively
- Dependency tracking works correctly
- Predictable behavior

### Office.onReady() Callback

The `Office.onReady()` callback fires when:
- Office.js library is loaded
- Host application (Word) is ready
- Add-in context is initialized

This can take 100-500ms, causing the race condition with eager rendering.

### AuthProvider useEffect Dependency

```typescript
React.useEffect(() => {
  if (!isOfficeInitialized) {
    return;  // Don't run yet
  }
  
  checkLoginStatus();  // Check for stored token
}, [isOfficeInitialized]);  // Re-run when this changes
```

This dependency is critical - it ensures the token check runs when Office becomes ready.

---

## 🚀 Deployment

### Steps to Apply Fix

1. **Pull latest code** with the fix
2. **Rebuild the add-in:**
   ```bash
   npm run build:dev
   ```
3. **Restart Word** (or refresh add-in)
4. **Test login flow**

### Verification Commands

```javascript
// In browser console (DevTools)

// Check if token exists
await OfficeRuntime.storage.getItem("fishchi-token");

// Check Office initialization
console.log("Office ready:", Office.context !== undefined);

// Check auth state (if you expose it for debugging)
console.log("Auth state:", window.__DEBUG_AUTH_STATE);
```

---

## 📝 Related Files

Files modified in this fix:
- `src/taskpane/index.tsx` - Main fix (initialization logic)

Files that work together:
- `src/taskpane/contexts/AuthContext.tsx` - Uses isOfficeInitialized prop
- `src/taskpane/components/App.tsx` - Renders based on auth state
- `src/taskpane/services/authService.ts` - Storage operations

---

## 🎯 Summary

**Bug:** Race condition between Office initialization and React rendering caused authentication check to never run on first load.

**Fix:** Use React state (`useState`) instead of plain JavaScript variable to manage Office initialization status. This ensures proper prop updates and useEffect triggering.

**Result:** Login now persists correctly across sessions without requiring manual refreshes.

**Priority:** High - This was a critical UX issue affecting all users

**Status:** ✅ Fixed

---

**Last Updated:** 2025  
**Version:** 1.1  
**Bug ID:** #14