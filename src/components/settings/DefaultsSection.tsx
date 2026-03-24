import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	getDefaultMethod,
	getMethodOptions,
} from "#/components/mediaItemDetails/history/components/instance/consumptionUtils";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { SingleSelectFilter } from "#/components/ui/single-select-filter";
import { Toggle } from "#/components/ui/toggle";
import type { SortDirection } from "#/db/schema";
import { useUserSettings } from "#/hooks/useUserSettings";
import { GameControlMethod, MediaItemType } from "#/server/enums";
import { updateUserSettings } from "#/server/settings";
import { ITEM_SORT_FIELDS, SERIES_SORT_FIELDS } from "#/server/sortFields";

type DraftSettings = {
	defaultLibrarySortBy: string;
	defaultLibrarySortDirection: string;
	defaultSeriesSortBy: string;
	defaultSeriesSortDirection: string;
	defaultBookConsumptionMethod: string;
	defaultMovieConsumptionMethod: string;
	defaultTvShowConsumptionMethod: string;
	defaultGamePlatform: string;
	defaultGameControlMethod: string;
};

function buildDraft(
	settings: ReturnType<typeof useUserSettings>["data"],
): DraftSettings {
	return {
		defaultLibrarySortBy: settings?.defaultLibrarySortBy ?? "series",
		defaultLibrarySortDirection: settings?.defaultLibrarySortDirection ?? "asc",
		defaultSeriesSortBy: settings?.defaultSeriesSortBy ?? "name",
		defaultSeriesSortDirection: settings?.defaultSeriesSortDirection ?? "asc",
		defaultBookConsumptionMethod:
			settings?.defaultBookConsumptionMethod ??
			getDefaultMethod(MediaItemType.BOOK),
		defaultMovieConsumptionMethod:
			settings?.defaultMovieConsumptionMethod ??
			getDefaultMethod(MediaItemType.MOVIE),
		defaultTvShowConsumptionMethod:
			settings?.defaultTvShowConsumptionMethod ??
			getDefaultMethod(MediaItemType.TV_SHOW),
		defaultGamePlatform:
			settings?.defaultGamePlatform ??
			getDefaultMethod(MediaItemType.VIDEO_GAME),
		defaultGameControlMethod:
			settings?.defaultGameControlMethod ?? GameControlMethod.CONTROLLER,
	};
}

export function DefaultsSection() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: settings } = useUserSettings();
	const hasInitialized = useRef(false);

	const [draft, setDraft] = useState<DraftSettings>(() =>
		buildDraft(undefined),
	);
	const [isSaving, setIsSaving] = useState(false);
	const [isSaved, setIsSaved] = useState(false);

	useEffect(() => {
		if (settings !== undefined && !hasInitialized.current) {
			hasInitialized.current = true;
			setDraft(buildDraft(settings));
		}
	}, [settings]);

	function updateDraft(field: keyof DraftSettings, value: string) {
		setIsSaved(false);
		setDraft((previous) => ({ ...previous, [field]: value }));
	}

	async function handleSave() {
		setIsSaving(true);
		setIsSaved(false);
		try {
			await updateUserSettings({ data: draft });
			await queryClient.invalidateQueries({ queryKey: ["userSettings"] });
			setIsSaved(true);
		} finally {
			setIsSaving(false);
		}
	}

	const itemSortOptions = ITEM_SORT_FIELDS.map((field) => ({
		value: field,
		label: t(`views.form.sortByOption.${field}`),
	}));

	const seriesSortOptions = SERIES_SORT_FIELDS.map((field) => ({
		value: field,
		label: t(`views.form.sortByOption.${field}`),
	}));

	const sortDirections: SortDirection[] = ["asc", "desc"];

	const consumptionRows: Array<{
		label: string;
		field: keyof DraftSettings;
		type: MediaItemType;
	}> = [
		{
			label: t("mediaType.book"),
			field: "defaultBookConsumptionMethod",
			type: MediaItemType.BOOK,
		},
		{
			label: t("mediaType.movie"),
			field: "defaultMovieConsumptionMethod",
			type: MediaItemType.MOVIE,
		},
		{
			label: t("mediaType.tv_show"),
			field: "defaultTvShowConsumptionMethod",
			type: MediaItemType.TV_SHOW,
		},
	];

	const controlMethodOptions = Object.values(GameControlMethod)
		.sort((a, b) =>
			t(`consumption.controlMethod.${a}`).localeCompare(
				t(`consumption.controlMethod.${b}`),
			),
		)
		.map((method) => ({
			value: method,
			label: t(`consumption.controlMethod.${method}`),
		}));

	return (
		<section className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-semibold">
					{t("settings.defaults.title")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("settings.defaults.description")}
				</p>
			</div>

			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-3">
					<p className="text-sm font-medium">
						{t("settings.defaults.sortDefaults")}
					</p>

					<div className="flex flex-col gap-2">
						<Label className="text-muted-foreground">
							{t("settings.defaults.library")}
						</Label>
						<div className="flex items-center gap-2 flex-wrap">
							<div className="w-48">
								<SingleSelectFilter
									options={itemSortOptions}
									selectedValue={draft.defaultLibrarySortBy}
									onSelect={(value) =>
										updateDraft("defaultLibrarySortBy", value)
									}
								/>
							</div>
							{sortDirections.map((direction) => (
								<Toggle
									key={direction}
									variant="outline"
									pressed={draft.defaultLibrarySortDirection === direction}
									onPressedChange={() =>
										updateDraft("defaultLibrarySortDirection", direction)
									}
								>
									{t(`views.form.sortDirectionOption.${direction}`)}
								</Toggle>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label className="text-muted-foreground">
							{t("settings.defaults.series")}
						</Label>
						<div className="flex items-center gap-2 flex-wrap">
							<div className="w-48">
								<SingleSelectFilter
									options={seriesSortOptions}
									selectedValue={draft.defaultSeriesSortBy}
									onSelect={(value) =>
										updateDraft("defaultSeriesSortBy", value)
									}
								/>
							</div>
							{sortDirections.map((direction) => (
								<Toggle
									key={direction}
									variant="outline"
									pressed={draft.defaultSeriesSortDirection === direction}
									onPressedChange={() =>
										updateDraft("defaultSeriesSortDirection", direction)
									}
								>
									{t(`views.form.sortDirectionOption.${direction}`)}
								</Toggle>
							))}
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<p className="text-sm font-medium">
						{t("settings.defaults.consumptionDefaults")}
					</p>

					{consumptionRows.map(({ label, field, type }) => (
						<div key={field} className="flex flex-col gap-2">
							<Label className="text-muted-foreground">{label}</Label>
							<div className="w-48">
								<SingleSelectFilter
									options={getMethodOptions(type, t as (key: string) => string)}
									selectedValue={draft[field]}
									onSelect={(value) => updateDraft(field, value)}
								/>
							</div>
						</div>
					))}

					<div className="flex flex-col gap-2">
						<Label className="text-muted-foreground">
							{t("mediaType.video_game")}
						</Label>
						<div className="flex gap-2 flex-wrap">
							<div className="w-48">
								<SingleSelectFilter
									options={getMethodOptions(
										MediaItemType.VIDEO_GAME,
										t as (key: string) => string,
									)}
									selectedValue={draft.defaultGamePlatform}
									onSelect={(value) => updateDraft("defaultGamePlatform", value)}
								/>
							</div>
							<div className="w-48">
								<SingleSelectFilter
									options={controlMethodOptions}
									selectedValue={draft.defaultGameControlMethod}
									onSelect={(value) =>
										updateDraft("defaultGameControlMethod", value)
									}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<Button onClick={handleSave} disabled={isSaving} variant="outline">
					{isSaving
						? t("settings.defaults.saving")
						: t("settings.defaults.save")}
				</Button>
				{isSaved && (
					<span className="text-sm text-muted-foreground">
						{t("settings.defaults.saved")}
					</span>
				)}
			</div>
		</section>
	);
}
