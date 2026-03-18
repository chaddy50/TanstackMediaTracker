import { Input } from "#/components/ui/input";
import { MediaItemStatus } from "#/server/enums";
import {
	type MediaItemDetails,
	setMediaItemExpectedReleaseDate,
} from "#/server/mediaItems/mediaItem";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

interface ExpectedReleaseDateInputProps {
	mediaItemDetails: MediaItemDetails;
}

export function ExpectedReleaseDateInput({
	mediaItemDetails,
}: ExpectedReleaseDateInputProps) {
	const router = useRouter();
	const { t } = useTranslation();

	if (mediaItemDetails.status !== MediaItemStatus.WAITING_FOR_NEXT_RELEASE) {
		return null;
	}

	async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		await setMediaItemExpectedReleaseDate({
			data: {
				mediaItemId: mediaItemDetails.id,
				expectedReleaseDate: event.target.value || null,
			},
		});
		router.invalidate();
	}

	return (
		<div className="flex gap-3 text-sm">
			<span className="text-muted-foreground w-28 shrink-0">
				{t("mediaItemDetails.expectedReleaseDate")}
			</span>
			<Input
				type="date"
				className="w-44 h-auto py-0 text-sm"
				value={mediaItemDetails.expectedReleaseDate ?? ""}
				onChange={handleChange}
			/>
		</div>
	);
}
