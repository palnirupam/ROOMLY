import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { ChatHeader } from "@/features/chat/components/ChatHeader";
import { MessageComposer } from "@/features/chat/components/MessageComposer";
import { MessageList } from "@/features/chat/components/MessageList";
import { useMessages } from "@/features/chat/useMessages";
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
  joinRoom,
  leaveRoom,
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
    return <Navigate replace to={`/join?code=${encodeURIComponent(roomCode)}`} />;
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

  useEffect(() => {
    function handleVisibility() {
      isTabVisibleRef.current = document.visibilityState === "visible";
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const {
    connectionStatus,
    error,
    isLoading,
    isSending,
    messages,
    retryConnection,
    sendMessage,
  } = useMessages({
    nickname,
    roomCode,
    userUid: user?.uid ?? "",
  });

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
    if (!user) {
      return;
    }

    let cancelled = false;

    void joinRoom(roomCode, user.uid, nickname);

    const unsubscribe = subscribeToMembers(roomCode, (members) => {
      if (cancelled) {
        return;
      }

      setMemberCount(members.length);

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

    return () => {
      cancelled = true;
      unsubscribe();
      void leaveRoom(roomCode, user.uid);
    };
  }, [roomCode, user, nickname]);

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
            />
            <MessageComposer
              disabled={connectionStatus === "offline" || isSending}
              isSending={isSending}
              onSend={sendMessage}
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
