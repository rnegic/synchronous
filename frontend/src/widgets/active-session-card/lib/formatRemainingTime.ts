/**
 * Formats remaining time in seconds to MM:SS format
 * @param seconds - Remaining time in seconds
 * @returns Formatted time string (e.g., "15:32")
 */
export const formatRemainingTime = (seconds: number): string => {
  if (seconds <= 0) {
    return '00:00';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  return `${formattedMinutes}:${formattedSeconds}`;
};
