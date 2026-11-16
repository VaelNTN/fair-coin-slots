export interface GlobalSlotsEntry {
  rank: number;
  deviceId: string;
  playerName: string;
  level: number;
  coins: number;
  totalWon: number;
  totalSpins: number;
  tournamentPoints: number;
  species: string;
  colorId: string;
  updatedAt: string;
}

export interface GlobalSlotsResponse {
  ok: boolean;
  entries: GlobalSlotsEntry[];
  player: GlobalSlotsEntry | null;
}

function cleanUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export async function fetchGlobalSlotsHighscores(
  baseUrl: string,
  deviceId: string,
  limit = 50
): Promise<GlobalSlotsResponse> {
  const base = cleanUrl(baseUrl);
  if (!base) throw new Error('NO_BACKEND_URL');
  const res = await fetch(
    `${base}/api/fair-slots/highscores?limit=${limit}&deviceId=${encodeURIComponent(deviceId)}`,
    { method: 'GET' }
  );
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return (await res.json()) as GlobalSlotsResponse;
}

export async function submitGlobalSlotsScore(
  baseUrl: string,
  payload: {
    deviceId: string;
    playerName: string;
    level: number;
    coins: number;
    totalWon: number;
    totalSpins: number;
    tournamentPoints: number;
    species: string;
    colorId: string;
  }
): Promise<void> {
  const base = cleanUrl(baseUrl);
  if (!base) return;

  try {
    await fetch(`${base}/api/fair-slots/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: payload.deviceId,
        playerName: payload.playerName.trim() || 'Speler',
        level: payload.level,
        coins: payload.coins,
        totalWon: payload.totalWon,
        totalSpins: payload.totalSpins,
        tournamentPoints: payload.tournamentPoints,
        species: payload.species,
        colorId: payload.colorId,
      }),
    });
  } catch {
    // Offline fallback stays silent
  }
}
