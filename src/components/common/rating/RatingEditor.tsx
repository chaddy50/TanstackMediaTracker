import { Button } from "#/components/ui/button";
import type { FictionRating } from "#/db/schema";
import { DeleteButton } from "@/components/common/DeleteButton";
import { FictionRatingForm } from "@/components/common/rating/fictionRating/FictionRatingForm";
import { RatingStars } from "@/components/common/rating/RatingStars";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface RatingEditorProps {
	rating: number;
	fictionRating: FictionRating | null;
	onRatingChange: (rating: number) => void;
	onFictionRatingChange: (fictionRating: FictionRating | null) => void;
	/** Called after the detailed rating is removed, for any extra side effects (e.g. immediate DB save). */
	onRemoveDetailedRating?: () => void;
	disabled?: boolean;
}

export function RatingEditor({
	rating,
	fictionRating,
	onRatingChange,
	onFictionRatingChange,
	onRemoveDetailedRating,
	disabled,
}: RatingEditorProps) {
	const { t } = useTranslation();
	const [showFictionRating, setShowFictionRating] = useState(!!fictionRating);

	function handleRemoveDetailedRating() {
		setShowFictionRating(false);
		onRatingChange(0);
		onFictionRatingChange(null);
		onRemoveDetailedRating?.();
	}

	if (showFictionRating) {
		return (
			<div className="flex flex-col gap-2">
				<div className="flex flex-row items-center gap-2">
					<span className="text-sm text-muted-foreground w-32">
						{t("mediaItemDetails.overallRating")}
					</span>
					<RatingStars rating={rating} shouldShowIfNoRating={true} />
					<DeleteButton
						className="ml-auto"
						onClick={handleRemoveDetailedRating}
						disabled={disabled}
					>
						{t("mediaItemDetails.removeDetailedRating")}
					</DeleteButton>
				</div>
				<hr className="border-border" />
				<FictionRatingForm
					initialValue={fictionRating}
					updateRating={onRatingChange}
					updateFictionRating={onFictionRatingChange}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-row items-center gap-2">
			<RatingStars
				rating={rating}
				updateRating={onRatingChange}
				shouldShowIfNoRating={true}
			/>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setShowFictionRating(true)}
			>
				{t("mediaItemDetails.detailedRating")}
			</Button>
		</div>
	);
}
