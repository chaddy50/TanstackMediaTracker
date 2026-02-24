import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { MediaItemType } from "#/lib/enums";
import { SeriesLink } from "@/components/common/SeriesLink";
import type { MediaItemDetails } from "@/server/mediaItem";

export function MetadataList({
	type,
	metadata,
	releaseDate,
	seriesId,
}: {
	type: MediaItemDetails["type"];
	metadata: MediaItemDetails["metadata"];
	releaseDate: MediaItemDetails["releaseDate"];
	seriesId?: number | null;
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
				if (typeof m.series === "string") {
					const seriesLabel =
						typeof m.seriesBookNumber === "string"
							? `${m.series} #${m.seriesBookNumber}`
							: m.series;
					fields.push({
						label: t("metadata.series"),
						value: seriesLabel,
						shouldSeriesNameBeLink: !!seriesId,
					});
				}
				if (typeof m.pageCount === "number")
					fields.push({
						label: t("metadata.pageCount"),
						value: `${m.pageCount}`,
					});
				if (Array.isArray(m.genres) && m.genres.length)
					fields.push({
						label: t("metadata.genres"),
						value: m.genres.join(", "),
					});
				break;
			case MediaItemType.MOVIE:
				if (typeof m.series === "string")
					fields.push({
						label: t("metadata.series"),
						value: m.series,
						shouldSeriesNameBeLink: !!seriesId,
					});
				if (typeof m.director === "string")
					fields.push({ label: t("metadata.director"), value: m.director });
				if (typeof m.runtime === "number")
					fields.push({
						label: t("metadata.runtime"),
						value: `${m.runtime} min`,
					});
				if (Array.isArray(m.genres) && m.genres.length)
					fields.push({
						label: t("metadata.genres"),
						value: m.genres.join(", "),
					});
				break;
			case MediaItemType.TV_SHOW:
				if (typeof m.creator === "string")
					fields.push({ label: t("metadata.creator"), value: m.creator });
				if (typeof m.seasons === "number")
					fields.push({ label: t("metadata.seasons"), value: `${m.seasons}` });
				if (Array.isArray(m.genres) && m.genres.length)
					fields.push({
						label: t("metadata.genres"),
						value: m.genres.join(", "),
					});
				break;
			case MediaItemType.VIDEO_GAME:
				if (typeof m.series === "string")
					fields.push({
						label: t("metadata.series"),
						value: m.series,
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
				break;
		}
	}

	if (fields.length === 0) return null;

	return (
		<div className="flex flex-col gap-1.5 text-sm">
			{fields.map(({ label, value, shouldSeriesNameBeLink }) => (
				<Fragment key={label}>
					<div className="flex gap-3">
						<span className="text-muted-foreground min-w-20 shrink-0">
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
		</div>
	);
}
