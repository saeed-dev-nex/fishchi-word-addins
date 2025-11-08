# Bug Fix: Infinite Refresh Loop in MainWorkspace Component

## 🐛 Problem Description

**Symptom:** After logging in, the `MainWorkspace` component repeatedly refreshes, showing only a brief flash of content before reloading. The component stays in a constant loading state with no error messages displayed.

**Impact:** Users cannot interact with the Word add-in after authentication because the UI continuously re-renders.

---

## 🔍 Root Cause Analysis

The infinite refresh loop was caused by a **React useCallback dependency issue** in the `MainWorkspace.tsx` component.

### The Issue Chain:

1. **New Object on Every Render**
   ```typescript
   // ❌ BEFORE: Created a new object on every render (Line 342-349)
   const unassignedProject: Project = {
     _id: UNASSIGNED_PROJECT_ID,
     name: "📚 منابع بدون پروژه",
     user: user._id,
     sources: [],
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString(),
   };
   ```
   Every time the component re-renders, a **brand new object** is created with a different reference in memory.

2. **Unstable useCallback Dependency**
   ```typescript
   // ❌ BEFORE: Depends on an unstable object (Line 387)
   const fetchProjects = React.useCallback(async () => {
     // ... fetch logic ...
     setProjects([unassignedProject, ...fetchedProjects]);
     
     if (!selectedProjectId || !fetchedProjects.find((p) => p._id === selectedProjectId)) {
       setSelectedProjectId(/* select project */);
     }
   }, [selectedProjectId, unassignedProject]); // 🔥 PROBLEM!
   ```
   Since `unassignedProject` is a new object every render, React thinks the dependency has changed, so it recreates the `fetchProjects` function.

3. **useEffect Triggers Re-render**
   ```typescript
   // Line 399-405
   React.useEffect(() => {
     setIsLoading(true);
     fetchProjects().finally(() => {
       setIsLoading(false);
     });
   }, [fetchProjects]); // Re-runs when fetchProjects changes
   ```
   When `fetchProjects` is recreated, this effect runs again.

4. **State Update Triggers New Render**
   Inside `fetchProjects`, calling `setSelectedProjectId()` triggers a re-render, which starts the cycle over again.

### The Infinite Loop:
```
Render → New unassignedProject object created
       → fetchProjects recreated (dependency changed)
       → useEffect runs
       → setSelectedProjectId() called
       → Component re-renders
       → LOOP BACK TO START ♻️
```

---

## ✅ Solution

### Fix #1: Memoize the `unassignedProject` Object

```typescript
// ✅ AFTER: Memoized with React.useMemo (Line 343-354)
const unassignedProject: Project = React.useMemo(
  () => ({
    _id: UNASSIGNED_PROJECT_ID,
    name: "📚 منابع بدون پروژه",
    user: user._id,
    sources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  [user._id] // Only recreate if user._id changes
);
```

**Why this works:** `React.useMemo` ensures the object is only created once (when the component mounts or when `user._id` changes). The same object reference is used across renders, making it a stable dependency.

### Fix #2: Remove `selectedProjectId` from fetchProjects Dependencies

```typescript
// ✅ AFTER: Use functional setState to avoid dependency (Line 367-380)
const fetchProjects = React.useCallback(async () => {
  setError(null);
  try {
    const fetchedProjects = await apiGetProjects();
    setProjects([unassignedProject, ...fetchedProjects]);

    // Use functional setState to access current value without dependency
    setSelectedProjectId((currentProjectId) => {
      if (!currentProjectId || !fetchedProjects.find((p) => p._id === currentProjectId)) {
        if (fetchedProjects.length > 0) {
          return fetchedProjects[0]._id;
        } else {
          return unassignedProject._id;
        }
      }
      return currentProjectId; // Keep current selection if valid
    });

    const existingCitations = await scanDocumentForCitations();
    setCitedSourceIds(new Set(existingCitations));
  } catch (err: any) {
    setError(err.message || "خطا در دریافت پروژه‌ها");
  } finally {
    setIsRefreshing(false);
  }
}, [unassignedProject]); // ✅ Only stable, memoized dependency
```

**Why this works:** 
- Using the **functional form of setState** (`setSelectedProjectId(current => ...)`) allows us to access the current state value without adding `selectedProjectId` to the dependency array
- The only dependency is now `unassignedProject`, which is stable (memoized)

---

## 🧪 How to Verify the Fix

### 1. Check Console Logs
After the fix, you should see:
```
App: Render #1 { isOfficeInitialized: true, isLoading: false, isAuthenticated: true }
App: Render #2 { isOfficeInitialized: true, isLoading: false, isAuthenticated: true }
MainWorkspace: Component mounted
MainWorkspace: fetchProjects called
MainWorkspace: Projects loaded: 3
```

**Before the fix**, you would see:
```
App: Render #1
App: Render #2
App: Render #3
App: Render #4
... (continues indefinitely)
⚠️ WARNING: Too many renders detected! Possible infinite loop.
```

### 2. Visual Verification
- After login, the MainWorkspace should load once and stay stable
- No flickering or constant reloading
- Project dropdown and sources list should display properly
- No loading spinner constantly appearing and disappearing

### 3. Test Scenarios
1. ✅ **Login Flow:** Log in → Should see MainWorkspace stable
2. ✅ **Select Project:** Change project → Sources should update without full component reload
3. ✅ **Refresh Button:** Click refresh → Should update data but not cause infinite loop
4. ✅ **Select Source:** Click a source → Notes should load without issues

---

## 📚 Key Lessons Learned

### 1. Object References in React
```typescript
// ❌ BAD: New object every render
const myObject = { id: 1, name: "Test" };

// ✅ GOOD: Memoized object (stable reference)
const myObject = React.useMemo(() => ({ id: 1, name: "Test" }), []);
```

### 2. useCallback Dependencies
```typescript
// ❌ BAD: State value as dependency when you just need to read it
const myFunction = React.useCallback(() => {
  if (myState === "something") {
    setMyState("newValue");
  }
}, [myState]); // Recreates function when myState changes

// ✅ GOOD: Use functional setState
const myFunction = React.useCallback(() => {
  setMyState(current => {
    if (current === "something") {
      return "newValue";
    }
    return current;
  });
}, []); // No dependencies needed
```

### 3. useEffect with useCallback
When a `useEffect` depends on a `useCallback` function, ensure the callback's dependencies are stable. Otherwise, you create a re-render loop.

---

## 🔧 Additional Recommendations

### 1. Enable React DevTools Profiler
Add React DevTools to monitor component renders and identify performance issues early.

### 2. Consider Adding Render Tracking (Already Implemented in App.tsx)
The current implementation in `App.tsx` (lines 15-51) is excellent:
```typescript
const renderCountRef = React.useRef(0);
React.useEffect(() => {
  renderCountRef.current += 1;
  if (renderCountRef.current > 50) {
    console.error("⚠️ WARNING: Too many renders detected!");
  }
}, [isAuthenticated, userProfile, isLoading, isOfficeInitialized]);
```

### 3. Lint Rules
Consider adding ESLint rules to catch these issues:
```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 4. Code Review Checklist
When reviewing React code, always check:
- [ ] Are objects/arrays in dependency arrays stable (memoized)?
- [ ] Can functional setState be used to avoid state dependencies?
- [ ] Are useCallback/useMemo actually necessary?
- [ ] Could this cause an infinite loop?

---

## 📝 Files Modified

- **`Fishchi-addin/src/taskpane/components/MainWorkspace.tsx`**
  - Line 343-354: Memoized `unassignedProject` object
  - Line 367-380: Refactored `setSelectedProjectId` to use functional setState
  - Line 391: Updated `fetchProjects` dependency array to only include `unassignedProject`

---

## ✨ Status

- [x] Issue identified
- [x] Root cause analyzed
- [x] Fix implemented
- [x] Code compiles without errors
- [ ] Manual testing required
- [ ] User acceptance testing required

---

## 👥 Credits

**Fixed by:** AI Assistant  
**Date:** 2024  
**Issue Reporter:** User (Saeed)  
**Severity:** Critical (P0) - Blocks all user workflows after login

---

## 🔗 Related Resources

- [React useCallback Hook](https://react.dev/reference/react/useCallback)
- [React useMemo Hook](https://react.dev/reference/react/useMemo)
- [React Hooks FAQ - Infinite Loop](https://react.dev/learn/you-might-not-need-an-effect#chains-of-computations)
- [Understanding React Re-renders](https://react.dev/learn/render-and-commit)