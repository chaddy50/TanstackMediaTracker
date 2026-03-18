import { DeleteButton } from "#/components/common/DeleteButton";
import { ExpandableTextBlock } from "#/components/common/ExpandableTextBlock";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import type { SeasonReview } from "#/db/schema";
import { formatDateRange } from "#/lib/utils";
import { FictionRatingComments } from "@/components/common/rating/fictionRating/FictionRatingComments";
import { RatingEditor } from "@/components/common/rating/RatingEditor";
import { RatingStars } from "@/components/common/rating/ratingStars/RatingStars";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export interface SeasonReviewRowProps {
	seasonReview: SeasonReview;
	totalSeasons?: number;
	usedSeasons: Set<number>;
	isExpanded: boolean;
	onToggleExpanded: () => void;
	onChange: (patch: Partial<SeasonReview>) => void;
	onRemove: () => void;
}

export function SeasonReviewRow({
	seasonReview,
	totalSeasons,
	usedSeasons,
	isExpanded,
	onToggleExpanded,
	onChange,
	onRemove,
}: SeasonReviewRowProps) {
	const { t } = useTranslation();
	const startedAtId = useId();
	const completedAtId = useId();
	const reviewTextId = useId();

	const seasonOptions = totalSeasons
		? Array.from({ length: totalSeasons }, (_, i) => i + 1).filter(
				(s) => s === seasonReview.season || !usedSeasons.has(s),
			)
		: null;

	const dateRange = formatDateRange(
		seasonReview.startedAt || null,
		seasonReview.completedAt || null,
	);

	if (!isExpanded) {
		return (
			<div className="flex items-start justify-between gap-4 p-3 rounded-md border border-border bg-muted/30">
				<div className="flex flex-col gap-1 min-w-0">
					<div className="flex items-center gap-3 flex-wrap">
						<span className="text-sm font-medium text-muted-foreground">
							{t("mediaItemDetails.seasonN", { season: seasonReview.season })}
						</span>
						{dateRange && (
							<span className="text-muted-foreground text-sm">{dateRange}</span>
						)}
						<RatingStars rating={seasonReview.rating} />
					</div>
					{seasonReview.fictionRating && (
						<FictionRatingComments fictionRating={seasonReview.fictionRating} />
					)}
					{seasonReview.reviewText && (
						<ExpandableTextBlock text={seasonReview.reviewText} maxLines={3} />
					)}
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={onToggleExpanded}
					className="shrink-0"
				>
					{t("mediaItemDetails.edit")}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 p-3 rounded-md border border-border bg-muted/30">
			<div className="flex items-center justify-between gap-2">
				{seasonOptions ? (
					<select
						className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
						value={seasonReview.season}
						onChange={(e) => onChange({ season: Number(e.target.value) })}
					>
						{seasonOptions.map((s) => (
							<option key={s} value={s}>
								{t("mediaItemDetails.seasonN", { season: s })}
							</option>
						))}
					</select>
				) : (
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">
							{t("mediaItemDetails.season")}
						</span>
						<Input
							type="number"
							min={1}
							value={seasonReview.season}
							onChange={(e) => onChange({ season: Number(e.target.value) })}
							className="w-16 h-7 text-sm"
						/>
					</div>
				)}
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={onToggleExpanded}>
						{t("mediaItemDetails.collapse")}
					</Button>
					<DeleteButton onClick={onRemove}>
						{t("mediaItemDetails.removeSeason")}
					</DeleteButton>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4 max-w-sm">
				<div className="flex flex-col gap-1.5">
					<label
						className="text-sm text-muted-foreground"
						htmlFor={startedAtId}
					>
						{t("mediaItemDetails.started")}
					</label>
					<Input
						id={startedAtId}
						type="date"
						value={seasonReview.startedAt}
						onChange={(e) => onChange({ startedAt: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label
						className="text-sm text-muted-foreground"
						htmlFor={completedAtId}
					>
						{t("mediaItemDetails.completed")}
					</label>
					<Input
						id={completedAtId}
						type="date"
						value={seasonReview.completedAt}
						onChange={(e) => onChange({ completedAt: e.target.value })}
					/>
				</div>
			</div>

			<RatingEditor
				rating={seasonReview.rating}
				fictionRating={seasonReview.fictionRating ?? null}
				onRatingChange={(value) => onChange({ rating: value })}
				onFictionRatingChange={(value) =>
					onChange({ fictionRating: value ?? undefined })
				}
			/>

			<div className="flex flex-col gap-1.5">
				<label className="text-sm text-muted-foreground" htmlFor={reviewTextId}>
					{t("mediaItemDetails.review")}
				</label>
				<Textarea
					id={reviewTextId}
					value={seasonReview.reviewText}
					onChange={(e) => onChange({ reviewText: e.target.value })}
					placeholder="Write your season review..."
					rows={2}
				/>
			</div>
		</div>
	);
}
