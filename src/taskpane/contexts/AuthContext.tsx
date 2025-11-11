import * as React from "react";
import { UserProfile } from "../types/fishchi";
import * as authService from "../services/authService";
import { apiGetSelfProfile } from "../services/api";

// Timeout for API operations to prevent infinite loading
const API_TIMEOUT_MS = 15000; // 15 seconds

interface AuthContextType {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isOfficeInitialized: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  isOfficeInitialized: boolean;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, isOfficeInitialized }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Ref to prevent multiple simultaneous checkLoginStatus calls
  const isCheckingLogin = React.useRef(false);

  /**
   * Helper function to wrap promises with timeout
   */
  const withTimeout = <T,>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
    ]);
  };

  // This effect runs when Office is ready
  React.useEffect(() => {
    if (!isOfficeInitialized) {
      console.log("AuthProvider: Waiting for Office to initialize...");
      return;
    }

    // Prevent multiple simultaneous checks
    if (isCheckingLogin.current) {
      console.log("AuthProvider: Login check already in progress, skipping...");
      return;
    }

    console.log("AuthProvider: Office is ready. Checking login status...");

    const checkLoginStatus = async () => {
      // Set flag to prevent concurrent calls
      if (isCheckingLogin.current) {
        console.log("AuthProvider: Already checking login, aborting duplicate call");
        return;
      }

      isCheckingLogin.current = true;
      console.log("AuthProvider: checkLoginStatus() started");

      try {
        setIsLoading(true);
        const storedToken = await authService.getToken();
        console.log("AuthProvider: Token check result:", storedToken ? "TOKEN EXISTS" : "NO TOKEN");

        if (storedToken) {
          // We found a token. Now we must validate it by fetching the user profile.
          // We update the local token state so api.ts can use it

          setToken(storedToken);
          console.log("AuthProvider: Token set in state, length:", storedToken.length);

          try {
            console.log("AuthProvider: Validating token by fetching profile...");
            console.log("AuthProvider: Starting profile fetch with timeout:", API_TIMEOUT_MS, "ms");

            const profile = await withTimeout(
              apiGetSelfProfile(storedToken),
              API_TIMEOUT_MS,
              "Token validation timed out. Please check your connection."
            );

            console.log("AuthProvider: Profile received:", {
              hasProfile: !!profile,
              username: profile?.username,
              email: profile?.email,
              id: profile?._id,
            });

            // Validate profile has required fields
            if (!profile || (!profile._id && !profile.username && !profile.email)) {
              console.error("AuthProvider: Profile validation failed - missing required fields");
              throw new Error("Invalid profile data received from server");
            }

            setUserProfile(profile);
            setIsAuthenticated(true);
            console.log(
              "✅ AuthProvider: Token validated. User is logged in:",
              profile.username || profile.email
            );
            console.log("✅ AuthProvider: Authentication successful! Setting up workspace...");
          } catch (error: any) {
            console.error("❌ AuthProvider: Token validation failed.", error);
            console.error("Error details:", {
              message: error?.message || "Unknown error",
              name: error?.name,
              stack: error?.stack,
            });
            // Token is invalid or expired, remove it and reset state
            console.log("AuthProvider: Removing invalid token and resetting state...");
            await authService.removeToken();
            setToken(null);
            setIsAuthenticated(false);
            setUserProfile(null);
            console.log("AuthProvider: State reset complete. User will see login screen.");
          }
        } else {
          console.log("AuthProvider: No token found. User needs to login.");
          // Ensure auth state is cleared
          setIsAuthenticated(false);
          setUserProfile(null);
          setToken(null);
        }
      } catch (error: any) {
        console.error("❌ AuthProvider: Critical error in checkLoginStatus:", error);
        console.error("Critical error details:", {
          message: error?.message,
          stack: error?.stack,
        });
        // Reset all auth state on critical error
        setIsAuthenticated(false);
        setUserProfile(null);
        setToken(null);
      } finally {
        // Always set loading to false, even if there's an error
        console.log("AuthProvider: checkLoginStatus() complete. Setting isLoading = false");
        setIsLoading(false);
        // Reset flag to allow future checks
        isCheckingLogin.current = false;
        console.log("AuthProvider: Final state:", {
          isAuthenticated: isAuthenticated,
          hasProfile: !!userProfile,
          isLoading: false,
        });
      }
    };

    checkLoginStatus();
  }, [isOfficeInitialized]);

  const login = async () => {
    try {
      setIsLoading(true);
      // 1. Open dialog and get token
      console.log("AuthProvider: Step 1 - Opening login dialog...");
      const receivedToken = await authService.loginWithDialog();
      console.log(
        "AuthProvider: Step 1 - Token received:",
        receivedToken ? "Yes (length: " + receivedToken.length + ")" : "No"
      );
      setToken(receivedToken);

      // 2. Store token securely
      console.log("AuthProvider: Step 2 - Storing token...");
      await authService.storeToken(receivedToken);
      console.log("AuthProvider: Step 2 - Token stored successfully");

      // 3. Fetch user profile with new token
      console.log("AuthProvider: Step 3 - Fetching user profile...");
      const profile = await withTimeout(
        apiGetSelfProfile(receivedToken),
        API_TIMEOUT_MS,
        "Profile fetch timed out. Please try again."
      );
      console.log("AuthProvider: Step 3 - Profile received:", profile);

      if (!profile) {
        throw new Error("Profile is null or undefined");
      }

      setUserProfile(profile);
      setIsAuthenticated(true);
      console.log("AuthProvider: Login successful!", profile.username);
    } catch (error: any) {
      console.error("AuthProvider: Login process failed.");
      console.error("Error message:", error.message);
      console.error("Full error:", error);
      console.error("Error stack:", error.stack);
      setIsAuthenticated(false);
      setUserProfile(null);
      setToken(null);
      // Remove invalid token from storage
      await authService.removeToken();
    } finally {
      // Always set loading to false, even if there's an error
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      // 1. Clear React state
      setIsAuthenticated(false);
      setUserProfile(null);
      setToken(null);

      // 2. Remove from persistent storage
      await authService.removeToken();
      console.log("AuthProvider: User logged out.");
    } catch (error) {
      console.error("AuthProvider: Error during logout:", error);
      // Still clear state even if storage removal fails
      setIsAuthenticated(false);
      setUserProfile(null);
      setToken(null);
    } finally {
      // Always set loading to false
      setIsLoading(false);
    }
  };

  const value = {
    isAuthenticated,
    userProfile,
    token,
    isLoading,
    isOfficeInitialized, // Pass this down
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access the AuthContext.
 */
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
