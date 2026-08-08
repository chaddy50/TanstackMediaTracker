import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import { MediaItemType } from "#/lib/enums";

const COLLECTION_NAME = "Mass Effect";

function jsonResponse(body: unknown, { ok = true }: { ok?: boolean } = {}) {
	return { ok, status: ok ? 200 : 500, json: async () => body };
}

/** IGDB's OAuth handshake, which every call makes before its real request. */
function tokenResponse() {
	return jsonResponse({ access_token: "test-token", expires_in: 3600 });
}

const GAME = {
	id: 71,
	name: "Mass Effect 2",
	summary: "A suicide mission against the Collectors.",
	cover: { url: "//images.igdb.com/t_thumb/abc.jpg" },
	first_release_date: 1264377600, // 2010-01-25
	genres: [{ name: "RPG" }],
	collections: [{ name: COLLECTION_NAME }],
	involved_companies: [
		{
			developer: true,
			company: { name: "BioWare", description: "A Canadian studio." },
		},
	],
};

/**
 * IGDB caches its access token in module state, so every case needs a fresh
 * module alongside its stubbed fetch sequence.
 */
async function importIgdbWith(
	responses: unknown[],
	{ hasClientId = true }: { hasClientId?: boolean } = {},
) {
	vi.stubEnv("IGDB_CLIENT_ID", hasClientId ? "test-client" : "");
	vi.stubEnv("IGDB_CLIENT_SECRET", "test-secret");

	const fetchMock = vi.fn();
	for (const response of responses) {
		fetchMock.mockResolvedValueOnce(response);
	}
	vi.stubGlobal("fetch", fetchMock);

	vi.resetModules();
	const igdb = await import("#/features/mediaItemSearch/api/igdb");
	return { igdb, fetchMock };
}

async function fetchCollectionGamesWith(
	responses: unknown[],
	options: { hasClientId?: boolean } = {},
): Promise<{
	results: ExternalSearchResult[];
	fetchMock: ReturnType<typeof vi.fn>;
}> {
	const { igdb, fetchMock } = await importIgdbWith(responses, options);
	const results = await igdb.fetchCollectionGames(COLLECTION_NAME);
	return { results, fetchMock };
}

/** The body IGDB was POSTed for its games query (the call after the token). */
function gamesRequestBody(fetchMock: ReturnType<typeof vi.fn>): string {
	return fetchMock.mock.calls[1]?.[1]?.body ?? "";
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("igdb.fetchCollectionGames", () => {
	it("maps each game in the collection to a result", async () => {
		const { results } = await fetchCollectionGamesWith([
			tokenResponse(),
			jsonResponse([GAME, { ...GAME, id: 72, name: "Mass Effect 3" }]),
		]);

		expect(results).toHaveLength(2);
		expect(results[0]).toMatchObject({
			externalId: "71",
			externalSource: "igdb",
			type: MediaItemType.VIDEO_GAME,
			title: "Mass Effect 2",
		});
		expect(results[1]?.externalId).toBe("72");
	});

	it("posts a where-clause filtered on the collection name", async () => {
		const { fetchMock } = await fetchCollectionGamesWith([
			tokenResponse(),
			jsonResponse([GAME]),
		]);

		expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.igdb.com/v4/games");
		expect(gamesRequestBody(fetchMock)).toContain(
			`where collections.name = "${COLLECTION_NAME}";`,
		);
	});

	// Quotes are stripped rather than escaped, matching search().
	it("strips quotes from the collection name so the query stays well-formed", async () => {
		const { igdb, fetchMock } = await importIgdbWith([
			tokenResponse(),
			jsonResponse([GAME]),
		]);

		await igdb.fetchCollectionGames('Marathon "Trilogy"');

		expect(gamesRequestBody(fetchMock)).toContain(
			'where collections.name = "Marathon Trilogy";',
		);
	});

	it("returns nothing and issues no request without a client id", async () => {
		const { results, fetchMock } = await fetchCollectionGamesWith([], {
			hasClientId: false,
		});

		expect(results).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns nothing when the games response is not ok", async () => {
		const { results } = await fetchCollectionGamesWith([
			tokenResponse(),
			jsonResponse([], { ok: false }),
		]);

		expect(results).toEqual([]);
	});

	it("returns nothing when the collection holds no games", async () => {
		const { results } = await fetchCollectionGamesWith([
			tokenResponse(),
			jsonResponse([]),
		]);

		expect(results).toEqual([]);
	});

	it("returns nothing when the token handshake rejects", async () => {
		const { igdb } = await importIgdbWith([]);
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

		await expect(igdb.fetchCollectionGames(COLLECTION_NAME)).resolves.toEqual(
			[],
		);
	});

	// Skipped deliberately: a per-item detail no card shows, and fetching it
	// would double the calls this makes.
	it("does not fetch time-to-beat data", async () => {
		const { results, fetchMock } = await fetchCollectionGamesWith([
			tokenResponse(),
			jsonResponse([GAME]),
		]);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(
			fetchMock.mock.calls.some((call) =>
				String(call[0]).includes("game_time_to_beats"),
			),
		).toBe(false);
		expect(results[0]?.metadata).not.toHaveProperty("timeToBeatNormally");
		expect(results[0]?.metadata).not.toHaveProperty("timeToBeatFetchedAt");
	});
});

describe("igdb toSearchResult mapping", () => {
	it("upgrades the thumbnail cover to a full-size https URL", async () => {
		const { results } = await fetchCollectionGamesWith([
			tokenResponse(),
			jsonResponse([GAME]),
		]);

		expect(results[0]?.coverImageUrl).toBe(
			"https://images.igdb.com/t_cover_big_2x/abc.jpg",
		);
	});

	it("converts the unix release timestamp to a date", async () => {
		const { results } = await fetchCollectionGamesWith([
			tokenResponse(),
			jsonResponse([GAME]),
		]);

		expect(results[0]?.releaseDate).toBe("2010-01-25");
	});

	it("leaves the cover and release date unset when the game has neither", async () => {
		const { results } = await fetchCollectionGamesWith([
			tokenResponse(),
			jsonResponse([
				{ ...GAME, cover: undefined, first_release_date: undefined },
			]),
		]);

		expect(results[0]?.coverImageUrl).toBeUndefined();
		expect(results[0]?.releaseDate).toBeUndefined();
	});
});

describe("igdb.search", () => {
	// Guards the toSearchResult extraction: search() must still produce the same
	// metadata it did when the mapping was inlined.
	it("still maps genres, series, developer, bio and time-to-beat", async () => {
		const { igdb } = await importIgdbWith([
			tokenResponse(),
			jsonResponse([GAME]),
			jsonResponse([{ game_id: 71, normally: 108000 }]),
		]);

		const results = await igdb.search("mass effect");

		expect(results[0]?.metadata).toMatchObject({
			genres: ["RPG"],
			series: COLLECTION_NAME,
			developer: "BioWare",
			developerBio: "A Canadian studio.",
			timeToBeatNormally: 30,
		});
		expect(results[0]?.metadata.timeToBeatFetchedAt).toBeTypeOf("string");
	});
});
