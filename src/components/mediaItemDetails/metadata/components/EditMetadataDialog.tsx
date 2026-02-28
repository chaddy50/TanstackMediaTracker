import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { Pencil } from "lucide-react";

import { MediaItemType } from "#/lib/enums";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { type MediaItemDetails, updateMediaItemMetadata, updateMediaItemSeries } from "@/server/mediaItem";
import { BookFields } from "./editMetadata/BookFields";
import { MovieFields } from "./editMetadata/MovieFields";
import { TvShowFields } from "./editMetadata/TvShowFields";
import { GameFields } from "./editMetadata/GameFields";
import { FormField } from "./editMetadata/FormField";
import { SeriesField, type SeriesFieldValue } from "./editMetadata/SeriesField";

interface EditMetadataDialogProps {
	mediaItemDetails: MediaItemDetails;
}

export function EditMetadataDialog(props: EditMetadataDialogProps) {
	const { mediaItemDetails } = props;
	const { t } = useTranslation();
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const rawMetadata = (mediaItemDetails.metadata ?? {}) as Record<string, unknown>;

	const [title, setTitle] = useState(mediaItemDetails.title ?? "");
	const [description, setDescription] = useState(mediaItemDetails.description ?? "");
	const [coverImageUrl, setCoverImageUrl] = useState(mediaItemDetails.coverImageUrl ?? "");
	const [releaseYear, setReleaseYear] = useState(
		mediaItemDetails.releaseDate
			? new Date(`${mediaItemDetails.releaseDate}T00:00:00`).getFullYear().toString()
			: "",
	);
	const [typeMetadata, setTypeMetadata] = useState<Record<string, unknown>>(rawMetadata);
	const [seriesFieldValue, setSeriesFieldValue] = useState<SeriesFieldValue>(
		mediaItemDetails.seriesId !== null && mediaItemDetails.seriesId !== undefined
			? { mode: "existing", seriesId: mediaItemDetails.seriesId }
			: { mode: "none" },
	);

	const isSaveDisabled =
		isSaving ||
		(seriesFieldValue.mode === "new" && seriesFieldValue.name.trim() === "");

	async function handleSave() {
		setIsSaving(true);
		setError(null);
		try {
			await updateMediaItemMetadata({
				data: {
					metadataId: mediaItemDetails.metadataId,
					title,
					description: description || undefined,
					coverImageUrl: coverImageUrl || undefined,
					releaseDate: releaseYear ? `${releaseYear}-01-01` : undefined,
					metadata: typeMetadata,
				},
			});

			await updateMediaItemSeries({
				data: {
					mediaItemId: mediaItemDetails.id,
					metadataId: mediaItemDetails.metadataId,
					type: mediaItemDetails.type,
					seriesId:
						seriesFieldValue.mode === "existing"
							? seriesFieldValue.seriesId
							: null,
					newSeriesName:
						seriesFieldValue.mode === "new"
							? seriesFieldValue.name.trim()
							: undefined,
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
				aria-label={t("mediaItemDetails.edit")}
			>
				<Pencil className="size-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{t("mediaItemDetails.edit")}</DialogTitle>
					</DialogHeader>

					<div className="flex flex-col gap-4 overflow-y-auto max-h-[65vh] pr-1">
						<FormField label={t("metadata.title")}>
							<Input value={title} onChange={(e) => setTitle(e.target.value)} />
						</FormField>

						<FormField label={t("metadata.description")}>
							<Textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
							/>
						</FormField>

						<FormField label={t("metadata.coverImage")}>
							<Input
								value={coverImageUrl}
								onChange={(e) => setCoverImageUrl(e.target.value)}
								placeholder="https://..."
							/>
						</FormField>

						<FormField label={t("mediaItemDetails.releaseDate")}>
							<Input
								type="number"
								min={1800}
								max={new Date().getFullYear() + 5}
								placeholder={new Date().getFullYear().toString()}
								value={releaseYear}
								onChange={(e) => setReleaseYear(e.target.value)}
							/>
						</FormField>

						<SeriesField
							type={mediaItemDetails.type}
							initialSeriesId={mediaItemDetails.seriesId ?? null}
							onChange={setSeriesFieldValue}
						/>

						{mediaItemDetails.type === MediaItemType.BOOK && (
							<BookFields rawMetadata={rawMetadata} onChange={setTypeMetadata} />
						)}

						{mediaItemDetails.type === MediaItemType.MOVIE && (
							<MovieFields rawMetadata={rawMetadata} onChange={setTypeMetadata} />
						)}

						{mediaItemDetails.type === MediaItemType.TV_SHOW && (
							<TvShowFields rawMetadata={rawMetadata} onChange={setTypeMetadata} />
						)}

						{mediaItemDetails.type === MediaItemType.VIDEO_GAME && (
							<GameFields rawMetadata={rawMetadata} onChange={setTypeMetadata} />
						)}
					</div>

					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}

					<div className="flex gap-2 pt-2">
						<Button size="sm" onClick={handleSave} disabled={isSaveDisabled}>
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
