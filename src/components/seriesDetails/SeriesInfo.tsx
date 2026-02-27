import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { mediaItemStatusEnum } from "#/db/schema";
import {
	type SeriesDetails,
	updateSeriesRating,
	updateSeriesStatus,
} from "#/server/series";
import { RatingStars } from "../common/rating/RatingStars";
import { EditSeriesDialog } from "./EditSeriesDialog";
import { SeriesCompletionBadge } from "./SeriesCompletionBadge";

interface SeriesInfoProps {
	seriesDetails: SeriesDetails;
}

export function SeriesInfo({ seriesDetails }: SeriesInfoProps) {
	const router = useRouter();
	const { t } = useTranslation();

	async function handleStatusChange(status: string) {
		await updateSeriesStatus({
			data: {
				seriesId: seriesDetails.id,
				status: status as (typeof mediaItemStatusEnum.enumValues)[number],
			},
		});
		router.invalidate();
	}

	async function handleRatingSave(value: number | null) {
		await updateSeriesRating({
			data: {
				seriesId: seriesDetails.id,
				rating: value !== null ? value.toFixed(1) : null,
			},
		});
		router.invalidate();
	}

	return (
		<div className="flex flex-col gap-5 mb-10">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-start gap-3 flex-wrap">
					<h1 className="text-3xl font-bold leading-tight">
						{seriesDetails.name}
					</h1>
					<span className="mt-2 text-s px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0">
						{t(`mediaType.${seriesDetails.type}`)}
					</span>
					<SeriesCompletionBadge isComplete={seriesDetails.isComplete} />
				</div>
				<EditSeriesDialog seriesDetails={seriesDetails} />
			</div>

			{seriesDetails.description && (
				<p className="text-muted-foreground text-sm leading-relaxed">
					{seriesDetails.description}
				</p>
			)}

			<Select value={seriesDetails.status} onValueChange={handleStatusChange} disabled={seriesDetails.isStatusAutoOverridden}>
				<SelectTrigger className="w-56">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{mediaItemStatusEnum.enumValues.map((status) => (
						<SelectItem key={status} value={status}>
							{t(`status.${status}`)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<RatingStars
				rating={seriesDetails.rating}
				updateRating={handleRatingSave}
				shouldShowIfNoRating={true}
			/>
		</div>
	);
}
