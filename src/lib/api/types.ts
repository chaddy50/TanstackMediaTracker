export type ExternalSearchResult = {
	externalId: string;
	externalSource: string;
	type: "book" | "movie" | "tv_show" | "video_game";
	title: string;
	description?: string;
	coverImageUrl?: string;
	releaseDate?: string;
	// biome-ignore lint/suspicious/noExplicitAny: arbitrary JSON metadata from external APIs
	metadata: Record<string, any>;
};
