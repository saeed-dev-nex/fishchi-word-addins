import * as React from "react";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "./LoadingSpinner";
import { LoginScreen } from "./LoginScreen";
import { MainWorkspace } from "./MainWorkspace";

// AppProps is no longer needed as title/isOfficeInitialized are in the context
const App: React.FC = () => {
  // Get the state from the AuthContext
  const { isAuthenticated, userProfile, isLoading, isOfficeInitialized } = useAuth();

  // --- RENDER LOGIC ---

  // 1. Show spinner while checking auth or if Office is not ready
  if (isLoading || !isOfficeInitialized) {
    const label = !isOfficeInitialized ? "در حال اتصال به Office..." : "در حال بارگذاری...";
    return <LoadingSpinner label={label} />;
  }

  // 2. Show MainWorkspace if logged in and profile is fetched
  if (isAuthenticated && userProfile) {
    return <MainWorkspace user={userProfile} />;
  }

  // 3. Show Login screen if not authenticated
  return <LoginScreen />;
};

export default App;
