import type { ExternalSearchResult } from "./types";

type ItunesPodcastResult = {
	trackId: number;
	collectionName?: string;
	trackName?: string;
	artistName?: string;
	feedUrl?: string;
	artworkUrl600?: string;
	artworkUrl100?: string;
	primaryGenreName?: string;
	genres?: string[];
	releaseDate?: string;
	trackCount?: number;
};

type ItunesSearchResponse = {
	resultCount: number;
	results: ItunesPodcastResult[];
};

export type PodcastEpisode = {
	guid: string;
	title: string;
	episodeNumber?: number;
	seasonNumber?: number;
	publishedAt?: string;
	durationMinutes?: number;
};

export async function searchPodcasts(query: string): Promise<ExternalSearchResult[]> {
	const params = new URLSearchParams({
		term: query,
		media: "podcast",
		entity: "podcast",
		limit: "10",
	});

	const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
	if (!response.ok) return [];

	const data: ItunesSearchResponse = await response.json();

	return data.results.map((podcast) => ({
		externalId: String(podcast.trackId),
		externalSource: "itunes",
		type: "podcast" as const,
		title: podcast.collectionName ?? podcast.trackName ?? "Unknown Podcast",
		description: undefined,
		coverImageUrl: podcast.artworkUrl600 ?? podcast.artworkUrl100 ?? undefined,
		releaseDate: podcast.releaseDate ?? undefined,
		metadata: {
			creator: podcast.artistName ?? undefined,
			genres: podcast.genres?.filter((genre) => genre !== "Podcasts") ?? [],
			feedUrl: podcast.feedUrl ?? undefined,
		},
	}));
}

function extractTagContent(xml: string, tag: string): string | undefined {
	const escapedTag = tag.replace(":", "\\:");
	const match = xml.match(new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`));
	const raw = match?.[1]?.trim();
	if (!raw) return undefined;
	// Strip CDATA wrapper: <![CDATA[...]]>
	const cdataMatch = raw.match(/^<!\[CDATA\[([\s\S]*?)]]>$/);
	return cdataMatch ? cdataMatch[1].trim() : raw;
}

function parseDurationToMinutes(duration: string | undefined): number | undefined {
	if (!duration) return undefined;

	const trimmed = duration.trim();

	// Pure seconds: "3600"
	if (/^\d+$/.test(trimmed)) {
		return Math.round(Number(trimmed) / 60);
	}

	// HH:MM:SS or MM:SS
	const parts = trimmed.split(":").map(Number);
	if (parts.some(Number.isNaN)) return undefined;

	if (parts.length === 3) {
		const [hours, minutes, seconds] = parts;
		return hours * 60 + minutes + Math.round(seconds / 60);
	}
	if (parts.length === 2) {
		const [minutes, seconds] = parts;
		return minutes + Math.round(seconds / 60);
	}

	return undefined;
}

function parseIsoDate(pubDate: string | undefined): string | undefined {
	if (!pubDate) return undefined;
	const date = new Date(pubDate);
	if (Number.isNaN(date.getTime())) return undefined;
	return date.toISOString();
}

function parseEpisodeNumber(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const number = Number(value);
	return Number.isNaN(number) ? undefined : number;
}

export async function fetchPodcastChannelInfo(
	feedUrl: string,
): Promise<{ description: string | null } | null> {
	try {
		const response = await fetch(feedUrl);
		if (!response.ok) return null;

		const xml = await response.text();

		// Extract the channel block (everything before the first <item>)
		const channelEndIndex = xml.indexOf("<item");
		const channelXml = channelEndIndex > -1 ? xml.slice(0, channelEndIndex) : xml;

		const description =
			extractTagContent(channelXml, "itunes:summary") ??
			extractTagContent(channelXml, "description") ??
			null;

		return { description };
	} catch {
		return null;
	}
}

export async function fetchPodcastEpisodes(feedUrl: string): Promise<PodcastEpisode[]> {
	const response = await fetch(feedUrl);
	if (!response.ok) return [];

	const xml = await response.text();

	// Split on <item> boundaries to get individual episode blocks
	const itemMatches = xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/g);
	const episodes: PodcastEpisode[] = [];

	for (const match of itemMatches) {
		const itemXml = match[1];

		const title = extractTagContent(itemXml, "title");
		const guid = extractTagContent(itemXml, "guid");
		const pubDate = extractTagContent(itemXml, "pubDate");
		const episodeNumberRaw = extractTagContent(itemXml, "itunes:episode");
		const seasonNumberRaw = extractTagContent(itemXml, "itunes:season");
		const durationRaw = extractTagContent(itemXml, "itunes:duration");

		if (!title && !guid) continue;

		episodes.push({
			guid: guid ?? title ?? String(episodes.length),
			title: title ?? "Untitled",
			episodeNumber: parseEpisodeNumber(episodeNumberRaw),
			seasonNumber: parseEpisodeNumber(seasonNumberRaw),
			publishedAt: parseIsoDate(pubDate),
			durationMinutes: parseDurationToMinutes(durationRaw),
		});
	}

	return episodes;
}
