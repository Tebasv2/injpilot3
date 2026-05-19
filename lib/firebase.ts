import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: any;
let db: any;

if (firebaseConfig.apiKey) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
}

export { db };

export async function saveMessage(walletAddress: string, message: {
  role: string;
  content: string;
  timestamp: number;
}) {
  if (!db) return;
  await addDoc(collection(db, 'chats', walletAddress, 'messages'), message);
}

export async function loadChatHistory(walletAddress: string, limitCount = 50) {
  if (!db) return [];
  const q = query(
    collection(db, 'chats', walletAddress, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc: any) => doc.data());
}