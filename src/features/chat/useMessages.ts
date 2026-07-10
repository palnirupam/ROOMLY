import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createClientMessageId,
  getMessageErrorMessage,
  getTimestampMs,
  MAX_MESSAGE_LENGTH,
  normalizeMessageText,
  sendTextMessage,
  subscribeToMessages,
  type MessageSnapshotItem,
} from "@/features/chat/messageService";
import type { ChatConnectionStatus, ChatMessage } from "@/features/chat/types";

type FailedMessage = {
  clientMessageId: string;
  createdAtMs: number;
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
  error: string | null;
  isLoading: boolean;
  isSending: boolean;
  messages: ChatMessage[];
  retryConnection: () => void;
  sendMessage: (text: string) => Promise<void>;
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

    return (
      currentMessage.id === nextMessage.id &&
      currentMessage.clientMessageId === nextMessage.clientMessageId &&
      currentMessage.senderNickname === nextMessage.senderNickname &&
      currentMessage.senderUid === nextMessage.senderUid &&
      currentMessage.text === nextMessage.text &&
      currentMessage.hasPendingWrites === nextMessage.hasPendingWrites &&
      currentTimestampMs === nextTimestampMs
    );
  });
}

function toChatMessage(
  message: MessageSnapshotItem,
  userUid: string,
): ChatMessage {
  const createdAtMs = getTimestampMs(message.createdAt);

  return {
    clientMessageId: message.clientMessageId,
    createdAtMs,
    id: message.id,
    isOwn: message.senderUid === userUid,
    nickname: message.senderNickname,
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
    async (text: string) => {
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
            text: normalizedText,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [nickname, roomCode, userUid],
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
        retry: () => {
          void retryFailedMessage(failedMessage);
        },
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
    error,
    isLoading,
    isSending,
    messages,
    retryConnection,
    sendMessage,
  };
}

export { MAX_MESSAGE_LENGTH };
