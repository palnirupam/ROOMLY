import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentReference,
  type FieldValue,
  type Timestamp,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/firebase/firestore";
import { isValidRoomCode } from "@/features/rooms/validation";

export const ROOM_SCHEMA_VERSION = 1;
const ROOMS_COLLECTION = "rooms";
const MESSAGES_COLLECTION = "messages";
const MESSAGE_BATCH_SIZE = 100;

export type RoomDocument = {
  createdAt: Timestamp;
  createdByUid: string;
  roomCode: string;
  schemaVersion: number;
};

type RoomWriteDocument = Omit<RoomDocument, "createdAt"> & {
  createdAt: FieldValue;
};

export type JoinRoomResult = {
  created: boolean;
  roomCode: string;
};

export function getRoomDocumentReference(roomCode: string) {
  return doc(
    getFirebaseFirestore(),
    ROOMS_COLLECTION,
    roomCode,
  ) as DocumentReference<RoomDocument>;
}

export async function joinOrCreateRoom(
  roomCode: string,
  userUid: string,
): Promise<JoinRoomResult> {
  if (!isValidRoomCode(roomCode)) {
    throw new Error(
      "Room code must be 1-50 characters. Symbols / ? # are not allowed.",
    );
  }

  if (!userUid) {
    throw new Error("Authentication is still starting. Try again.");
  }

  const firestore = getFirebaseFirestore();
  const roomReference = getRoomDocumentReference(roomCode);

  return runTransaction(firestore, async (transaction) => {
    const roomSnapshot = await transaction.get(roomReference);

    if (roomSnapshot.exists()) {
      return {
        created: false,
        roomCode,
      };
    }

    const roomDocument: RoomWriteDocument = {
      createdAt: serverTimestamp(),
      createdByUid: userUid,
      roomCode,
      schemaVersion: ROOM_SCHEMA_VERSION,
    };

    transaction.set(roomReference, roomDocument);

    return {
      created: true,
      roomCode,
    };
  });
}

export async function deleteRoom(
  roomCode: string,
  userUid: string,
): Promise<void> {
  if (!isValidRoomCode(roomCode)) {
    throw new Error(
      "Room code must be 1-50 characters. Symbols / ? # are not allowed.",
    );
  }

  if (!userUid) {
    throw new Error("Authentication is still starting. Try again.");
  }

  const firestore = getFirebaseFirestore();
  const roomReference = getRoomDocumentReference(roomCode);
  const roomSnapshot = await getDoc(roomReference);

  if (!roomSnapshot.exists()) {
    throw new Error("Room not found.");
  }

  if (roomSnapshot.data().createdByUid !== userUid) {
    throw new Error("Only the room creator can delete this room.");
  }

  const messagesReference = collection(
    firestore,
    ROOMS_COLLECTION,
    roomCode,
    MESSAGES_COLLECTION,
  );

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const messagesQuery = query(
      messagesReference,
      orderBy("createdAt", "asc"),
      limit(MESSAGE_BATCH_SIZE),
    );

    const messagesSnapshot = await getDocs(messagesQuery);

    if (messagesSnapshot.empty) {
      break;
    }

    const batch = writeBatch(firestore);
    let deletedCount = 0;

    for (const messageDocument of messagesSnapshot.docs) {
      batch.delete(messageDocument.ref);
      deletedCount++;
    }

    await batch.commit();

    if (deletedCount < MESSAGE_BATCH_SIZE) {
      break;
    }
  }

  const membersReference = collection(
    firestore,
    ROOMS_COLLECTION,
    roomCode,
    "members",
  );

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const membersQuery = query(membersReference, limit(MESSAGE_BATCH_SIZE));

    const membersSnapshot = await getDocs(membersQuery);

    if (membersSnapshot.empty) {
      break;
    }

    const batch = writeBatch(firestore);

    for (const memberDocument of membersSnapshot.docs) {
      batch.delete(memberDocument.ref);
    }

    await batch.commit();
  }

  await deleteDoc(roomReference);
}
