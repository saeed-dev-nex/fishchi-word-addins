/**
 * Fishchi Add-in - Endpoint Testing Utility
 *
 * Run this in the browser console (DevTools) to find the correct sources endpoint.
 *
 * Usage:
 * 1. Open DevTools (F12)
 * 2. Copy this entire file content
 * 3. Paste into Console and press Enter
 * 4. Run: testSourcesEndpoint("YOUR_PROJECT_ID")
 *
 * Example: testSourcesEndpoint("68f3da6f1394573cdd278c2e")
 */

// Configuration
const API_BASE = "https://localhost:5000/api/v1";

/**
 * Get stored authentication token
 */
async function getStoredToken() {
  try {
    const token = await OfficeRuntime.storage.getItem("fishchi-token");
    if (!token) {
      console.error("❌ No token found in storage. Please log in first.");
      return null;
    }
    console.log("✅ Token found:", token.substring(0, 20) + "...");
    return token;
  } catch (error) {
    console.error("❌ Error getting token:", error);
    return null;
  }
}

/**
 * Test a single endpoint
 */
async function testEndpoint(url, token, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS!`);
      console.log(`   Response:`, data);
      return { success: true, url, data };
    } else {
      console.log(`   ❌ Failed: ${response.status}`);
      return { success: false, url, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return { success: false, url, error: error.message };
  }
}

/**
 * Test all possible endpoint variations
 */
async function testSourcesEndpoint(projectId) {
  console.log("=" .repeat(70));
  console.log("🚀 FISHCHI ENDPOINT TESTER");
  console.log("=" .repeat(70));
  console.log(`Project ID: ${projectId}`);

  // Get token
  const token = await getStoredToken();
  if (!token) {
    console.log("\n❌ Cannot proceed without token. Please log in to the add-in first.");
    return;
  }

  // Define all endpoint variations to test
  const endpoints = [
    {
      url: `${API_BASE}/sources/project/${projectId}`,
      description: "Current path (plural, /sources/project/:id)"
    },
    {
      url: `${API_BASE}/source/project/${projectId}`,
      description: "Singular form (/source/project/:id)"
    },
    {
      url: `${API_BASE}/projects/${projectId}/sources`,
      description: "Nested under projects (/projects/:id/sources)"
    },
    {
      url: `${API_BASE}/sources?projectId=${projectId}`,
      description: "Query parameter (/sources?projectId=:id)"
    },
    {
      url: `${API_BASE}/sources?project=${projectId}`,
      description: "Query parameter variant (/sources?project=:id)"
    },
    {
      url: `${API_BASE}/project/${projectId}/sources`,
      description: "Singular project nested (/project/:id/sources)"
    },
    {
      url: `${API_BASE}/sources`,
      description: "Just /sources (might filter by user automatically)"
    },
    {
      url: `${API_BASE}/source`,
      description: "Just /source (singular)"
    }
  ];

  console.log(`\nTesting ${endpoints.length} endpoint variations...\n`);

  // Test each endpoint
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url, token, endpoint.description);
    results.push(result);

    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 RESULTS SUMMARY");
  console.log("=".repeat(70));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    console.log(`\n✅ WORKING ENDPOINTS (${successful.length}):`);
    successful.forEach(r => {
      console.log(`   ✓ ${r.url}`);
      if (r.data && r.data.data) {
        const count = Array.isArray(r.data.data) ? r.data.data.length : "N/A";
        console.log(`     → Returned ${count} sources`);
      }
    });

    console.log("\n🎯 RECOMMENDED ACTION:");
    console.log(`   Update src/taskpane/services/api.ts line 171 to:`);
    console.log(`   const response = await authenticatedFetch(\`\${API_V1_URL}${successful[0].url.replace(API_BASE, "")}\`);`);
  } else {
    console.log("\n❌ NO WORKING ENDPOINTS FOUND");
    console.log("\nPossible reasons:");
    console.log("   1. The endpoint might not exist on your server yet");
    console.log("   2. Different route structure is used");
    console.log("   3. Authorization or permissions issue");
    console.log("   4. Project ID is invalid or has no sources");
  }

  if (failed.length > 0) {
    console.log(`\n❌ FAILED ENDPOINTS (${failed.length}):`);
    failed.forEach(r => {
      console.log(`   ✗ ${r.url} - ${r.status || r.error}`);
    });
  }

  console.log("\n" + "=".repeat(70));
  console.log("💡 TIP: Check your server logs to see which routes are registered");
  console.log("=".repeat(70) + "\n");

  return results;
}

/**
 * Test notes endpoint variations
 */
async function testNotesEndpoint(sourceId) {
  console.log("=" .repeat(70));
  console.log("🚀 FISHCHI NOTES ENDPOINT TESTER");
  console.log("=" .repeat(70));
  console.log(`Source ID: ${sourceId}`);

  const token = await getStoredToken();
  if (!token) {
    console.log("\n❌ Cannot proceed without token.");
    return;
  }

  const endpoints = [
    {
      url: `${API_BASE}/notes/source/${sourceId}`,
      description: "Current path (/notes/source/:id)"
    },
    {
      url: `${API_BASE}/note/source/${sourceId}`,
      description: "Singular form (/note/source/:id)"
    },
    {
      url: `${API_BASE}/sources/${sourceId}/notes`,
      description: "Nested under sources (/sources/:id/notes)"
    },
    {
      url: `${API_BASE}/notes?sourceId=${sourceId}`,
      description: "Query parameter (/notes?sourceId=:id)"
    },
    {
      url: `${API_BASE}/notes?source=${sourceId}`,
      description: "Query parameter variant (/notes?source=:id)"
    }
  ];

  console.log(`\nTesting ${endpoints.length} endpoint variations...\n`);

  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url, token, endpoint.description);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  const successful = results.filter(r => r.success);

  console.log("\n" + "=".repeat(70));
  if (successful.length > 0) {
    console.log(`✅ WORKING ENDPOINT: ${successful[0].url}`);
  } else {
    console.log("❌ NO WORKING NOTES ENDPOINT FOUND");
  }
  console.log("=".repeat(70) + "\n");

  return results;
}

/**
 * Quick test with the first project in the list
 */
async function autoTestSources() {
  console.log("🔍 Fetching projects to test sources endpoint...\n");

  const token = await getStoredToken();
  if (!token) return;

  try {
    // Get projects
    const response = await fetch(`${API_BASE}/projects`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error("❌ Failed to fetch projects");
      return;
    }

    const projectsData = await response.json();
    const projects = projectsData.data || projectsData;

    if (!projects || projects.length === 0) {
      console.log("❌ No projects found. Create a project first.");
      return;
    }

    console.log(`✅ Found ${projects.length} projects`);
    const firstProject = projects[0];
    console.log(`   Using: "${firstProject.name}" (${firstProject._id})\n`);

    // Test with first project
    await testSourcesEndpoint(firstProject._id);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Make functions available globally
window.testSourcesEndpoint = testSourcesEndpoint;
window.testNotesEndpoint = testNotesEndpoint;
window.autoTestSources = autoTestSources;

// Show usage instructions
console.log("=" .repeat(70));
console.log("🎉 ENDPOINT TESTER LOADED!");
console.log("=" .repeat(70));
console.log("\nAvailable commands:");
console.log("  autoTestSources()                          - Auto-detect and test");
console.log("  testSourcesEndpoint('project-id-here')     - Test sources endpoint");
console.log("  testNotesEndpoint('source-id-here')        - Test notes endpoint");
console.log("\nExample:");
console.log("  autoTestSources()");
console.log("\n" + "=".repeat(70) + "\n");
