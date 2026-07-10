export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;
export const ROOM_CODE_MAX_LENGTH = 50;

// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\x00-\x1f\x7f/?#]/;
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS_GLOBAL = /[\x00-\x1f\x7f/?#]/g;

export type JoinRoomInput = {
  nickname: string;
  roomCode: string;
};

export type JoinRoomValidationErrors = Partial<
  Record<keyof JoinRoomInput, string>
>;

function replaceControlCharacters(value: string) {
  return Array.from(value, (character) => {
    const characterCode = character.charCodeAt(0);

    if (characterCode <= 31 || characterCode === 127) {
      return " ";
    }

    return character;
  }).join("");
}

export function normalizeNickname(nickname: string) {
  return replaceControlCharacters(nickname).trim().replace(/\s+/g, " ");
}

export function normalizeRoomCode(roomCode: string) {
  return roomCode
    .replace(FORBIDDEN_CHARS_GLOBAL, "")
    .trim()
    .slice(0, ROOM_CODE_MAX_LENGTH);
}

export function isValidNickname(nickname: string) {
  const normalizedNickname = normalizeNickname(nickname);

  return (
    normalizedNickname.length >= NICKNAME_MIN_LENGTH &&
    normalizedNickname.length <= NICKNAME_MAX_LENGTH
  );
}

export function isValidRoomCode(roomCode: string) {
  return (
    roomCode.length >= 1 &&
    roomCode.length <= ROOM_CODE_MAX_LENGTH &&
    roomCode === roomCode.trim() &&
    !FORBIDDEN_CHARS.test(roomCode)
  );
}

export function validateJoinRoomInput(
  input: JoinRoomInput,
): JoinRoomValidationErrors {
  const errors: JoinRoomValidationErrors = {};
  const nickname = normalizeNickname(input.nickname);

  if (!nickname) {
    errors.nickname = "Nickname is required.";
  } else if (nickname.length < NICKNAME_MIN_LENGTH) {
    errors.nickname = "Nickname must be at least 2 characters.";
  } else if (nickname.length > NICKNAME_MAX_LENGTH) {
    errors.nickname = "Nickname must be 20 characters or less.";
  }

  if (!isValidRoomCode(input.roomCode)) {
    errors.roomCode =
      "Room code must be 1-50 characters. Symbols / ? # are not allowed.";
  }

  return errors;
}

export function hasValidationErrors(errors: JoinRoomValidationErrors) {
  return Object.keys(errors).length > 0;
}
