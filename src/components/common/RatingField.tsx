import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RatingBadge } from "#/components/common/RatingBadge";
import { Button } from "#/components/ui/button";
import { Slider } from "#/components/ui/slider";

interface RatingFieldProps {
	rating: number | null;
	onSave: (value: number | null) => Promise<void>;
}

export function RatingField({ rating, onSave }: RatingFieldProps) {
	const { t } = useTranslation();
	const [isEditing, setIsEditing] = useState(false);
	const [newRating, setNewRating] = useState(rating ?? 3);
	const [isSaving, setIsSaving] = useState(false);

	function handleOpen() {
		setNewRating(rating ?? 3);
		setIsEditing(true);
	}

	async function handleSave() {
		setIsSaving(true);
		try {
			await onSave(newRating);
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	}

	async function handleRemove() {
		setIsSaving(true);
		try {
			await onSave(null);
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	}

	if (isEditing) {
		return (
			<div className="flex flex-col gap-2">
				<span className="text-sm text-muted-foreground">
					{t("mediaItemDetails.rating")}:{" "}
					<span className="text-foreground font-medium">
						{newRating.toFixed(1)}
					</span>
				</span>
				<Slider
					min={1}
					max={5}
					step={1}
					value={[newRating]}
					onValueChange={(vals) => setNewRating(vals[0] ?? newRating)}
					className="max-w-sm"
				/>
				<div className="flex gap-2">
					<Button size="sm" onClick={handleSave} disabled={isSaving}>
						{t("mediaItemDetails.save")}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsEditing(false)}
						disabled={isSaving}
					>
						{t("mediaItemDetails.cancel")}
					</Button>
					{rating !== null && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleRemove}
							disabled={isSaving}
							className="ml-auto text-muted-foreground hover:text-foreground"
						>
							{t("mediaItemDetails.removeRating")}
						</Button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			{rating !== null && <RatingBadge rating={rating.toFixed(1)} />}
			<Button variant="outline" size="sm" onClick={handleOpen}>
				{rating !== null
					? t("mediaItemDetails.edit")
					: t("mediaItemDetails.addRating")}
			</Button>
		</div>
	);
}
