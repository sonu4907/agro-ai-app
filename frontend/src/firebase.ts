import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCrzgm6Ezm6eQxSqjvgv8XiHiCbFOa0qE0",
  authDomain: "agroai-plant-medic.firebaseapp.com",
  projectId: "agroai-plant-medic",
  storageBucket: "agroai-plant-medic.firebasestorage.app",
  messagingSenderId: "409863073454",
  appId: "1:409863073454:web:8054ddd8c2dc34642dc73f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;