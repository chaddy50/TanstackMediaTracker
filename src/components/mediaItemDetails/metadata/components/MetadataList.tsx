import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { MediaItemType } from "#/lib/enums";
import { formatHours, formatMinutes } from "#/lib/utils";
import { SeriesLink } from "#/components/common/SeriesLink";
import type { MediaItemDetails } from "#/server/mediaItem";

export function MetadataList({
	type,
	metadata,
	releaseDate,
	seriesId,
	seriesName,
	tags = [],
}: {
	type: MediaItemDetails["type"];
	metadata: MediaItemDetails["metadata"];
	releaseDate: MediaItemDetails["releaseDate"];
	seriesId?: number | null;
	seriesName?: string | null;
	tags?: string[];
}) {
	const { t } = useTranslation();
	const fields: Array<{
		label: string;
		value: string;
		shouldSeriesNameBeLink?: boolean;
	}> = [];

	if (releaseDate) {
		fields.push({
			label: t("mediaItemDetails.releaseDate"),
			value: new Date(`${releaseDate}T00:00:00`).getFullYear().toString(),
		});
	}

	if (metadata) {
		const m = metadata as Record<string, unknown>;
		switch (type) {
			case MediaItemType.BOOK:
				if (typeof m.author === "string")
					fields.push({ label: t("metadata.author"), value: m.author });
				if (seriesName) {
					const seriesLabel =
						typeof m.seriesBookNumber === "string"
							? `${seriesName} #${m.seriesBookNumber}`
							: seriesName;
					fields.push({
						label: t("metadata.series"),
						value: seriesLabel,
						shouldSeriesNameBeLink: !!seriesId,
					});
				}
				if (typeof m.pageCount === "number") {
					fields.push({
						label: t("metadata.pageCount"),
						value: `${m.pageCount}`,
					});
					// ~300 WPM x 275 words/page / 60 min/hr = 65 pages/hour (HowLongToRead.com methodology)
					const readingHours = Math.round((m.pageCount as number) / 65);
					if (readingHours >= 1) {
						fields.push({
							label: t("metadata.readingTime"),
							value: formatHours(readingHours, t),
						});
					}
				}
				if (Array.isArray(m.genres) && m.genres.length)
					fields.push({
						label: t("metadata.genres"),
						value: m.genres.join(", "),
					});
				break;
			case MediaItemType.MOVIE:
				if (seriesName)
					fields.push({
						label: t("metadata.series"),
						value: seriesName,
						shouldSeriesNameBeLink: !!seriesId,
					});
				if (typeof m.director === "string")
					fields.push({ label: t("metadata.director"), value: m.director });
				if (typeof m.runtime === "number")
					fields.push({
						label: t("metadata.runtime"),
						value: formatMinutes(m.runtime as number, t),
					});
				if (Array.isArray(m.genres) && m.genres.length)
					fields.push({
						label: t("metadata.genres"),
						value: m.genres.join(", "),
					});
				break;
			case MediaItemType.TV_SHOW:
				if (seriesName)
					fields.push({
						label: t("metadata.series"),
						value: seriesName,
						shouldSeriesNameBeLink: !!seriesId,
					});
				if (typeof m.creator === "string")
					fields.push({ label: t("metadata.creator"), value: m.creator });
				if (typeof m.seasons === "number")
					fields.push({ label: t("metadata.seasons"), value: `${m.seasons}` });
				if (
					typeof m.episodeRuntime === "number" &&
					typeof m.numberOfEpisodes === "number"
				) {
					const totalHours = Math.round(
						((m.episodeRuntime as number) * (m.numberOfEpisodes as number)) / 60,
					);
					if (totalHours >= 1) {
						fields.push({
							label: t("metadata.totalRuntime"),
							value: formatHours(totalHours, t),
						});
					}
				}
				if (Array.isArray(m.genres) && m.genres.length)
					fields.push({
						label: t("metadata.genres"),
						value: m.genres.join(", "),
					});
				break;
			case MediaItemType.VIDEO_GAME:
				if (seriesName)
					fields.push({
						label: t("metadata.series"),
						value: seriesName,
						shouldSeriesNameBeLink: !!seriesId,
					});
				if (typeof m.developer === "string")
					fields.push({ label: t("metadata.developer"), value: m.developer });
				if (Array.isArray(m.platforms) && m.platforms.length)
					fields.push({
						label: t("metadata.platforms"),
						value: m.platforms.join(", "),
					});
				if (Array.isArray(m.genres) && m.genres.length)
					fields.push({
						label: t("metadata.genres"),
						value: m.genres.join(", "),
					});
				if (typeof m.timeToBeatHastily === "number")
					fields.push({
						label: t("timeToBeat.hastily"),
						value: formatHours(m.timeToBeatHastily, t),
					});
				if (typeof m.timeToBeatNormally === "number")
					fields.push({
						label: t("timeToBeat.normally"),
						value: formatHours(m.timeToBeatNormally, t),
					});
				if (typeof m.timeToBeatCompletely === "number")
					fields.push({
						label: t("timeToBeat.completely"),
						value: formatHours(m.timeToBeatCompletely, t),
					});
				break;
			case MediaItemType.PODCAST:
				if (seriesName)
					fields.push({
						label: t("metadata.series"),
						value: seriesName,
						shouldSeriesNameBeLink: !!seriesId,
					});
				if (typeof m.creator === "string")
					fields.push({ label: t("metadata.creator"), value: m.creator });
				if (Array.isArray(m.episodeTitles) && m.episodeTitles.length) {
					fields.push({
						label: t("podcast.episodes"),
						value:
							m.episodeTitles.length === 1
								? String(m.episodeTitles[0])
								: `${m.episodeTitles.length} ${t("podcast.episodesCount")}`,
					});
				}
				if (typeof m.totalDuration === "number" && m.totalDuration > 0)
					fields.push({
						label: t("metadata.runtime"),
						value: formatMinutes(m.totalDuration as number, t),
					});
				if (Array.isArray(m.genres) && m.genres.length)
					fields.push({
						label: t("metadata.genres"),
						value: m.genres.join(", "),
					});
				break;
		}
	}

	if (fields.length === 0 && tags.length === 0) return null;

	return (
		<div className="flex flex-col gap-1.5 text-sm">
			{fields.map(({ label, value, shouldSeriesNameBeLink }) => (
				<Fragment key={label}>
					<div className="flex gap-3">
						<span className="text-muted-foreground w-28 shrink-0">
							{label}
						</span>
						{shouldSeriesNameBeLink ? (
							<SeriesLink seriesId={seriesId} seriesName={value} />
						) : (
							<span className="text-foreground">{value}</span>
						)}
					</div>
				</Fragment>
			))}
			{tags.length > 0 && (
				<div className="flex gap-3">
					<span className="text-muted-foreground w-28 shrink-0">
						{t("mediaItem.tags")}
					</span>
					<div className="flex flex-wrap gap-1.5">
						{tags.map((tag) => (
							<span
								key={tag}
								className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
							>
								{tag}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
