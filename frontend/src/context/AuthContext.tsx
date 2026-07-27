import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";

import { auth } from "../firebase";
import { db } from "../firebase";
import { getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { completeGoogleRedirectSignIn } from "../services/authService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  loginAsDemo: () => {},
});

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true" || window.location.hash === "#demo") {
      return {
        uid: "demo-user-id",
        email: "demo@agroai.com",
        displayName: "Demo Farmer",
        emailVerified: true,
      } as any;
    }

    const backup = localStorage.getItem("agroai_session_user");
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        return {
          uid: parsed.uid || "local-user-id",
          email: parsed.email || "",
          displayName: parsed.displayName || "AgroAI User",
          emailVerified: true,
        } as any;
      } catch {
        // ignore invalid json
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("demo") === "true" ||
      window.location.hash === "#demo" ||
      localStorage.getItem("agroai_session_user")
    ) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true" || window.location.hash === "#demo") {
      setLoading(false);
      return;
    }

    let active = true;

    const finalizeAuth = async () => {
      try {
        const redirectedUser = await completeGoogleRedirectSignIn();
        if (!active) return;

        if (redirectedUser) {
          setUser(redirectedUser as any);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Failed to finalize Google redirect sign-in:", error);
      }

      const unsubscribe = onAuthStateChanged(auth, async currentUser => {
        if (!active) return;

        if (!currentUser) {
          const backup = localStorage.getItem("agroai_session_user");
          if (!backup) {
            setUser(null);
          }
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const userExists = userDoc.exists();

          if (userExists) {
            setUser(currentUser);
          } else {
            const name = currentUser.displayName || currentUser.email?.split("@")[0] || "User";
            await setDoc(doc(db, "users", currentUser.uid), {
              uid: currentUser.uid,
              displayName: name,
              email: currentUser.email || "",
              provider: currentUser.providerData[0]?.providerId || "password",
              emailVerified: currentUser.emailVerified,
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            }, { merge: true });
            setUser(currentUser);
          }
        } catch (e) {
          console.error("Error validating signed-in user:", e);
          setUser(currentUser);
        } finally {
          setLoading(false);
        }
      });

      return unsubscribe;
    };

    const cleanupPromise = finalizeAuth();

    return () => {
      active = false;
      cleanupPromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, []);

  async function logout() {
    localStorage.removeItem("agroai_session_user");
    await signOut(auth);
    setUser(null);
  }

  function loginAsDemo() {
    setUser({
      uid: "demo-user-id",
      email: "demo@agroai.com",
      displayName: "Demo Farmer",
      emailVerified: true,
    } as any);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}