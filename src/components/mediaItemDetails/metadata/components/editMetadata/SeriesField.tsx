import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { getSeriesListByType } from "#/server/series";
import type { MediaItemType } from "#/lib/enums";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "./FormField";

const CREATE_NEW_VALUE = "__create_new__";
const NO_SERIES_VALUE = "__none__";
const PENDING_NEW_VALUE = "__pending_new__";

export type SeriesFieldValue =
	| { mode: "existing"; seriesId: number }
	| { mode: "new"; name: string }
	| { mode: "none" };

interface SeriesFieldProps {
	type: MediaItemType;
	initialSeriesId: number | null;
	onChange: (value: SeriesFieldValue) => void;
}

export function SeriesField({
	type,
	initialSeriesId,
	onChange,
}: SeriesFieldProps) {
	const { t } = useTranslation();
	const [seriesList, setSeriesList] = useState<{ id: number; name: string }[]>(
		[],
	);
	const [selectValue, setSelectValue] = useState<string>(
		initialSeriesId !== null ? String(initialSeriesId) : NO_SERIES_VALUE,
	);
	const [pendingNewSeries, setPendingNewSeries] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [dialogInputValue, setDialogInputValue] = useState("");

	useEffect(() => {
		getSeriesListByType({ data: { type } }).then(setSeriesList);
	}, [type]);

	function handleSelectChange(value: string) {
		if (value === CREATE_NEW_VALUE) {
			setDialogInputValue(pendingNewSeries);
			setIsDialogOpen(true);
		} else {
			setSelectValue(value);
			setPendingNewSeries("");
			if (value === NO_SERIES_VALUE) {
				onChange({ mode: "none" });
			} else {
				onChange({ mode: "existing", seriesId: parseInt(value, 10) });
			}
		}
	}

	function handleDialogConfirm() {
		const name = dialogInputValue.trim();
		setPendingNewSeries(name);
		setSelectValue(PENDING_NEW_VALUE);
		onChange({ mode: "new", name });
		setIsDialogOpen(false);
	}

	return (
		<>
			<FormField label={t("metadata.series")}>
				<Select value={selectValue} onValueChange={handleSelectChange}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={NO_SERIES_VALUE}>
							{t("metadata.noSeries")}
						</SelectItem>
						{seriesList.map((s) => (
							<SelectItem key={s.id} value={String(s.id)}>
								{s.name}
							</SelectItem>
						))}
						{pendingNewSeries && (
							<SelectItem value={PENDING_NEW_VALUE}>
								{pendingNewSeries}
							</SelectItem>
						)}
						<SelectItem value={CREATE_NEW_VALUE}>
							{t("metadata.createNewSeries")}
						</SelectItem>
					</SelectContent>
				</Select>
			</FormField>

			<Dialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsDialogOpen(false);
					}
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>{t("metadata.createNewSeries")}</DialogTitle>
					</DialogHeader>
					<Input
						autoFocus
						value={dialogInputValue}
						onChange={(e) => setDialogInputValue(e.target.value)}
						placeholder={t("metadata.newSeriesName")}
						onKeyDown={(e) => {
							if (e.key === "Enter" && dialogInputValue.trim() !== "") {
								handleDialogConfirm();
							}
						}}
					/>
					<div className="flex gap-2 pt-2">
						<Button
							size="sm"
							onClick={handleDialogConfirm}
							disabled={dialogInputValue.trim() === ""}
						>
							{t("mediaItemDetails.save")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsDialogOpen(false)}
						>
							{t("mediaItemDetails.cancel")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
