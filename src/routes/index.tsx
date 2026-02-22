import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { MediaCard } from "#/components/MediaCard";
import { Toggle } from "#/components/ui/toggle";
import { mediaItemStatusEnum, mediaTypeEnum } from "#/db/schema";
import { getLibrary, type LibraryItem } from "#/server/library";

const searchSchema = z.object({
	type: z.enum(mediaTypeEnum.enumValues).optional(),
	status: z.enum(mediaItemStatusEnum.enumValues).optional(),
});

const TYPE_FILTERS = [
	{ value: undefined, labelKey: "library.allTypes" },
	{ value: "book", labelKey: "mediaType.book" },
	{ value: "movie", labelKey: "mediaType.movie" },
	{ value: "tv_show", labelKey: "mediaType.tv_show" },
	{ value: "video_game", labelKey: "mediaType.video_game" },
] as const;

const STATUS_FILTERS = [
	{ value: undefined, labelKey: "library.allStatuses" },
	{ value: "backlog", labelKey: "status.backlog" },
	{ value: "in_progress", labelKey: "status.in_progress" },
	{ value: "completed", labelKey: "status.completed" },
	{ value: "dropped", labelKey: "status.dropped" },
	{ value: "on_hold", labelKey: "status.on_hold" },
] as const;

export const Route = createFileRoute("/")({
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
		<div className="min-h-screen bg-gray-950 text-white">
			<header className="px-6 py-4 border-b border-gray-800">
				<h1 className="text-2xl font-bold">{t("library.title")}</h1>
			</header>

			<div className="px-6 py-4 border-b border-gray-800 flex flex-col gap-3">
				<div className="flex gap-2 flex-wrap">
					{TYPE_FILTERS.map((filter) => (
						<Toggle
							key={filter.labelKey}
							variant="outline"
							pressed={type === filter.value}
							onPressedChange={() =>
								navigate({
									to: "/",
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
									to: "/",
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
					<p className="text-gray-500 text-center py-12">
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
	);
}
