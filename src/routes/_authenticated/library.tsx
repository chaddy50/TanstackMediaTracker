import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AddMediaButton } from "#/components/common/AddMediaButton";
import { PageHeader } from "#/components/common/PageHeader";
import { MediaCard } from "#/components/MediaCard";
import { Toggle } from "#/components/ui/toggle";
import { mediaItemStatusEnum, mediaTypeEnum } from "#/db/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { getLibrary, type LibraryItem } from "#/server/library";

const searchSchema = z.object({
	type: z.enum(mediaTypeEnum.enumValues).optional(),
	status: z.enum(mediaItemStatusEnum.enumValues).optional(),
});

const TYPE_FILTERS = [
	{ value: undefined, labelKey: "library.allTypes" },
	{ value: MediaItemType.BOOK, labelKey: "mediaType.book" },
	{ value: MediaItemType.MOVIE, labelKey: "mediaType.movie" },
	{ value: MediaItemType.TV_SHOW, labelKey: "mediaType.tv_show" },
	{ value: MediaItemType.VIDEO_GAME, labelKey: "mediaType.video_game" },
] as const;

const STATUS_FILTERS = [
	{ value: undefined, labelKey: "library.allStatuses" },
	{ value: MediaItemStatus.BACKLOG, labelKey: "status.backlog" },
	{ value: MediaItemStatus.IN_PROGRESS, labelKey: "status.in_progress" },
	{ value: MediaItemStatus.COMPLETED, labelKey: "status.completed" },
	{ value: MediaItemStatus.DROPPED, labelKey: "status.dropped" },
	{ value: MediaItemStatus.ON_HOLD, labelKey: "status.on_hold" },
] as const;

export const Route = createFileRoute("/_authenticated/library")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => getLibrary({ data: deps }),
	component: LibraryPage,
});

function LibraryPage() {
	const mediaItems: LibraryItem[] = Route.useLoaderData();
	const { type, status } = Route.useSearch();
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader title={t("library.title")} right={<AddMediaButton />} />

			<div className="px-6 py-4 border-b border-border flex flex-col gap-3">
				<div className="flex gap-2 flex-wrap">
					{TYPE_FILTERS.map((filter) => (
						<Toggle
							key={filter.labelKey}
							variant="outline"
							pressed={type === filter.value}
							onPressedChange={() =>
								navigate({
									to: "/library",
									search: (prev) => ({ ...prev, type: filter.value }),
								})
							}
						>
							{t(filter.labelKey)}
						</Toggle>
					))}
				</div>

				<div className="flex gap-2 flex-wrap">
					{STATUS_FILTERS.map((filter) => (
						<Toggle
							key={filter.labelKey}
							variant="outline"
							pressed={status === filter.value}
							onPressedChange={() =>
								navigate({
									to: "/library",
									search: (prev) => ({ ...prev, status: filter.value }),
								})
							}
						>
							{t(filter.labelKey)}
						</Toggle>
					))}
				</div>
			</div>

			<main className="px-6 py-6">
				{mediaItems.length === 0 ? (
					<p className="text-muted-foreground text-center py-12">
						{t("library.empty")}
					</p>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
						{mediaItems.map((mediaItem) => (
							<MediaCard key={mediaItem.id} mediaItem={mediaItem} />
						))}
					</div>
				)}
			</main>
		</div>
	)
}
