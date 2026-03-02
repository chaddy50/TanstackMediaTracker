import { Label } from "#/components/ui/label";
import { Toggle } from "#/components/ui/toggle";
import type { ItemSortField, SeriesSortField, SortDirection, ViewSubject } from "#/db/schema";
import { ITEM_SORT_FIELDS, SERIES_SORT_FIELDS } from "#/server/views";
import { useTranslation } from "react-i18next";

interface ViewSortingSectionProps {
	subject: ViewSubject;
	sortBy: ItemSortField | SeriesSortField;
	onSortByChange: (field: ItemSortField | SeriesSortField) => void;
	sortDirection: SortDirection;
	onSortDirectionChange: (direction: SortDirection) => void;
}

export function ViewSortingSection({
	subject,
	sortBy,
	onSortByChange,
	sortDirection,
	onSortDirectionChange,
}: ViewSortingSectionProps) {
	const { t } = useTranslation();

	return (
		<div className="border-t border-border pt-4 flex flex-col gap-4">
			<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
				{t("views.form.sortingSection")}
			</p>

			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.sortBy")}</Label>
				<div className="flex gap-2 flex-wrap">
					{(subject === "items" ? ITEM_SORT_FIELDS : SERIES_SORT_FIELDS).map(
						(field) => (
							<Toggle
								key={field}
								variant="outline"
								pressed={sortBy === field}
								onPressedChange={() => onSortByChange(field)}
							>
								{t(`views.form.sortByOption.${field}`)}
							</Toggle>
						),
					)}
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.sortDirection")}</Label>
				<div className="flex gap-2">
					{(["asc", "desc"] as SortDirection[]).map((direction) => (
						<Toggle
							key={direction}
							variant="outline"
							pressed={sortDirection === direction}
							onPressedChange={() => onSortDirectionChange(direction)}
						>
							{t(`views.form.sortDirectionOption.${direction}`)}
						</Toggle>
					))}
				</div>
			</div>
		</div>
	);
}
