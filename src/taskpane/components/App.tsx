import * as React from "react";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "./LoadingSpinner";
import { LoginScreen } from "./LoginScreen";
import { MainWorkspace } from "./MainWorkspace";

// AppProps is no longer needed as title/isOfficeInitialized are in the context
const App: React.FC = () => {
  // Get the state from the AuthContext
  const { isAuthenticated, userProfile, isLoading, isOfficeInitialized } = useAuth();

  // Ref to track renders and prevent infinite loops
  const renderCountRef = React.useRef(0);
  const lastStateRef = React.useRef({
    isAuthenticated,
    userProfile,
    isLoading,
    isOfficeInitialized,
  });

  // Track renders and detect infinite loops
  React.useEffect(() => {
    renderCountRef.current += 1;
    const stateChanged =
      lastStateRef.current.isAuthenticated !== isAuthenticated ||
      lastStateRef.current.userProfile !== userProfile ||
      lastStateRef.current.isLoading !== isLoading ||
      lastStateRef.current.isOfficeInitialized !== isOfficeInitialized;

    if (stateChanged) {
      console.log("App: Render #" + renderCountRef.current, {
        isOfficeInitialized,
        isLoading,
        isAuthenticated,
        hasProfile: !!userProfile,
        profileUsername: userProfile?.username,
      });

      lastStateRef.current = { isAuthenticated, userProfile, isLoading, isOfficeInitialized };
    }

    // Detect potential infinite loop
    if (renderCountRef.current > 50) {
      console.error("⚠️ WARNING: Too many renders detected! Possible infinite loop.");
      console.error("Current state:", {
        isOfficeInitialized,
        isLoading,
        isAuthenticated,
        hasProfile: !!userProfile,
      });
    }
  }, [isAuthenticated, userProfile, isLoading, isOfficeInitialized]);

  // --- RENDER LOGIC ---

  // 1. Show spinner while checking auth or if Office is not ready
  if (isLoading || !isOfficeInitialized) {
    const label = !isOfficeInitialized ? "در حال اتصال به Office..." : "در حال بارگذاری...";
    console.log("App: Showing LoadingSpinner -", label);
    return <LoadingSpinner label={label} />;
  }

  // 2. Show MainWorkspace if logged in and profile is fetched
  if (isAuthenticated && userProfile) {
    console.log("App: Showing MainWorkspace for user:", userProfile.username);
    return <MainWorkspace user={userProfile} />;
  }

  // 3. Show Login screen if not authenticated
  console.log("App: Showing LoginScreen");
  return <LoginScreen />;
};

export default App;
