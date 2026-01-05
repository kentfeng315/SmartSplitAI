import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, set, onValue, off, Database } from "firebase/database";
import { FirebaseConfig, Member, Bill } from "../types";

let app: FirebaseApp | null = null;
let db: Database | null = null;

// Initialize Firebase with provided config
export const initFirebase = (config: FirebaseConfig) => {
  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getDatabase(app);
    return true;
  } catch (error) {
    console.error("Firebase init error", error);
    return false;
  }
};

export interface RoomData {
  members: Member[];
  bills: Bill[];
  updatedAt: number;
}

export const subscribeToRoom = (
  roomId: string, 
  onData: (data: RoomData) => void
) => {
  if (!db) return () => {};

  const roomRef = ref(db, `rooms/${roomId}`);
  
  const handleData = (snapshot: any) => {
    const data = snapshot.val();
    if (data) {
      // Ensure arrays exist even if empty in DB
      const safeData: RoomData = {
        members: data.members || [],
        bills: data.bills || [],
        updatedAt: data.updatedAt || Date.now()
      };
      onData(safeData);
    }
  };

  onValue(roomRef, handleData);

  // Return cleanup function
  return () => off(roomRef);
};

export const updateRoomData = async (roomId: string, members: Member[], bills: Bill[]) => {
  if (!db) return;
  
  const roomRef = ref(db, `rooms/${roomId}`);
  // We overwrite the whole room state to ensure consistency
  // In a production app, you might want more granular updates
  await set(roomRef, {
    members,
    bills,
    updatedAt: Date.now()
  });
};
