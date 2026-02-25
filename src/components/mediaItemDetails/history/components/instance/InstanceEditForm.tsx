import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import type { FictionRating } from "#/db/schema";
import { DeleteButton } from "@/components/common/DeleteButton";
import { FictionRatingForm } from "@/components/common/rating/fictionRating/FictionRatingForm";
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
	const [fictionRating, setFictionRating] = useState<FictionRating | null>(
		instance?.fictionRating ?? null,
	);
	const [showFictionRating, setShowFictionRating] = useState(
		!!instance?.fictionRating,
	);
	const [reviewText, setReviewText] = useState(instance?.reviewText ?? "");
	const [startedAt, setStartedAt] = useState(
		instance?.startedAt ?? (instance === undefined ? new Date().toISOString().split("T")[0] : ""),
	);
	const [completedAt, setCompletedAt] = useState(instance?.completedAt ?? "");
	const [saving, setSaving] = useState(false);
	const startedAtId = useId();
	const completedAtId = useId();
	const reviewTextId = useId();

	async function onSaveInstance() {
		setSaving(true);
		try {
			await saveInstance({
				data: {
					mediaItemId: mediaItemId,
					instanceId: instance?.id,
					rating: rating !== null ? rating.toFixed(1) : undefined,
					fictionRating: fictionRating ?? undefined,
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

	async function onRemoveDetailedRating() {
		setShowFictionRating(false);
		setFictionRating(null);
		setRating(0);
		if (instance?.id) {
			setSaving(true);
			try {
				await saveInstance({
					data: {
						mediaItemId,
						instanceId: instance.id,
						rating: "0",
						reviewText: reviewText || undefined,
						startedAt: startedAt || undefined,
						completedAt: completedAt || undefined,
					},
				});
			} finally {
				setSaving(false);
			}
		}
	}

	async function onDeleteInstance() {
		if (!instance) return;
		setSaving(true);
		try {
			await deleteInstance({ data: { instanceId: instance.id } });
			onSave();
		} finally {
			setSaving(false);
		}
	}

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

			{showFictionRating ? (
				<div className="flex flex-col gap-2">
					<div className="flex flex-row items-center gap-2">
						<span className="text-sm text-muted-foreground w-32">
							{t("mediaItemDetails.overallRating")}
						</span>
						<RatingStars rating={rating} shouldShowIfNoRating={true} />
						<DeleteButton
							className="ml-auto"
							onClick={onRemoveDetailedRating}
							disabled={saving}
						>
							{t("mediaItemDetails.removeDetailedRating")}
						</DeleteButton>
					</div>
					<hr className="border-border" />
					<FictionRatingForm
						initialValue={fictionRating}
						updateRating={setRating}
						updateFictionRating={setFictionRating}
					/>
				</div>
			) : (
				<div className="flex flex-row items-center gap-2">
					<RatingStars
						rating={rating}
						updateRating={setRating}
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
			)}

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
				<Button size="sm" onClick={onSaveInstance} disabled={saving}>
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
					<DeleteButton
						className="ml-auto"
						onClick={onDeleteInstance}
						disabled={saving}
					>
						{t("mediaItemDetails.delete")}
					</DeleteButton>
				)}
			</div>
		</div>
	);
}
