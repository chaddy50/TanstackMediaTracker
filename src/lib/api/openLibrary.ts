import type { ExternalSearchResult } from "./types";

type OpenLibraryDoc = {
	key: string;
	title: string;
	author_name?: string[];
	first_publish_year?: number;
	cover_i?: number;
	number_of_pages_median?: number;
	subject?: string[];
};

type OpenLibraryResponse = {
	docs: OpenLibraryDoc[];
};

export async function search(query: string): Promise<ExternalSearchResult[]> {
	const params = new URLSearchParams({
		q: query,
		fields: "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject",
		limit: "10",
	});

	const res = await fetch(
		`https://openlibrary.org/search.json?${params.toString()}`,
	);
	if (!res.ok) return [];

	const data: OpenLibraryResponse = await res.json();

	return data.docs.map((doc) => ({
		externalId: doc.key,
		externalSource: "openlibrary",
		type: "book" as const,
		title: doc.title,
		coverImageUrl: doc.cover_i
			? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
			: undefined,
		releaseDate: doc.first_publish_year
			? `${doc.first_publish_year}-01-01`
			: undefined,
		metadata: {
			author: doc.author_name?.[0],
			pageCount: doc.number_of_pages_median,
			genres: doc.subject?.slice(0, 5),
		},
	}));
}
