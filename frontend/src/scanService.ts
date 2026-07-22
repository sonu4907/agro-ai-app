import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "./firebase";

export async function saveScan(uid: string, scan: any) {
  return await addDoc(
    collection(db, "users", uid, "scans"),
    {
      ...scan,
      ownerUid: uid,
      createdAt: serverTimestamp(),
    }
  );
}

export async function getUserScans(uid: string): Promise<any[]> {
  const q = query(
    collection(db, "users", uid, "scans"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function deleteUserScan(uid: string, scanId: string) {
  await deleteDoc(doc(db, "users", uid, "scans", scanId));
}