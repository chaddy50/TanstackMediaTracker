import type { ExternalSearchResult } from "./types";

type IgdbTokenResponse = {
	access_token: string;
	expires_in: number;
};

type IgdbGame = {
	id: number;
	name: string;
	summary?: string;
	cover?: { url: string };
	first_release_date?: number; // Unix timestamp
	genres?: { name: string }[];
	collections?: { name: string }[];
	involved_companies?: Array<{
		developer: boolean;
		company: { name: string; description?: string };
	}>;
};

type IgdbTimeToBeat = {
	game_id: number;
	hastily?: number; // seconds
	normally?: number; // seconds
	completely?: number; // seconds
};

export type IgdbTimeToBeatMetadata = {
	timeToBeatFetchedAt: string; // ISO timestamp — always set when fetch was attempted
	timeToBeatHastily?: number; // hours (rounded)
	timeToBeatNormally?: number; // hours (rounded)
	timeToBeatCompletely?: number; // hours (rounded)
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
	if (cachedToken && cachedToken.expiresAt > Date.now()) {
		return cachedToken.accessToken;
	}

	const clientId = process.env.IGDB_CLIENT_ID;
	const clientSecret = process.env.IGDB_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("IGDB_CLIENT_ID or IGDB_CLIENT_SECRET is not set");
	}

	const parameters = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: "client_credentials",
	});

	const result = await fetch(
		`https://id.twitch.tv/oauth2/token?${parameters.toString()}`,
		{ method: "POST" },
	);
	if (!result.ok) throw new Error("Failed to fetch IGDB access token");

	const data: IgdbTokenResponse = await result.json();

	// Cache with 60-second buffer before expiration
	cachedToken = {
		accessToken: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 60) * 1000,
	};

	return cachedToken.accessToken;
}

/**
 * Fetch time-to-beat data for a batch of IGDB game IDs.
 *
 * Returns a Map with an entry for EVERY queried game ID. Games with no IGDB
 * time data get only `timeToBeatFetchedAt` (the sentinel). This ensures the
 * backfill won't retry games that IGDB simply has no data for.
 *
 * Returns an empty Map on API failure so the caller can skip setting the
 * sentinel and retry on the next backfill run.
 */
export async function fetchTimesToBeat(
	gameIds: number[],
	clientId: string,
	accessToken: string,
): Promise<Map<number, IgdbTimeToBeatMetadata>> {
	if (gameIds.length === 0) {
		return new Map();
	}

	const body = `fields game_id,hastily,normally,completely; where game_id = (${gameIds.join(",")}); limit ${gameIds.length};`;

	const result = await fetch("https://api.igdb.com/v4/game_time_to_beats", {
		method: "POST",
		headers: {
			"Client-ID": clientId,
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "text/plain",
		},
		body,
	});

	// On failure return empty map — callers should not set the sentinel so the
	// fetch can be retried on the next backfill run.
	if (!result.ok) {
		return new Map();
	}

	const timesToBeat: IgdbTimeToBeat[] = await result.json();
	const fetchedAt = new Date().toISOString();

	const dataByGameId = new Map(timesToBeat.map((entry) => [entry.game_id, entry]));

	const timesToBeatByGameId = new Map<number, IgdbTimeToBeatMetadata>();
	for (const gameId of gameIds) {
		const entry = dataByGameId.get(gameId);
		timesToBeatByGameId.set(gameId, {
			timeToBeatFetchedAt: fetchedAt,
			...(entry?.hastily
				? { timeToBeatHastily: Math.round(entry.hastily / 3600) }
				: {}),
			...(entry?.normally
				? { timeToBeatNormally: Math.round(entry.normally / 3600) }
				: {}),
			...(entry?.completely
				? { timeToBeatCompletely: Math.round(entry.completely / 3600) }
				: {}),
		});
	}
	return timesToBeatByGameId;
}

export async function fetchGameDeveloper(
	gameId: string,
): Promise<{ developer: string; developerBio: string | null } | null> {
	const clientId = process.env.IGDB_CLIENT_ID;
	if (!clientId) {
		return null;
	}

	try {
		const accessToken = await getAccessToken();
		const body = `fields involved_companies.developer,involved_companies.company.name,involved_companies.company.description; where id = ${gameId};`;
		const result = await fetch("https://api.igdb.com/v4/games", {
			method: "POST",
			headers: {
				"Client-ID": clientId,
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "text/plain",
			},
			body,
		});
		if (!result.ok) {
			return null;
		}
		const games: IgdbGame[] = await result.json();
		const game = games[0];
		if (!game) {
			return null;
		}
		const developerCompany = game.involved_companies?.find((c) => c.developer);
		if (!developerCompany) {
			return null;
		}
		return {
			developer: developerCompany.company.name,
			developerBio: developerCompany.company.description ?? null,
		};
	} catch {
		return null;
	}
}

export async function search(query: string): Promise<ExternalSearchResult[]> {
	const clientId = process.env.IGDB_CLIENT_ID;
	if (!clientId) throw new Error("IGDB_CLIENT_ID is not set");

	const accessToken = await getAccessToken();

	const body = `fields name,cover.url,first_release_date,summary,genres.name,collections.name,involved_companies.developer,involved_companies.company.name,involved_companies.company.description; search "${query.replace(/"/g, "")}"; limit 10;`;

	const result = await fetch("https://api.igdb.com/v4/games", {
		method: "POST",
		headers: {
			"Client-ID": clientId,
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "text/plain",
		},
		body,
	});
	if (!result.ok) return [];

	const games: IgdbGame[] = await result.json();

	const timesToBeatByGameId = await fetchTimesToBeat(
		games.map((game) => game.id),
		clientId,
		accessToken,
	);

	return games.map((game) => ({
		externalId: String(game.id),
		externalSource: "igdb",
		type: "video_game" as const,
		title: game.name,
		description: game.summary || undefined,
		coverImageUrl: game.cover?.url
			? `https:${game.cover.url.replace("t_thumb", "t_cover_big_2x")}`
			: undefined,
		releaseDate: game.first_release_date
			? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
			: undefined,
		metadata: (() => {
			const developerCompany = game.involved_companies?.find((c) => c.developer);
			return {
				genres: game.genres?.map((g) => g.name),
				...(game.collections?.[0] ? { series: game.collections[0].name } : {}),
				...(developerCompany ? { developer: developerCompany.company.name } : {}),
				...(developerCompany?.company.description ? { developerBio: developerCompany.company.description } : {}),
				...(timesToBeatByGameId.get(game.id) ?? {}),
			};
		})(),
	}));
}
