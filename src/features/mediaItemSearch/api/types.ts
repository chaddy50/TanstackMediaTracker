import type { MediaItemType } from "#/lib/enums";

export type ExternalSearchResult = {
	externalId: string;
	externalSource: string;
	type: MediaItemType;
	title: string;
	description?: string;
	coverImageUrl?: string;
	releaseDate?: string;
	// biome-ignore lint/suspicious/noExplicitAny: arbitrary JSON metadata from external APIs
	metadata: Record<string, any>;
};
