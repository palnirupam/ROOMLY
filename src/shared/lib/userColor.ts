const USER_COLOR_COUNT = 8;
const HUE_STEP = 360 / USER_COLOR_COUNT;

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
}

export function getUserColorIndex(uid: string): number {
  return hashString(uid) % USER_COLOR_COUNT;
}

export function getUserHue(uid: string): number {
  return getUserColorIndex(uid) * HUE_STEP;
}
