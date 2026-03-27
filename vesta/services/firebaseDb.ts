import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
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
  certificateTokenId?: string;
  certificateExplorerUrl?: string;
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

export async function linkWineToCertificate(uid: string, wineId: string, certificateTokenId: string, explorerUrl?: string) {
  await updateDoc(doc(db, "users", uid, "wines", wineId), {
    certificateTokenId,
    ...(explorerUrl ? { certificateExplorerUrl: explorerUrl } : {}),
  });
}

// ==============
// CERTIFICATES
// ==============
export interface Certificate {
  id: string;
  tokenId: string;
  txHash: string;
  explorerUrl: string;
  ndvi: number;
  ndre: number;
  ndwi: number;
  bbox: number[];
  coordenadas: string;
  climateEvent: string;
  chain: string;
  createdAt?: any;
}

export async function saveCertificate(uid: string, data: Omit<Certificate, "id" | "createdAt">) {
  try {
    const docRef = await addDoc(collection(db, "users", uid, "certificates"), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Error guardando certificado:", err);
    throw err;
  }
}

export async function getCertificates(uid: string): Promise<Certificate[]> {
  try {
    const q = query(collection(db, "users", uid, "certificates"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Certificate[];
  } catch (err) {
    console.error("Error buscando certificados:", err);
    return [];
  }
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

// ==============
// ANALYSES
// ==============
// El docId es el bbox sanitizado: "bbox_-69_26_-33_69_-69_21_-33_64"
function bboxToKey(bbox: number[]): string {
  return "bbox_" + bbox.map(n => n.toFixed(4).replace(/[.-]/g, "_")).join("__");
}

export async function saveAnalysis(uid: string, bbox: number[], data: object) {
  try {
    const key = bboxToKey(bbox);
    await setDoc(doc(db, "users", uid, "analyses", key), {
      ...data,
      bbox,
      savedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error guardando análisis:", err);
  }
}

export async function getAnalysis(uid: string, bbox: number[]): Promise<(object & { savedAt?: any }) | null> {
  try {
    const key = bboxToKey(bbox);
    const snap = await getDoc(doc(db, "users", uid, "analyses", key));
    if (!snap.exists()) return null;
    return snap.data() as object;
  } catch {
    return null;
  }
}
