import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/firebase/firestore";
import { isValidNickname, isValidRoomCode } from "@/features/rooms/validation";

const ROOMS_COLLECTION = "rooms";
const MEMBERS_COLLECTION = "members";

export const MEMBER_HEARTBEAT_INTERVAL_MS = 30_000;
const MEMBER_STALE_AFTER_MS = 90_000;

export type Member = {
  isTyping: boolean;
  joinedAtMs: number;
  lastReadAtMs: number;
  lastSeenAtMs: number;
  nickname: string;
  presenceId: string;
  uid: string;
};

type MillisecondTimestamp = {
  toMillis: () => number;
};

function isMillisecondTimestamp(value: unknown): value is MillisecondTimestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTimestampMs(value: unknown, fallback = 0) {
  if (isMillisecondTimestamp(value)) {
    return value.toMillis();
  }

  return fallback;
}

export function createPresenceId(userUid: string, scope = "") {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString()}-${Math.random().toString(36).slice(2)}`;

  return [userUid, scope, randomPart].filter(Boolean).join("_");
}

export function getMemberDocumentReference(
  roomCode: string,
  presenceId: string,
) {
  return doc(
    getFirebaseFirestore(),
    ROOMS_COLLECTION,
    roomCode,
    MEMBERS_COLLECTION,
    presenceId,
  );
}

export async function joinRoom(
  roomCode: string,
  presenceId: string,
  userUid: string,
  nickname: string,
) {
  if (!isValidRoomCode(roomCode)) {
    throw new Error("Invalid room code.");
  }

  if (!presenceId || !userUid) {
    throw new Error("Anonymous session is unavailable.");
  }

  if (!isValidNickname(nickname)) {
    throw new Error("Nickname must be between 2 and 20 characters.");
  }

  await setDoc(getMemberDocumentReference(roomCode, presenceId), {
    isTyping: false,
    joinedAt: serverTimestamp(),
    lastReadAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    nickname,
    uid: userUid,
  });
}

export async function heartbeatRoomMember(
  roomCode: string,
  presenceId: string,
) {
  if (!isValidRoomCode(roomCode) || !presenceId) {
    return;
  }

  await updateDoc(getMemberDocumentReference(roomCode, presenceId), {
    lastSeenAt: serverTimestamp(),
  });
}

export async function markRoomRead(roomCode: string, presenceId: string) {
  if (!isValidRoomCode(roomCode) || !presenceId) {
    return;
  }

  await updateDoc(getMemberDocumentReference(roomCode, presenceId), {
    lastReadAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  });
}

export async function setMemberTyping(
  roomCode: string,
  presenceId: string,
  isTyping: boolean,
) {
  if (!isValidRoomCode(roomCode) || !presenceId) {
    return;
  }

  await updateDoc(getMemberDocumentReference(roomCode, presenceId), {
    isTyping,
    lastSeenAt: serverTimestamp(),
  });
}

export async function leaveRoom(roomCode: string, presenceId: string) {
  if (!isValidRoomCode(roomCode) || !presenceId) {
    return;
  }

  await deleteDoc(getMemberDocumentReference(roomCode, presenceId));
}

function mergeMemberSessions(members: Member[]) {
  const membersByUid = new Map<string, Member>();

  for (const member of members) {
    const existingMember = membersByUid.get(member.uid);

    if (!existingMember) {
      membersByUid.set(member.uid, member);
      continue;
    }

    membersByUid.set(member.uid, {
      ...existingMember,
      isTyping: existingMember.isTyping || member.isTyping,
      joinedAtMs: Math.min(existingMember.joinedAtMs, member.joinedAtMs),
      lastReadAtMs: Math.max(existingMember.lastReadAtMs, member.lastReadAtMs),
      lastSeenAtMs: Math.max(existingMember.lastSeenAtMs, member.lastSeenAtMs),
      nickname:
        member.lastSeenAtMs >= existingMember.lastSeenAtMs
          ? member.nickname
          : existingMember.nickname,
    });
  }

  return [...membersByUid.values()].sort(
    (leftMember, rightMember) => leftMember.joinedAtMs - rightMember.joinedAtMs,
  );
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

  let snapshotMembers: Member[] = [];

  function emitActiveMembers() {
    const staleThreshold = Date.now() - MEMBER_STALE_AFTER_MS;
    const activeMembers = snapshotMembers.filter(
      (member) => member.lastSeenAtMs >= staleThreshold,
    );

    onMembers(mergeMemberSessions(activeMembers));
  }

  const membersQuery = query(
    collection(
      getFirebaseFirestore(),
      ROOMS_COLLECTION,
      roomCode,
      MEMBERS_COLLECTION,
    ),
  );

  const unsubscribeSnapshot = onSnapshot(
    membersQuery,
    (snapshot) => {
      snapshotMembers = snapshot.docs.map((documentSnapshot) => {
        const rawData: unknown = documentSnapshot.data({
          serverTimestamps: "estimate",
        });
        const data = isRecord(rawData) ? rawData : {};
        const joinedAtMs = getTimestampMs(data.joinedAt, Date.now());

        return {
          isTyping: data.isTyping === true,
          joinedAtMs,
          lastReadAtMs: getTimestampMs(data.lastReadAt),
          lastSeenAtMs: getTimestampMs(data.lastSeenAt, joinedAtMs),
          nickname:
            typeof data.nickname === "string" ? data.nickname : "Anonymous",
          presenceId: documentSnapshot.id,
          uid: typeof data.uid === "string" ? data.uid : documentSnapshot.id,
        };
      });

      emitActiveMembers();
    },
    onError,
  );

  const staleCheckIntervalId = window.setInterval(
    emitActiveMembers,
    MEMBER_HEARTBEAT_INTERVAL_MS,
  );

  return () => {
    window.clearInterval(staleCheckIntervalId);
    unsubscribeSnapshot();
  };
}
