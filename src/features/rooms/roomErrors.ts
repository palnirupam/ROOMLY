export function getRoomJoinErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("permission")) {
      return "Room access is blocked by Firestore rules.";
    }

    return error.message;
  }

  return "Unable to join this room.";
}
