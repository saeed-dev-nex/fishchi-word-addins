import * as React from "react";
import { UserProfile } from "../types/fishchi";
import * as authService from "../services/authService";
import { apiGetSelfProfile } from "../services/api";

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

  // This effect runs when Office is ready
  React.useEffect(() => {
    if (!isOfficeInitialized) {
      console.log("AuthProvider: Waiting for Office to initialize...");
      return;
    }
    console.log("AuthProvider: Office is ready. Checking login status...");

    const checkLoginStatus = async () => {
      setIsLoading(true);
      const storedToken = await authService.getToken();
      if (storedToken) {
        // We found a token. Now we must validate it by fetching the user profile.
        // We update the local token state so api.ts can use it

        setToken(storedToken);

        try {
          console.log("AuthProvider: Validating token by fetching profile...");
          const profile = await apiGetSelfProfile(storedToken);
          setUserProfile(profile);
          setIsAuthenticated(true);
          console.log("AuthProvider: Token validated. User is logged in.", profile.username);
        } catch (error) {
          console.error("AuthProvider: Token validation failed.", error);
          // Token is invalid or expired, remove it
          await authService.removeToken();
          setToken(null);
        }
      } else {
        console.log("AuthProvider: No token found.");
      }
      setIsLoading(false);
    };

    checkLoginStatus();
  }, [isOfficeInitialized]);

  const login = async () => {
    setIsLoading(true);
    try {
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
      const profile = await apiGetSelfProfile(receivedToken);
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
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    // 1. Clear React state
    setIsAuthenticated(false);
    setUserProfile(null);
    setToken(null);

    // 2. Remove from persistent storage
    await authService.removeToken();
    console.log("AuthProvider: User logged out.");
    setIsLoading(false);
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
