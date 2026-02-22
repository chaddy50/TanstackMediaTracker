import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Slider } from "#/components/ui/slider";
import { Textarea } from "#/components/ui/textarea";
import {
	deleteInstance,
	type MediaItemDetails,
	saveInstance,
} from "@/server/mediaItem";

export function InstanceEditForm({
	instance,
	mediaItemId,
	onSave,
	onCancel,
}: {
	instance?: MediaItemDetails["instances"][number];
	mediaItemId: number;
	onSave: () => void;
	onCancel: () => void;
}) {
	const { t } = useTranslation();
	const [rating, setRating] = useState(
		instance?.rating ? parseFloat(instance.rating) : 7,
	);
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
					rating: rating.toFixed(1),
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
		<div className="p-4 rounded-lg border border-gray-700 bg-gray-900 flex flex-col gap-5">
			{/* Rating */}
			<div className="flex flex-col gap-2">
				<span className="text-sm text-gray-400">
					{t("mediaItemDetails.rating")}:{" "}
					<span className="text-white font-medium">{rating.toFixed(1)}</span>
				</span>
				<Slider
					min={0}
					max={10}
					step={0.5}
					value={[rating]}
					onValueChange={(vals) => setRating(vals[0] ?? rating)}
					className="max-w-sm"
				/>
			</div>

			{/* Dates */}
			<div className="grid grid-cols-2 gap-4 max-w-sm">
				<div className="flex flex-col gap-1.5">
					<label className="text-sm text-gray-400" htmlFor={startedAtId}>
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
					<label className="text-sm text-gray-400" htmlFor={completedAtId}>
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

			{/* Review */}
			<div className="flex flex-col gap-1.5">
				<label className="text-sm text-gray-400" htmlFor={reviewTextId}>
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
