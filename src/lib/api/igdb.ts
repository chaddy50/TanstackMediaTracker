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
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
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

export async function search(query: string): Promise<ExternalSearchResult[]> {
	const clientId = process.env.IGDB_CLIENT_ID;
	if (!clientId) throw new Error("IGDB_CLIENT_ID is not set");

	const accessToken = await getAccessToken();

	const body = `fields name,cover.url,first_release_date,summary,genres.name; search "${query.replace(/"/g, "")}"; limit 10;`;

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
		metadata: {
			genres: game.genres?.map((g) => g.name),
		},
	}));
}
