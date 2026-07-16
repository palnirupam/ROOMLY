import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createClientMessageId,
  deleteTextMessage,
  editTextMessage,
  getMessageErrorMessage,
  getTimestampMs,
  MAX_MESSAGE_LENGTH,
  normalizeMessageText,
  sendTextMessage,
  subscribeToMessages,
  toggleTextMessageReaction,
  type MessageSnapshotItem,
} from "@/features/chat/messageService";
import type {
  ChatConnectionStatus,
  ChatMessage,
  MessageReaction,
  MessageReply,
} from "@/features/chat/types";

type FailedMessage = {
  clientMessageId: string;
  createdAtMs: number;
  replyTo?: MessageReply;
  text: string;
};

type MillisecondTimestamp = {
  toMillis: () => number;
};

type UseMessagesInput = {
  nickname: string;
  roomCode: string;
  userUid: string;
};

type UseMessagesResult = {
  connectionStatus: ChatConnectionStatus;
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, text: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
  isSending: boolean;
  messages: ChatMessage[];
  retryConnection: () => void;
  sendMessage: (text: string, replyTo?: MessageReply) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
};

const messageTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatTimestamp(timestampMs: number) {
  return messageTimeFormatter.format(timestampMs);
}

function isMillisecondTimestamp(value: unknown): value is MillisecondTimestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  );
}

function getComparableTimestampMs(value: unknown) {
  if (isMillisecondTimestamp(value)) {
    return value.toMillis();
  }

  return null;
}

function areReactionRecordsEqual(
  currentReactions: Record<string, string> | undefined,
  nextReactions: Record<string, string> | undefined,
) {
  const currentEntries = Object.entries(currentReactions ?? {});
  const nextEntries = Object.entries(nextReactions ?? {});

  return (
    currentEntries.length === nextEntries.length &&
    currentEntries.every(([uid, emoji]) => nextReactions?.[uid] === emoji)
  );
}

function areRepliesEqual(
  currentReply: MessageReply | null | undefined,
  nextReply: MessageReply | null | undefined,
) {
  return (
    currentReply?.messageId === nextReply?.messageId &&
    currentReply?.nickname === nextReply?.nickname &&
    currentReply?.text === nextReply?.text
  );
}

function areSnapshotMessagesEqual(
  currentMessages: MessageSnapshotItem[],
  nextMessages: MessageSnapshotItem[],
) {
  if (currentMessages.length !== nextMessages.length) {
    return false;
  }

  return currentMessages.every((currentMessage, index) => {
    const nextMessage = nextMessages[index];

    if (!nextMessage) {
      return false;
    }

    const currentTimestampMs = getComparableTimestampMs(
      currentMessage.createdAt,
    );
    const nextTimestampMs = getComparableTimestampMs(nextMessage.createdAt);
    const currentEditedAtMs = getComparableTimestampMs(currentMessage.editedAt);
    const nextEditedAtMs = getComparableTimestampMs(nextMessage.editedAt);

    return (
      currentMessage.id === nextMessage.id &&
      currentMessage.clientMessageId === nextMessage.clientMessageId &&
      currentMessage.senderNickname === nextMessage.senderNickname &&
      currentMessage.senderUid === nextMessage.senderUid &&
      currentMessage.text === nextMessage.text &&
      currentMessage.hasPendingWrites === nextMessage.hasPendingWrites &&
      currentTimestampMs === nextTimestampMs &&
      currentEditedAtMs === nextEditedAtMs &&
      areReactionRecordsEqual(
        currentMessage.reactions,
        nextMessage.reactions,
      ) &&
      areRepliesEqual(currentMessage.replyTo, nextMessage.replyTo)
    );
  });
}

function buildReactionSummary(
  reactions: Record<string, string> | undefined,
  userUid: string,
) {
  const reactionsByEmoji = new Map<string, MessageReaction>();

  for (const [uid, emoji] of Object.entries(reactions ?? {})) {
    const existingReaction = reactionsByEmoji.get(emoji);

    if (existingReaction) {
      existingReaction.count += 1;
      existingReaction.reactedByCurrentUser ||= uid === userUid;
      continue;
    }

    reactionsByEmoji.set(emoji, {
      count: 1,
      emoji,
      reactedByCurrentUser: uid === userUid,
    });
  }

  return [...reactionsByEmoji.values()].sort((leftReaction, rightReaction) =>
    leftReaction.emoji.localeCompare(rightReaction.emoji),
  );
}

function toChatMessage(
  message: MessageSnapshotItem,
  userUid: string,
): ChatMessage {
  const createdAtMs = getTimestampMs(message.createdAt);

  const editedAtMs = getComparableTimestampMs(message.editedAt);

  return {
    clientMessageId: message.clientMessageId,
    createdAtMs,
    ...(editedAtMs ? { editedAtMs } : {}),
    id: message.id,
    isOwn: message.senderUid === userUid,
    nickname: message.senderNickname,
    reactions: buildReactionSummary(message.reactions, userUid),
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    senderUid: message.senderUid,
    status: message.hasPendingWrites ? "pending" : "sent",
    text: message.text,
    timestampLabel: message.hasPendingWrites
      ? "Sending"
      : formatTimestamp(createdAtMs),
  };
}

export function useMessages({
  nickname,
  roomCode,
  userUid,
}: UseMessagesInput): UseMessagesResult {
  const [snapshotMessages, setSnapshotMessages] = useState<
    MessageSnapshotItem[]
  >([]);
  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }

    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToMessages({
      roomCode,
      onMessages: (messages) => {
        setSnapshotMessages((currentMessages) =>
          areSnapshotMessagesEqual(currentMessages, messages)
            ? currentMessages
            : messages,
        );
        setIsLoading((currentIsLoading) =>
          currentIsLoading ? false : currentIsLoading,
        );
        setError((currentError) => (currentError ? null : currentError));
      },
      onError: (messagesError) => {
        const nextError = getMessageErrorMessage(messagesError);

        setError((currentError) =>
          currentError === nextError ? currentError : nextError,
        );
        setIsLoading((currentIsLoading) =>
          currentIsLoading ? false : currentIsLoading,
        );
      },
    });

    return unsubscribe;
  }, [retryKey, roomCode]);

  const retryFailedMessage = useCallback(
    async (failedMessage: FailedMessage) => {
      setFailedMessages((currentFailedMessages) =>
        currentFailedMessages.filter(
          (message) =>
            message.clientMessageId !== failedMessage.clientMessageId,
        ),
      );

      try {
        await sendTextMessage({
          clientMessageId: failedMessage.clientMessageId,
          nickname,
          ...(failedMessage.replyTo ? { replyTo: failedMessage.replyTo } : {}),
          roomCode,
          text: failedMessage.text,
          userUid,
        });
      } catch (sendError) {
        setError(getMessageErrorMessage(sendError));
        setFailedMessages((currentFailedMessages) => [
          ...currentFailedMessages,
          failedMessage,
        ]);
      }
    },
    [nickname, roomCode, userUid],
  );

  const sendMessage = useCallback(
    async (text: string, replyTo?: MessageReply) => {
      const normalizedText = normalizeMessageText(text);

      if (!normalizedText) {
        return;
      }

      const clientMessageId = createClientMessageId();

      try {
        setIsSending(true);
        setError(null);
        await sendTextMessage({
          clientMessageId,
          nickname,
          ...(replyTo ? { replyTo } : {}),
          roomCode,
          text: normalizedText,
          userUid,
        });
      } catch (sendError) {
        setError(getMessageErrorMessage(sendError));
        setFailedMessages((currentFailedMessages) => [
          ...currentFailedMessages,
          {
            clientMessageId,
            createdAtMs: Date.now(),
            ...(replyTo ? { replyTo } : {}),
            text: normalizedText,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [nickname, roomCode, userUid],
  );

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      try {
        setError(null);
        await editTextMessage(roomCode, messageId, text);
      } catch (editError) {
        setError(getMessageErrorMessage(editError));
        throw editError;
      }
    },
    [roomCode],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        setError(null);
        await deleteTextMessage(roomCode, messageId);
      } catch (deleteError) {
        setError(getMessageErrorMessage(deleteError));
        throw deleteError;
      }
    },
    [roomCode],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        setError(null);
        await toggleTextMessageReaction(roomCode, messageId, userUid, emoji);
      } catch (reactionError) {
        setError(getMessageErrorMessage(reactionError));
      }
    },
    [roomCode, userUid],
  );

  const messages = useMemo(() => {
    const snapshotClientIds = new Set(
      snapshotMessages
        .map((message) => message.clientMessageId)
        .filter((clientMessageId) => Boolean(clientMessageId)),
    );

    const syncedMessages = snapshotMessages.map((message) =>
      toChatMessage(message, userUid),
    );

    const visibleFailedMessages = failedMessages
      .filter(
        (failedMessage) =>
          !snapshotClientIds.has(failedMessage.clientMessageId),
      )
      .map<ChatMessage>((failedMessage) => ({
        clientMessageId: failedMessage.clientMessageId,
        createdAtMs: failedMessage.createdAtMs,
        id: failedMessage.clientMessageId,
        isOwn: true,
        nickname,
        reactions: [],
        ...(failedMessage.replyTo ? { replyTo: failedMessage.replyTo } : {}),
        retry: () => {
          void retryFailedMessage(failedMessage);
        },
        senderUid: userUid,
        status: "failed",
        text: failedMessage.text,
        timestampLabel: "Failed",
      }));

    return [...syncedMessages, ...visibleFailedMessages].sort(
      (leftMessage, rightMessage) =>
        leftMessage.createdAtMs - rightMessage.createdAtMs,
    );
  }, [failedMessages, nickname, retryFailedMessage, snapshotMessages, userUid]);

  const retryConnection = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRetryKey((currentRetryKey) => currentRetryKey + 1);
  }, []);

  const connectionStatus: ChatConnectionStatus = isOffline
    ? "offline"
    : isLoading
      ? "connecting"
      : "connected";

  return {
    connectionStatus,
    deleteMessage,
    editMessage,
    error,
    isLoading,
    isSending,
    messages,
    retryConnection,
    sendMessage,
    toggleReaction,
  };
}

export { MAX_MESSAGE_LENGTH };
