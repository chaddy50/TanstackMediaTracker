import type { ExternalSearchResult } from "./types";

type TmdbMovie = {
	id: number;
	title: string;
	overview?: string;
	poster_path?: string;
	release_date?: string;
	genre_ids?: number[];
};

type TmdbTvShow = {
	id: number;
	name: string;
	overview?: string;
	poster_path?: string;
	first_air_date?: string;
	genre_ids?: number[];
};

type TmdbResponse<T> = {
	results: T[];
};

function getApiKey(): string {
	const key = process.env.TMDB_API_KEY;
	if (!key) throw new Error("TMDB_API_KEY is not set");
	return key;
}

async function searchMovies(query: string): Promise<ExternalSearchResult[]> {
	const params = new URLSearchParams({
		query,
		api_key: getApiKey(),
		language: "en-US",
		page: "1",
	});

	const result = await fetch(
		`https://api.themoviedb.org/3/search/movie?${params.toString()}`,
	);
	if (!result.ok) return [];

	const data: TmdbResponse<TmdbMovie> = await result.json();

	return data.results.slice(0, 10).map((movie) => ({
		externalId: String(movie.id),
		externalSource: "tmdb",
		type: "movie" as const,
		title: movie.title,
		description: movie.overview || undefined,
		coverImageUrl: movie.poster_path
			? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
			: undefined,
		releaseDate: movie.release_date || undefined,
		metadata: {},
	}));
}

async function searchTvShows(query: string): Promise<ExternalSearchResult[]> {
	const params = new URLSearchParams({
		query,
		api_key: getApiKey(),
		language: "en-US",
		page: "1",
	});

	const res = await fetch(
		`https://api.themoviedb.org/3/search/tv?${params.toString()}`,
	);
	if (!res.ok) return [];

	const data: TmdbResponse<TmdbTvShow> = await res.json();

	return data.results.slice(0, 10).map((show) => ({
		externalId: String(show.id),
		externalSource: "tmdb",
		type: "tv_show" as const,
		title: show.name,
		description: show.overview || undefined,
		coverImageUrl: show.poster_path
			? `https://image.tmdb.org/t/p/w500${show.poster_path}`
			: undefined,
		releaseDate: show.first_air_date || undefined,
		metadata: {},
	}));
}

type TmdbMovieDetails = {
	belongs_to_collection?: { name: string } | null;
	runtime?: number | null;
};

export async function fetchMovieDetails(
	movieId: string,
): Promise<{ series?: string; runtime?: number }> {
	try {
		const params = new URLSearchParams({ api_key: getApiKey() });
		const res = await fetch(
			`https://api.themoviedb.org/3/movie/${movieId}?${params.toString()}`,
		);
		if (!res.ok) return {};

		const data: TmdbMovieDetails = await res.json();
		const result: { series?: string; runtime?: number } = {};
		if (data.belongs_to_collection?.name) {
			result.series = data.belongs_to_collection.name;
		}
		if (typeof data.runtime === "number" && data.runtime > 0) {
			result.runtime = data.runtime;
		}
		return result;
	} catch {
		return {};
	}
}

type TmdbTvShowDetails = {
	created_by?: Array<{ name: string }>;
	number_of_seasons?: number;
	number_of_episodes?: number;
	episode_run_time?: number[];
};

export async function fetchTvShowDetails(
	showId: string,
): Promise<{
	creator?: string;
	seasons?: number;
	episodeRuntime?: number;
	numberOfEpisodes?: number;
}> {
	try {
		const params = new URLSearchParams({ api_key: getApiKey() });
		const res = await fetch(
			`https://api.themoviedb.org/3/tv/${showId}?${params.toString()}`,
		);
		if (!res.ok) return {};

		const data: TmdbTvShowDetails = await res.json();
		const result: {
			creator?: string;
			seasons?: number;
			episodeRuntime?: number;
			numberOfEpisodes?: number;
		} = {};
		if (data.created_by?.[0]?.name) {
			result.creator = data.created_by[0].name;
		}
		if (typeof data.number_of_seasons === "number" && data.number_of_seasons > 0) {
			result.seasons = data.number_of_seasons;
		}
		if (typeof data.number_of_episodes === "number" && data.number_of_episodes > 0) {
			result.numberOfEpisodes = data.number_of_episodes;
		}
		if (data.episode_run_time?.[0] && data.episode_run_time[0] > 0) {
			result.episodeRuntime = data.episode_run_time[0];
		}
		return result;
	} catch {
		return {};
	}
}

export async function search(
	query: string,
	type: "movie" | "tv_show" | "all",
): Promise<ExternalSearchResult[]> {
	if (type === "movie") return searchMovies(query);
	if (type === "tv_show") return searchTvShows(query);

	const [movies, shows] = await Promise.all([
		searchMovies(query),
		searchTvShows(query),
	]);
	return [...movies, ...shows];
}
