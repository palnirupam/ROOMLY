import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/firebase/firestore";
import type { MessageDocument, MessageReply } from "@/features/chat/types";
import {
  isValidNickname,
  isValidRoomCode,
  normalizeNickname,
} from "@/features/rooms/validation";

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_REPLY_PREVIEW_LENGTH = 120;
export const MAX_REACTION_LENGTH = 16;

const MESSAGES_COLLECTION = "messages";
const ROOMS_COLLECTION = "rooms";
const INITIAL_MESSAGE_LIMIT = 100;

type MessageWriteDocument = {
  clientMessageId: string;
  createdAt: ReturnType<typeof serverTimestamp>;
  reactions: Record<string, string>;
  replyTo: MessageReply | null;
  senderNickname: string;
  senderUid: string;
  text: string;
};

export type MessageSnapshotItem = MessageDocument & {
  hasPendingWrites: boolean;
  id: string;
};

export type SendMessageInput = {
  clientMessageId: string;
  nickname: string;
  replyTo?: MessageReply;
  roomCode: string;
  text: string;
  userUid: string;
};

export type SubscribeToMessagesInput = {
  onError: (error: Error) => void;
  onMessages: (messages: MessageSnapshotItem[]) => void;
  roomCode: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const messageConverter: FirestoreDataConverter<MessageDocument> = {
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): MessageDocument {
    const rawData: unknown = snapshot.data(options);
    const data = isRecord(rawData) ? rawData : {};
    const message: MessageDocument = {
      createdAt: data.createdAt,
      senderNickname:
        typeof data.senderNickname === "string" ? data.senderNickname : "",
      senderUid: typeof data.senderUid === "string" ? data.senderUid : "",
      text: typeof data.text === "string" ? data.text : "",
    };

    if (data.editedAt) {
      message.editedAt = data.editedAt;
    }

    if (isRecord(data.reactions)) {
      const reactions: Record<string, string> = {};

      for (const [uid, emoji] of Object.entries(data.reactions)) {
        if (uid && typeof emoji === "string") {
          reactions[uid] = emoji;
        }
      }

      message.reactions = reactions;
    }

    const replyTo = data.replyTo;

    if (
      isRecord(replyTo) &&
      typeof replyTo.messageId === "string" &&
      typeof replyTo.nickname === "string" &&
      typeof replyTo.text === "string"
    ) {
      message.replyTo = {
        messageId: replyTo.messageId,
        nickname: replyTo.nickname,
        text: replyTo.text,
      };
    }

    if (typeof data.clientMessageId === "string") {
      message.clientMessageId = data.clientMessageId;
    }

    return message;
  },
  toFirestore(message: MessageDocument) {
    return message;
  },
};

function getMessagesCollection(roomCode: string) {
  return collection(
    getFirebaseFirestore(),
    ROOMS_COLLECTION,
    roomCode,
    MESSAGES_COLLECTION,
  ).withConverter(messageConverter);
}

function getMessageDocumentReference(roomCode: string, messageId: string) {
  return doc(getMessagesCollection(roomCode), messageId);
}

function removeDisallowedMessageControlCharacters(text: string) {
  return Array.from(text, (character) => {
    const characterCode = character.charCodeAt(0);
    const isAllowedWhitespace =
      characterCode === 9 || characterCode === 10 || characterCode === 13;

    if (
      (characterCode <= 31 && !isAllowedWhitespace) ||
      characterCode === 127
    ) {
      return "";
    }

    return character;
  }).join("");
}

export function normalizeMessageText(text: string) {
  return removeDisallowedMessageControlCharacters(text)
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function noopUnsubscribe() {
  return undefined;
}

export function getTimestampMs(value: unknown) {
  if (isFirestoreTimestamp(value)) {
    return value.toMillis();
  }

  return Date.now();
}

export function subscribeToMessages({
  onError,
  onMessages,
  roomCode,
}: SubscribeToMessagesInput): Unsubscribe {
  if (!isValidRoomCode(roomCode)) {
    onError(
      new Error(
        "Room code must be 1-50 characters. Symbols / ? # are not allowed.",
      ),
    );
    return noopUnsubscribe;
  }

  const messagesQuery = query(
    getMessagesCollection(roomCode),
    orderBy("createdAt", "asc"),
    limitToLast(INITIAL_MESSAGE_LIMIT),
  );

  return onSnapshot(
    messagesQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      onMessages(
        snapshot.docs.map((documentSnapshot) => ({
          ...documentSnapshot.data(),
          hasPendingWrites: documentSnapshot.metadata.hasPendingWrites,
          id: documentSnapshot.id,
        })),
      );
    },
    onError,
  );
}

export async function sendTextMessage({
  clientMessageId,
  nickname,
  replyTo,
  roomCode,
  text,
  userUid,
}: SendMessageInput) {
  const normalizedText = normalizeMessageText(text);
  const normalizedNickname = normalizeNickname(nickname);

  if (!normalizedText) {
    return;
  }

  if (!isValidRoomCode(roomCode)) {
    throw new Error(
      "Room code must be 1-50 characters. Symbols / ? # are not allowed.",
    );
  }

  if (!userUid) {
    throw new Error("Authentication is still starting. Try again.");
  }

  if (!isValidNickname(normalizedNickname)) {
    throw new Error("Nickname must be between 2 and 20 characters.");
  }

  const messageDocument: MessageWriteDocument = {
    clientMessageId,
    createdAt: serverTimestamp(),
    reactions: {},
    replyTo: replyTo
      ? {
          messageId: replyTo.messageId.slice(0, 128),
          nickname: normalizeNickname(replyTo.nickname).slice(0, 20),
          text: normalizeMessageText(replyTo.text).slice(
            0,
            MAX_REPLY_PREVIEW_LENGTH,
          ),
        }
      : null,
    senderNickname: normalizedNickname,
    senderUid: userUid,
    text: normalizedText,
  };

  await addDoc(getMessagesCollection(roomCode), messageDocument);
}

export async function editTextMessage(
  roomCode: string,
  messageId: string,
  text: string,
) {
  const normalizedText = normalizeMessageText(text);

  if (!isValidRoomCode(roomCode) || !messageId || !normalizedText) {
    throw new Error("Unable to edit this message.");
  }

  await updateDoc(getMessageDocumentReference(roomCode, messageId), {
    editedAt: serverTimestamp(),
    text: normalizedText,
  });
}

export async function deleteTextMessage(roomCode: string, messageId: string) {
  if (!isValidRoomCode(roomCode) || !messageId) {
    throw new Error("Unable to delete this message.");
  }

  await deleteDoc(getMessageDocumentReference(roomCode, messageId));
}

export async function toggleTextMessageReaction(
  roomCode: string,
  messageId: string,
  userUid: string,
  emoji: string,
) {
  const normalizedEmoji = emoji.trim().slice(0, MAX_REACTION_LENGTH);

  if (
    !isValidRoomCode(roomCode) ||
    !messageId ||
    !userUid ||
    !normalizedEmoji
  ) {
    throw new Error("Unable to react to this message.");
  }

  const firestore = getFirebaseFirestore();
  const messageReference = getMessageDocumentReference(roomCode, messageId);

  await runTransaction(firestore, async (transaction) => {
    const messageSnapshot = await transaction.get(messageReference);

    if (!messageSnapshot.exists()) {
      throw new Error("Message not found.");
    }

    const reactions = { ...(messageSnapshot.data().reactions ?? {}) };

    if (reactions[userUid] === normalizedEmoji) {
      const nextReactions = Object.fromEntries(
        Object.entries(reactions).filter(([uid]) => uid !== userUid),
      );
      transaction.update(messageReference, { reactions: nextReactions });
    } else {
      reactions[userUid] = normalizedEmoji;
      transaction.update(messageReference, { reactions });
    }
  });
}

export function createClientMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString()}-${Math.random().toString(36).slice(2)}`;
}

export function getMessageErrorMessage(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You are offline. Reconnect and try again.";
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("permission")) {
      return "Message access is blocked by Firestore rules.";
    }

    return error.message;
  }

  return "Unable to sync messages.";
}

function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  );
}
