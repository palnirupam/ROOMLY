import { useState, type ChangeEvent, type SyntheticEvent } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "@/features/auth/AuthContext";
import { getRoomJoinErrorMessage } from "@/features/rooms/roomErrors";
import {
  hasValidationErrors,
  normalizeNickname,
  normalizeRoomCode,
  validateJoinRoomInput,
  type JoinRoomInput,
  type JoinRoomValidationErrors,
} from "@/features/rooms/validation";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

function removeValidationError(
  errors: JoinRoomValidationErrors,
  key: keyof JoinRoomInput,
): JoinRoomValidationErrors {
  const nextErrors: JoinRoomValidationErrors = {};

  if (key !== "nickname" && errors.nickname) {
    nextErrors.nickname = errors.nickname;
  }

  if (key !== "roomCode" && errors.roomCode) {
    nextErrors.roomCode = errors.roomCode;
  }

  return nextErrors;
}

type JoinRoomFormProps = {
  initialRoomCode?: string;
};

export function JoinRoomForm({ initialRoomCode = "" }: JoinRoomFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [errors, setErrors] = useState<JoinRoomValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNicknameChange(event: ChangeEvent<HTMLInputElement>) {
    setNickname(event.target.value);
    setErrors((currentErrors) =>
      removeValidationError(currentErrors, "nickname"),
    );
    setSubmitError(null);
  }

  function handleRoomCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setRoomCode(normalizeRoomCode(event.target.value));
    setErrors((currentErrors) =>
      removeValidationError(currentErrors, "roomCode"),
    );
    setSubmitError(null);
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedNickname = normalizeNickname(nickname);
    const validationErrors = validateJoinRoomInput({
      nickname: normalizedNickname,
      roomCode,
    });

    setNickname(normalizedNickname);
    setErrors(validationErrors);
    setSubmitError(null);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    if (!user) {
      setSubmitError("Authentication is still starting. Try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      try {
        sessionStorage.setItem("roomly:nickname", normalizedNickname);
      } catch {
        // Storage can be unavailable in hardened/private browser modes.
      }

      const { joinOrCreateRoom } = await import("@/features/rooms/roomService");
      await joinOrCreateRoom(roomCode, user.uid);
      await navigate(`/room/${roomCode}`);
    } catch (error) {
      setSubmitError(getRoomJoinErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateRoom() {
    const normalizedNickname = normalizeNickname(nickname);

    if (!normalizedNickname || normalizedNickname.length < 2) {
      setErrors({ nickname: "Nickname must be at least 2 characters." });
      return;
    }

    if (!user) {
      setSubmitError("Authentication is still starting. Try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        sessionStorage.setItem("roomly:nickname", normalizedNickname);
      } catch {
        // Storage can be unavailable in hardened/private browser modes.
      }

      const { createNewRoom } = await import("@/features/rooms/roomService");
      const newRoomCode = await createNewRoom(user.uid);
      await navigate(`/room/${newRoomCode}`);
    } catch (error) {
      setSubmitError(getRoomJoinErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="mt-8 space-y-4"
      noValidate
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <Button className="w-full" disabled={isSubmitting} type="button" onClick={() => { void handleCreateRoom(); }}>
        {isSubmitting ? "Creating..." : "Create New Room"}
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/20 dark:bg-white/10" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">or</span>
        <div className="h-px flex-1 bg-white/20 dark:bg-white/10" />
      </div>

      <Input
        autoComplete="nickname"
        autoFocus
        disabled={isSubmitting}
        error={errors.nickname}
        inputMode="text"
        label="Nickname"
        maxLength={20}
        name="nickname"
        placeholder="Your nickname"
        required
        value={nickname}
        onChange={handleNicknameChange}
      />
      <Input
        disabled={isSubmitting}
        error={errors.roomCode}
        label="Room code"
        maxLength={50}
        name="roomCode"
        placeholder="e.g. my-room-42"
        required
        value={roomCode}
        onChange={handleRoomCodeChange}
      />

      {submitError ? (
        <p
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Joining..." : "Join Room"}
      </Button>
    </form>
  );
}
