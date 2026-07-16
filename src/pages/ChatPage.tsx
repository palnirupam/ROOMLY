import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { ChatHeader } from "@/features/chat/components/ChatHeader";
import { MessageComposer } from "@/features/chat/components/MessageComposer";
import { MessageList } from "@/features/chat/components/MessageList";
import { useMessages } from "@/features/chat/useMessages";
import type { ChatMessage, MessageReply } from "@/features/chat/types";
import { useAuth } from "@/features/auth/AuthContext";
import { getDoc } from "firebase/firestore";

import {
  deleteRoom,
  getRoomDocumentReference,
} from "@/features/rooms/roomService";
import {
  isValidRoomCode,
  normalizeNickname,
} from "@/features/rooms/validation";
import {
  createPresenceId,
  heartbeatRoomMember,
  joinRoom,
  leaveRoom,
  markRoomRead,
  MEMBER_HEARTBEAT_INTERVAL_MS,
  setMemberTyping,
  subscribeToMembers,
  type Member,
} from "@/features/rooms/memberService";
import { MemberToast, MemberToastContainer } from "@/shared/ui/MemberToast";
import { Button } from "@/shared/ui/Button";
import { PageTransition } from "@/shared/ui/PageTransition";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";

function getStoredNickname() {
  try {
    return normalizeNickname(sessionStorage.getItem("roomly:nickname") ?? "");
  } catch {
    return "";
  }
}

export function ChatPage() {
  const { roomCode } = useParams();
  const nickname = useMemo(() => getStoredNickname(), []);

  if (!roomCode || !isValidRoomCode(roomCode)) {
    return <Navigate replace to="/join" />;
  }

  if (!nickname) {
    return (
      <Navigate replace to={`/join?code=${encodeURIComponent(roomCode)}`} />
    );
  }

  return <ChatRoom nickname={nickname} roomCode={roomCode} />;
}

type ChatRoomProps = {
  nickname: string;
  roomCode: string;
};

function ChatRoom({ nickname, roomCode }: ChatRoomProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreator, setIsCreator] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [readyPresenceId, setReadyPresenceId] = useState("");
  const [replyingTo, setReplyingTo] = useState<MessageReply | undefined>();
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document === "undefined" || document.visibilityState === "visible",
  );
  const presenceId = useMemo(
    () => (user ? createPresenceId(user.uid, roomCode) : ""),
    [roomCode, user],
  );

  type Notification = {
    id: string;
    message: string;
    variant: "join" | "leave";
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevMembersRef = useRef<Map<string, Member>>(new Map());
  const isFirstSnapshotRef = useRef(true);
  const notifIdRef = useRef(0);
  const isTabVisibleRef = useRef(true);
  const isTypingRef = useRef(false);

  useEffect(() => {
    function handleVisibility() {
      const isVisible = document.visibilityState === "visible";
      isTabVisibleRef.current = isVisible;
      setIsTabVisible(isVisible);
    }

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const {
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
  } = useMessages({
    nickname,
    roomCode,
    userUid: user?.uid ?? "",
  });
  const lastMessageId = messages.at(-1)?.id;

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    getDoc(getRoomDocumentReference(roomCode))
      .then((roomSnapshot) => {
        if (cancelled) {
          return;
        }

        setIsCreator(
          roomSnapshot.exists() &&
            roomSnapshot.data().createdByUid === user.uid,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setIsCreator(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [roomCode, user]);

  useEffect(() => {
    if (!user || !presenceId) {
      return;
    }

    let cancelled = false;
    isFirstSnapshotRef.current = true;
    prevMembersRef.current = new Map();

    void joinRoom(roomCode, presenceId, user.uid, nickname)
      .then(() => {
        if (!cancelled) {
          setReadyPresenceId(presenceId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMemberCount(0);
        }
      });

    const unsubscribe = subscribeToMembers(roomCode, (members) => {
      if (cancelled) {
        return;
      }

      setMemberCount(members.length);
      setMembers(members);

      if (!isTabVisibleRef.current) {
        prevMembersRef.current = new Map(
          members.map((member) => [member.uid, member]),
        );
        return;
      }

      if (isFirstSnapshotRef.current) {
        isFirstSnapshotRef.current = false;
        prevMembersRef.current = new Map(
          members.map((member) => [member.uid, member]),
        );
        return;
      }

      const previousMembers = prevMembersRef.current;
      const currentMembers = new Map(
        members.map((member) => [member.uid, member]),
      );

      for (const member of members) {
        if (member.uid === user.uid) {
          continue;
        }

        if (!previousMembers.has(member.uid)) {
          const id = (++notifIdRef.current).toString();
          setNotifications((currentNotifications) => [
            ...currentNotifications,
            { id, message: `${member.nickname} joined`, variant: "join" },
          ]);
        }
      }

      for (const [uid, member] of previousMembers) {
        if (uid === user.uid) {
          continue;
        }

        if (!currentMembers.has(uid)) {
          const id = (++notifIdRef.current).toString();
          setNotifications((currentNotifications) => [
            ...currentNotifications,
            { id, message: `${member.nickname} left`, variant: "leave" },
          ]);
        }
      }

      prevMembersRef.current = currentMembers;
    });

    const heartbeatIntervalId = window.setInterval(() => {
      void heartbeatRoomMember(roomCode, presenceId).catch(() => undefined);
    }, MEMBER_HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatIntervalId);
      unsubscribe();
      isTypingRef.current = false;
      void leaveRoom(roomCode, presenceId).catch(() => undefined);
    };
  }, [nickname, presenceId, roomCode, user]);

  useEffect(() => {
    if (
      !presenceId ||
      readyPresenceId !== presenceId ||
      !isTabVisible ||
      isLoading ||
      !lastMessageId
    ) {
      return;
    }

    void markRoomRead(roomCode, presenceId).catch(() => undefined);
  }, [
    isLoading,
    isTabVisible,
    lastMessageId,
    presenceId,
    readyPresenceId,
    roomCode,
  ]);

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      if (
        !presenceId ||
        readyPresenceId !== presenceId ||
        isTypingRef.current === isTyping
      ) {
        return;
      }

      isTypingRef.current = isTyping;
      void setMemberTyping(roomCode, presenceId, isTyping).catch(
        () => undefined,
      );
    },
    [presenceId, readyPresenceId, roomCode],
  );

  const handleReplyToMessage = useCallback((message: ChatMessage) => {
    setReplyingTo({
      messageId: message.id,
      nickname: message.nickname,
      text: message.text,
    });
  }, []);

  const handleReactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      void toggleReaction(messageId, emoji);
    },
    [toggleReaction],
  );

  const typingText = useMemo(() => {
    if (!user) {
      return "";
    }

    const typingNicknames = [
      ...new Set(
        members
          .filter((member) => member.uid !== user.uid && member.isTyping)
          .map((member) => member.nickname),
      ),
    ];

    if (typingNicknames.length === 0) {
      return "";
    }

    if (typingNicknames.length === 1) {
      return `${typingNicknames[0] ?? "Someone"} is typing...`;
    }

    return `${typingNicknames.length.toString()} people are typing...`;
  }, [members, user]);

  const seenCounts = useMemo(() => {
    if (!user) {
      return {};
    }

    return Object.fromEntries(
      messages
        .filter((message) => message.isOwn && message.status === "sent")
        .map((message) => [
          message.id,
          members.filter(
            (member) =>
              member.uid !== user.uid &&
              member.lastReadAtMs >= message.createdAtMs,
          ).length,
        ]),
    );
  }, [members, messages, user]);

  const handleDeleteRoom = useCallback(async () => {
    if (!user) {
      return;
    }

    await deleteRoom(roomCode, user.uid);
    await navigate("/join");
  }, [navigate, roomCode, user]);

  function handleDismissNotification(id: string) {
    setNotifications((currentNotifications) =>
      currentNotifications.filter((notification) => notification.id !== id),
    );
  }

  return (
    <PageTransition>
      <main className="safe-page bg-app-gradient flex h-dvh text-slate-950 dark:text-slate-50">
        <Container className="flex min-h-0 flex-1 flex-col gap-4">
          <ChatHeader
            connectionStatus={connectionStatus}
            isCreator={isCreator}
            memberCount={memberCount}
            nickname={nickname}
            roomCode={roomCode}
            {...(isCreator ? { onDeleteRoom: handleDeleteRoom } : {})}
          />

          <Card className="flex min-h-0 flex-1 flex-col gap-4">
            {error ? (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between dark:text-rose-200"
                role="alert"
              >
                <span className="min-w-0 break-words">{error}</span>
                <Button
                  className="self-start sm:self-auto"
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={retryConnection}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            <MessageList
              currentNickname={nickname}
              isLoading={isLoading}
              messages={messages}
              seenCounts={seenCounts}
              onDeleteMessage={deleteMessage}
              onEditMessage={editMessage}
              onReactToMessage={handleReactToMessage}
              onReplyToMessage={handleReplyToMessage}
            />
            <MessageComposer
              disabled={connectionStatus === "offline" || isSending}
              isSending={isSending}
              typingText={typingText}
              {...(replyingTo ? { replyTo: replyingTo } : {})}
              onCancelReply={() => {
                setReplyingTo(undefined);
              }}
              onSend={sendMessage}
              onTypingChange={handleTypingChange}
            />
          </Card>
        </Container>

        <MemberToastContainer>
          {notifications.map((notification) => (
            <MemberToast
              key={notification.id}
              id={notification.id}
              message={notification.message}
              variant={notification.variant}
              onDismiss={handleDismissNotification}
            />
          ))}
        </MemberToastContainer>
      </main>
    </PageTransition>
  );
}
