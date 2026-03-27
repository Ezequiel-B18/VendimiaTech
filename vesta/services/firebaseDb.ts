import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";

export interface Parcel {
  id: string;
  name: string;
  bbox: [number, number, number, number];
  createdAt?: any;
}

export interface Wine {
  id: string;
  name: string;
  variety: string;
  year: string;
  imageUrl: string;
  createdAt?: any;
}

// ==============
// VESTA PARCELS
// ==============
export async function addParcel(uid: string, name: string, bbox: [number, number, number, number]) {
  try {
    const docRef = await addDoc(collection(db, "users", uid, "parcels"), {
      name,
      bbox,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error("Error guardando parcela:", err);
    throw err;
  }
}

export async function getParcels(uid: string): Promise<Parcel[]> {
  try {
    const q = query(collection(db, "users", uid, "parcels"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Parcel[];
  } catch (err) {
    console.error("Error buscando parcelas:", err);
    return [];
  }
}

// ==============
// VESTA WINES
// ==============
export async function addWine(uid: string, name: string, variety: string, year: string, imageUrl: string) {
  try {
    const docRef = await addDoc(collection(db, "users", uid, "wines"), {
      name,
      variety,
      year,
      imageUrl,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error("Error agregando vino:", err);
    throw err;
  }
}

export async function updateWineImageUrl(uid: string, wineId: string, imageUrl: string) {
  await updateDoc(doc(db, "users", uid, "wines", wineId), { imageUrl });
}

export async function getWines(uid: string): Promise<Wine[]> {
  try {
    const q = query(collection(db, "users", uid, "wines"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Wine[];
  } catch (err) {
    console.error("Error buscando vinos:", err);
    return [];
  }
}
