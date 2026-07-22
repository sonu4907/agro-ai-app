import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut,
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
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid,
    displayName: name,
    email,
    provider: "password",
    emailVerified: false,
    createdAt: serverTimestamp(),
  });

  try {
    await sendEmailVerification(credential.user);
  } catch (verificationError) {
    console.warn("Could not send verification email:", verificationError);
  }

  return credential.user;
}

export async function login(
  email: string,
  password: string
) {
  const credential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  console.log("Login attempt for:", credential.user.email, "UID:", credential.user.uid);

  // Check if user exists in Firestore (only users who signed up through our app)
  const userDoc = await getDoc(doc(db, "users", credential.user.uid));
  console.log("User document exists:", userDoc.exists());

  if (!userDoc.exists()) {
    console.log("User not found in Firestore, signing out...");
    await signOut(auth);
    throw new Error("No account found with this email. Please sign up first.");
  }

  // Allow login as long as the user has a Firestore user record and credentials match.
  // Do not require email verification for immediate dashboard access.
  await setDoc(
    doc(db, "users", credential.user.uid),
    {
      lastLoginAt: serverTimestamp(),
    },
    { merge: true }
  );

  console.log("User found in Firestore, login successful");
  return credential.user;
}

export async function googleLogin() {
  const credential = await signInWithPopup(auth, googleProvider);

  console.log("Google login successful for:", credential.user.email, "UID:", credential.user.uid);

  const userDoc = await getDoc(doc(db, "users", credential.user.uid));
  const userExists = userDoc.exists();

  if (!userExists) {
    console.log("New Google user, creating Firestore record...");
    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      displayName: credential.user.displayName || credential.user.email?.split("@")[0] || "Google User",
      email: credential.user.email || "",
      provider: "google.com",
      emailVerified: credential.user.emailVerified,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    console.log("Existing Google user, updating last login...");
    await setDoc(
      doc(db, "users", credential.user.uid),
      {
        displayName: credential.user.displayName,
        email: credential.user.email,
        emailVerified: credential.user.emailVerified,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return credential.user;
}
