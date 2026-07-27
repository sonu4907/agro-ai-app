import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
} from "firebase/auth";
import type { User } from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";

const googleProvider = new GoogleAuthProvider();

function saveSessionUser(user: Pick<User, "uid" | "email" | "displayName">) {
  localStorage.setItem("agroai_session_user", JSON.stringify({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "Google User",
  }));
}

async function ensureFirestoreProfile(user: User, provider: string) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    const profileData = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || "User",
      email: user.email || "",
      provider,
      emailVerified: user.emailVerified || false,
      lastLoginAt: serverTimestamp(),
    };

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        ...profileData,
        createdAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await setDoc(userRef, profileData, { merge: true });
    }
  } catch (fsErr) {
    console.warn("Firestore profile sync skipped:", fsErr);
  }
}

export async function signup(
  name: string,
  email: string,
  password: string
) {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Provision user document in Firestore
    try {
      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        displayName: name || email.split("@")[0],
        email: email,
        provider: "password",
        emailVerified: credential.user.emailVerified || false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
    } catch (dbError) {
      console.warn("Could not save user profile to Firestore (proceeding with Auth):", dbError);
    }

    try {
      await sendEmailVerification(credential.user);
    } catch (verificationError) {
      console.warn("Could not send verification email:", verificationError);
    }

    saveSessionUser({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: name || email.split("@")[0],
    });

    return credential.user;
  } catch (error: any) {
    let msg = error.message;
    if (error.code === "auth/email-already-in-use") {
      msg = "An account with this email already exists. Please sign in.";
    } else if (error.code === "auth/invalid-email") {
      msg = "Invalid email address format.";
    } else if (error.code === "auth/weak-password") {
      msg = "Password should be at least 6 characters.";
    }
    throw new Error(msg);
  }
}

export async function login(
  email: string,
  password: string
) {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    console.log("Login successful for:", credential.user.email, "UID:", credential.user.uid);

    // Auto-provision or update Firestore profile without locking out valid users
    try {
      const userRef = doc(db, "users", credential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log("User missing in Firestore, auto-creating profile...");
        await setDoc(userRef, {
          uid: credential.user.uid,
          displayName: credential.user.displayName || email.split("@")[0],
          email: credential.user.email || email,
          provider: "password",
          emailVerified: credential.user.emailVerified || false,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
      }
    } catch (fsErr) {
      console.warn("Firestore update skipped (network/permissions):", fsErr);
    }

    saveSessionUser({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || email.split("@")[0],
    });

    return credential.user;
  } catch (error: any) {
    console.error("Login Error:", error);
    let msg = error.message;
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
      msg = "Invalid email or password. Please check your credentials.";
    } else if (error.code === "auth/invalid-email") {
      msg = "Please enter a valid email address.";
    } else if (error.code === "auth/too-many-requests") {
      msg = "Access blocked due to multiple failed attempts. Please reset password or try later.";
    }
    throw new Error(msg);
  }
}

export async function completeGoogleRedirectSignIn() {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) {
      return null;
    }

    await ensureFirestoreProfile(result.user, "google.com");
    saveSessionUser(result.user);
    return result.user;
  } catch (error: any) {
    console.error("Google redirect sign-in error:", error);
    throw new Error(error.message || "Google sign-in could not be completed.");
  }
}

export async function googleLogin() {
  try {
    const credential = await signInWithPopup(auth, googleProvider);

    if (!credential || !credential.user) return null;

    console.log("Google login successful for:", credential.user.email);
    await ensureFirestoreProfile(credential.user, "google.com");
    saveSessionUser(credential.user);

    return credential.user;
  } catch (error: any) {
    if (error.code === "auth/popup-blocked" || error.code === "auth/operation-not-supported-in-this-environment") {
      console.warn("Popup blocked, redirecting to Google sign-in...");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Google sign-in was cancelled.");
    }

    console.error("Google Login Error:", error);
    throw new Error(error.message || "Failed to sign in with Google.");
  }
}
