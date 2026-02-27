import { useRouter } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { type SeriesDetails, updateSeriesMetadata } from "#/server/series";
import { FormField } from "../mediaItemDetails/metadata/components/editMetadata/FormField";

interface EditSeriesDialogProps {
	seriesDetails: SeriesDetails;
}

export function EditSeriesDialog({ seriesDetails }: EditSeriesDialogProps) {
	const { t } = useTranslation();
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [name, setName] = useState(seriesDetails.name);
	const [description, setDescription] = useState(
		seriesDetails.description ?? "",
	);
	const [isComplete, setIsComplete] = useState(seriesDetails.isComplete);

	const isCompleteToggleId = useId();

	async function handleSave() {
		setIsSaving(true);
		setError(null);
		try {
			await updateSeriesMetadata({
				data: {
					seriesId: seriesDetails.id,
					name,
					description: description || undefined,
					isComplete,
				},
			});
			router.invalidate();
			setIsOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save changes.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="text-muted-foreground hover:text-foreground"
				onClick={() => setIsOpen(true)}
				aria-label={t("seriesDetails.edit")}
			>
				<Pencil className="size-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{t("seriesDetails.edit")}</DialogTitle>
					</DialogHeader>

					<div className="flex flex-col gap-4 overflow-y-auto max-h-[65vh] pr-1">
						<FormField label={t("metadata.title")}>
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</FormField>

						<FormField label={t("metadata.description")}>
							<Textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
							/>
						</FormField>

						<div className="flex items-center gap-3">
							<Switch
								id={isCompleteToggleId}
								checked={isComplete}
								onCheckedChange={setIsComplete}
							/>
							<Label htmlFor={isCompleteToggleId}>
								{t("seriesDetails.complete")}
							</Label>
						</div>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<div className="flex gap-2 pt-2">
						<Button size="sm" onClick={handleSave} disabled={isSaving}>
							{t("mediaItemDetails.save")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsOpen(false)}
							disabled={isSaving}
						>
							{t("mediaItemDetails.cancel")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
