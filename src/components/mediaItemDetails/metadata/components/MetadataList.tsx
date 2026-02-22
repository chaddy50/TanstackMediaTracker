import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import type { MediaItemDetails } from "@/server/mediaItem";

export function MetadataList({
	type,
	metadata,
	releaseDate,
}: {
	type: MediaItemDetails["type"];
	metadata: MediaItemDetails["metadata"];
	releaseDate: MediaItemDetails["releaseDate"];
}) {
	const { t } = useTranslation();
	const fields: Array<{ label: string; value: string }> = [];

	if (releaseDate) {
		fields.push({
			label: t("mediaItemDetails.releaseDate"),
			value: new Date(`${releaseDate}T00:00:00`).getFullYear().toString(),
		});
	}

	if (metadata) {
		const m = metadata as Record<string, unknown>;
		switch (type) {
			case "book":
				if (typeof m.author === "string")
					fields.push({ label: t("metadata.author"), value: m.author });
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
			case "movie":
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
			case "tv_show":
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
			case "video_game":
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
			{fields.map(({ label, value }) => (
				<Fragment key={label}>
					<div className="flex gap-3">
						<span className="text-gray-400 min-w-20 shrink-0">{label}</span>
						<span className="text-gray-200">{value}</span>
					</div>
				</Fragment>
			))}
		</div>
	);
}
