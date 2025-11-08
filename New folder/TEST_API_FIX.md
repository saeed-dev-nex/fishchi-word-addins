# Quick Test Guide: API Endpoints Fix

## 🎯 What Was Fixed

Fixed 404 errors when loading sources and notes by correcting the API endpoint patterns:
- Sources: Now uses `?projectId=...` query parameter
- Notes: Now uses `?projectId=...&sourceId=...` query parameters

---

## 🚀 Quick Test Steps

### Step 1: Rebuild
```bash
cd Fishchi-addin
npm run build:dev
```

### Step 2: Open Word Add-in
1. Open Microsoft Word
2. Go to Home → Show Taskpane
3. Open Developer Tools (Right-click → Inspect)

### Step 3: Test the Flow
1. **Login** (if not already logged in)
   - Should see your username in the header ✅

2. **Select a Project**
   - Open the dropdown
   - Select a project that has sources
   - Watch the console

3. **Check Console Output**
   
   **Should SEE:**
   ```
   ✅ API Response received: Object
   ✅ Server uses 'status' field instead of 'success'
   ✅ Unwrapping 'data' field from response
   ✅ Retrieved X sources for project [id]
   ```

   **Should NOT see:**
   ```
   ❌ Failed to load resource: 404 (Not Found)
   ❌ No sources found for project ... (404)
   ```

4. **Verify Sources Display**
   - Sources should appear in the list
   - Each source shows title and authors
   - No error messages

5. **Click on a Source**
   - Source should highlight
   - Should automatically switch to "فیش‌ها" tab
   - Notes should load

6. **Check Notes Console Output**
   ```
   ✅ API Response received: Object
   ✅ Retrieved X notes for source [id]
   ```

7. **Click on a Note**
   - Note content should be inserted into Word document
   - Check the Word document for the inserted content

---

## ✅ Success Criteria

All of these should be true:
- [ ] No 404 errors in console
- [ ] Sources load and display
- [ ] Clicking a source loads its notes
- [ ] Clicking a note inserts it into Word
- [ ] No error messages in the UI

---

## ❌ If You See Problems

### Problem: Still getting 404 errors
**Solution:**
1. Check you rebuilt: `npm run build:dev`
2. Hard refresh: `Ctrl + Shift + R`
3. Close and reopen Word
4. Check the Network tab to see what URL is being called

### Problem: Sources show but notes don't
**Check:**
1. Does the source actually have notes? (Check in web app)
2. Look at console - are there errors?
3. Make sure projectId is being passed to notes API

### Problem: "منبعی در این پروژه یافت نشد"
**Check:**
1. Does the project actually have sources? (Check in web app)
2. Look at console for API errors
3. Verify the API response structure

---

## 🔍 Debug Console Commands

If you want to manually test the API:

```javascript
// Get stored token
await OfficeRuntime.storage.getItem("fishchi-token");

// Test sources API (replace projectId)
fetch("https://localhost:5000/api/v1/sources?projectId=YOUR_PROJECT_ID", {
  headers: {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
  }
})
.then(r => r.json())
.then(d => console.log("Sources:", d));

// Test notes API (replace projectId and sourceId)
fetch("https://localhost:5000/api/v1/notes?projectId=YOUR_PROJECT_ID&sourceId=YOUR_SOURCE_ID", {
  headers: {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
  }
})
.then(r => r.json())
.then(d => console.log("Notes:", d));
```

---

## 📊 Expected Results

### Network Tab (Chrome DevTools)

**Sources Request:**
- URL: `https://localhost:5000/api/v1/sources?projectId=...`
- Method: GET
- Status: 200 OK
- Response: `{ status: "success", data: { sources: [...], pagination: {...} } }`

**Notes Request:**
- URL: `https://localhost:5000/api/v1/notes?projectId=...&sourceId=...`
- Method: GET
- Status: 200 OK
- Response: `{ status: "success", data: [...] }`

---

## 🎉 When Everything Works

You should be able to:
1. ✅ Login successfully
2. ✅ See all your projects in the dropdown
3. ✅ Select a project and see its sources
4. ✅ Click a source and see its notes
5. ✅ Click a note and insert it into Word
6. ✅ No errors in console
7. ✅ Smooth, professional experience

---

**Estimated Test Time:** 5 minutes

**If all tests pass:** You're good to go! 🚀

**If tests fail:** Check the troubleshooting section or review `API_ENDPOINTS_FIX.md` for detailed information.