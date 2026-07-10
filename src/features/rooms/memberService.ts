import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/firebase/firestore";
import { isValidNickname, isValidRoomCode } from "@/features/rooms/validation";

const ROOMS_COLLECTION = "rooms";
const MEMBERS_COLLECTION = "members";

export type Member = {
  uid: string;
  nickname: string;
  joinedAt: Timestamp;
};

export function getMemberDocumentReference(roomCode: string, userUid: string) {
  return doc(
    getFirebaseFirestore(),
    ROOMS_COLLECTION,
    roomCode,
    MEMBERS_COLLECTION,
    userUid,
  );
}

export async function joinRoom(
  roomCode: string,
  userUid: string,
  nickname: string,
) {
  if (!isValidRoomCode(roomCode)) {
    throw new Error("Invalid room code.");
  }

  if (!userUid) {
    throw new Error("Authentication required.");
  }

  if (!isValidNickname(nickname)) {
    throw new Error("Nickname must be between 2 and 20 characters.");
  }

  await setDoc(getMemberDocumentReference(roomCode, userUid), {
    nickname,
    joinedAt: serverTimestamp(),
  });
}

export async function leaveRoom(roomCode: string, userUid: string) {
  if (!isValidRoomCode(roomCode) || !userUid) {
    return;
  }

  await deleteDoc(getMemberDocumentReference(roomCode, userUid));
}

export function subscribeToMembers(
  roomCode: string,
  onMembers: (members: Member[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!isValidRoomCode(roomCode)) {
    onError?.(new Error("Invalid room code."));
    return () => undefined;
  }

  const membersQuery = query(
    collection(
      getFirebaseFirestore(),
      ROOMS_COLLECTION,
      roomCode,
      MEMBERS_COLLECTION,
    ),
  );

  return onSnapshot(
    membersQuery,
    (snapshot) => {
      onMembers(
        snapshot.docs.map((documentSnapshot) => {
          const data = documentSnapshot.data();

          return {
            uid: documentSnapshot.id,
            nickname: data.nickname as string,
            joinedAt: data.joinedAt as Timestamp,
          };
        }),
      );
    },
    onError,
  );
}
