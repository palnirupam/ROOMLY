export type ChatConnectionStatus = "connected" | "connecting" | "offline";

export type ChatMessageStatus = "sent" | "pending" | "failed";

export type ChatMessage = {
  clientMessageId?: string | undefined;
  createdAtMs: number;
  id: string;
  isOwn: boolean;
  nickname: string;
  retry?: (() => void) | undefined;
  status: ChatMessageStatus;
  text: string;
  timestampLabel: string;
};

export type MessageDocument = {
  clientMessageId?: string;
  createdAt: unknown;
  senderNickname: string;
  senderUid: string;
  text: string;
};
