export type ChatConnectionStatus = "connected" | "connecting" | "offline";

export type ChatMessageStatus = "sent" | "pending" | "failed";

export type MessageReply = {
  messageId: string;
  nickname: string;
  text: string;
};

export type MessageReaction = {
  count: number;
  emoji: string;
  reactedByCurrentUser: boolean;
};

export type ChatMessage = {
  clientMessageId?: string | undefined;
  createdAtMs: number;
  editedAtMs?: number | undefined;
  id: string;
  isOwn: boolean;
  nickname: string;
  reactions: MessageReaction[];
  replyTo?: MessageReply | undefined;
  retry?: (() => void) | undefined;
  senderUid: string;
  status: ChatMessageStatus;
  text: string;
  timestampLabel: string;
};

export type MessageDocument = {
  clientMessageId?: string;
  createdAt: unknown;
  editedAt?: unknown;
  reactions?: Record<string, string>;
  replyTo?: MessageReply | null;
  senderNickname: string;
  senderUid: string;
  text: string;
};
