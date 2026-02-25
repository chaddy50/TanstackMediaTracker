import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { RatingStars } from "@/components/common/rating/RatingStars";
import {
	deleteInstance,
	type MediaItemDetails,
	saveInstance,
} from "@/server/mediaItem";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

interface InstanceEditFormProps {
	instance?: MediaItemDetails["instances"][number];
	mediaItemId: number;
	onSave: () => void;
	onCancel: () => void;
}

export function InstanceEditForm({
	instance,
	mediaItemId,
	onSave,
	onCancel,
}: InstanceEditFormProps) {
	const { t } = useTranslation();
	const [rating, setRating] = useState<number>(instance?.rating ?? 0);
	const [reviewText, setReviewText] = useState(instance?.reviewText ?? "");
	const [startedAt, setStartedAt] = useState(instance?.startedAt ?? "");
	const [completedAt, setCompletedAt] = useState(instance?.completedAt ?? "");
	const [saving, setSaving] = useState(false);

	async function handleSave() {
		setSaving(true);
		try {
			await saveInstance({
				data: {
					mediaItemId: mediaItemId,
					instanceId: instance?.id,
					rating: rating !== null ? rating.toFixed(1) : undefined,
					reviewText: reviewText || undefined,
					startedAt: startedAt || undefined,
					completedAt: completedAt || undefined,
				},
			});
			onSave();
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!instance) return;
		setSaving(true);
		try {
			await deleteInstance({ data: { instanceId: instance.id } });
			onSave();
		} finally {
			setSaving(false);
		}
	}

	const startedAtId = useId();
	const completedAtId = useId();
	const reviewTextId = useId();

	return (
		<div className="p-4 rounded-lg border border-border bg-card flex flex-col gap-5">
			{/* Dates */}
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
						value={startedAt}
						onChange={(e) => setStartedAt(e.target.value)}
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
						value={completedAt}
						onChange={(e) => setCompletedAt(e.target.value)}
					/>
				</div>
			</div>

			{/* Rating */}
			<RatingStars
				rating={rating}
				updateRating={setRating}
				shouldShowIfNoRating={true}
			/>

			{/* Review */}
			<div className="flex flex-col gap-1.5">
				<label className="text-sm text-muted-foreground" htmlFor={reviewTextId}>
					{t("mediaItemDetails.review")}
				</label>
				<Textarea
					id={reviewTextId}
					value={reviewText}
					onChange={(e) => setReviewText(e.target.value)}
					placeholder="Write your review..."
					rows={3}
				/>
			</div>

			{/* Actions */}
			<div className="flex gap-2">
				<Button size="sm" onClick={handleSave} disabled={saving}>
					{t("mediaItemDetails.save")}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onCancel}
					disabled={saving}
				>
					{t("mediaItemDetails.cancel")}
				</Button>
				{instance && (
					<Button
						variant="destructive"
						size="sm"
						onClick={handleDelete}
						disabled={saving}
						className="ml-auto"
					>
						{t("mediaItemDetails.delete")}
					</Button>
				)}
			</div>
		</div>
	);
}
