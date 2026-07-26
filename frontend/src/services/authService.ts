import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  sendEmailVerification,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";

const googleProvider = new GoogleAuthProvider();

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

    // Save local backup session
    localStorage.setItem("agroai_session_user", JSON.stringify({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: name || email.split("@")[0],
    }));

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

    // Save local backup session
    localStorage.setItem("agroai_session_user", JSON.stringify({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || email.split("@")[0],
    }));

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

export async function googleLogin() {
  try {
    let credential;
    try {
      credential = await signInWithPopup(auth, googleProvider);
    } catch (popupErr: any) {
      if (popupErr.code === "auth/popup-blocked" || popupErr.code === "auth/operation-not-supported-in-this-environment") {
        console.warn("Popup blocked, falling back to redirect...");
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw popupErr;
    }

    if (!credential || !credential.user) return null;

    console.log("Google login successful for:", credential.user.email);

    try {
      const userRef = doc(db, "users", credential.user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: credential.user.uid,
          displayName: credential.user.displayName || credential.user.email?.split("@")[0] || "Google User",
          email: credential.user.email || "",
          provider: "google.com",
          emailVerified: credential.user.emailVerified || true,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await setDoc(userRef, {
          displayName: credential.user.displayName,
          email: credential.user.email,
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn("Firestore record creation skipped:", fsErr);
    }

    localStorage.setItem("agroai_session_user", JSON.stringify({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || "Google User",
    }));

    return credential.user;
  } catch (error: any) {
    console.error("Google Login Error:", error);
    throw new Error(error.message || "Failed to sign in with Google.");
  }
}
