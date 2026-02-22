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
