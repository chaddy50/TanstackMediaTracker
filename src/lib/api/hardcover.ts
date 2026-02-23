import type { ExternalSearchResult } from "./types";

// Token from https://hardcover.app/account/api — already includes "Bearer " prefix
const API_KEY = process.env.HARDCOVER_API_KEY;
const ENDPOINT = "https://api.hardcover.app/v1/graphql";

// Step 1: keyword search — returns an opaque JSON blob from Typesense
const SEARCH_QUERY = `
  query SearchBooks($query: String!) {
    search(query: $query, query_type: "Book", per_page: 10, page: 1) {
      results
    }
  }
`;

// Step 2: fetch cover images by ID using the structured books() query
const IMAGES_QUERY = `
  query BookImages($ids: [Int!]!) {
    books(where: { id: { _in: $ids } }) {
      id
      image {
        url
      }
    }
  }
`;

type SearchHit = {
  id: string; // Typesense returns IDs as strings
  title: string;
  description?: string;
  author_names?: string[];
  series_names?: string[];
  featured_series_position?: number;
  genres?: string[];
  pages?: number;
  release_year?: number;
};

type BookImage = {
  id: number;
  image: { url: string } | null;
};

async function gql<T>(
	query: string,
	variables: Record<string, unknown>,
): Promise<T | null> {
	if (!API_KEY) return null;

	const res = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: API_KEY,
			"User-Agent": "media-tracker/1.0",
		},
		body: JSON.stringify({ query, variables }),
	});

	if (!res.ok) return null;

	const { data, errors } = await res.json();
	if (errors?.length) return null;

	return data as T;
}

function parseHits(results: unknown): SearchHit[] {
	if (Array.isArray(results)) return results as SearchHit[];
	// Typesense-wrapped format: { hits: [{ document: {...} }] }
	if (results && typeof results === "object" && "hits" in results) {
		const r = results as { hits?: Array<{ document: SearchHit }> };
		return (r.hits ?? []).map((h) => h.document);
	}
	return [];
}

export async function search(query: string): Promise<ExternalSearchResult[]> {
	if (!API_KEY) return [];

	const searchData = await gql<{ search: { results: unknown } }>(
		SEARCH_QUERY,
		{ query },
	);
	if (!searchData) return [];

	const hits = parseHits(searchData.search.results);
	if (hits.length === 0) return [];

	// Fetch cover images for all results in a single follow-up query.
	// Typesense returns IDs as strings; the books() query requires [Int!]!
	const ids = hits
		.map((h) => Number(h.id))
		.filter((id) => id > 0);
	const imageData = await gql<{ books: BookImage[] }>(IMAGES_QUERY, { ids });
	// Key by string so it matches hit.id (also a string from Typesense)
	const imageById = new Map(
		(imageData?.books ?? []).map((b) => {
			const url = b.image?.url;
			// Hardcover returns protocol-relative paths like "assets.hardcover.app/..."
			const fullUrl = url
				? url.startsWith("http")
					? url
					: `https://${url}`
				: undefined;
			return [String(b.id), fullUrl] as const;
		}),
	);

	return hits.map((hit) => {
		const metadata: Record<string, unknown> = {
			author: hit.author_names?.[0],
			pageCount: hit.pages,
			genres: hit.genres?.slice(0, 5),
		};

		if (hit.series_names?.[0]) {
			metadata.series = hit.series_names[0];
		}

		if (hit.featured_series_position != null) {
			metadata.seriesBookNumber = String(hit.featured_series_position);
		}

		return {
			externalId: String(hit.id),
			externalSource: "hardcover",
			type: "book" as const,
			title: hit.title,
			description: hit.description,
			coverImageUrl: imageById.get(hit.id),
			releaseDate: hit.release_year ? `${hit.release_year}-01-01` : undefined,
			metadata,
		};
	});
}
