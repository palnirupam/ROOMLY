import { useCallback, useEffect, useMemo, useState } from "react";
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
  const nickname = useMemo(() => getStoredNickname() || "Guest", []);

  if (!roomCode || !isValidRoomCode(roomCode)) {
    return <Navigate replace to="/join" />;
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

    async function checkCreator() {
      try {
        const roomSnapshot = await getDoc(
          getRoomDocumentReference(roomCode),
        );

        if (cancelled) {
          return;
        }

        setIsCreator(
          roomSnapshot.exists() &&
            roomSnapshot.data().createdByUid === user.uid,
        );
      } catch {
        if (!cancelled) {
          setIsCreator(false);
        }
        } finally {
          // State check complete.
        }
    }

    void checkCreator();

    return () => {
      cancelled = true;
    };
  }, [roomCode, user]);

  const handleDeleteRoom = useCallback(async () => {
    if (!user) {
      return;
    }

    await deleteRoom(roomCode, user.uid);
    await navigate("/join");
  }, [navigate, roomCode, user]);

  return (
    <PageTransition>
      <main className="safe-page bg-app-gradient flex h-dvh text-slate-950 dark:text-slate-50">
        <Container className="flex min-h-0 flex-1 flex-col gap-4">
          <ChatHeader
            connectionStatus={connectionStatus}
            isCreator={isCreator}
            nickname={nickname}
            onDeleteRoom={isCreator ? handleDeleteRoom : undefined}
            roomCode={roomCode}
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
      </main>
    </PageTransition>
  );
}
