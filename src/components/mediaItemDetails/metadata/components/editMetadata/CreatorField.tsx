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
import { getCreatorListForUser } from "#/server/creators";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "./FormField";

const CREATE_NEW_VALUE = "__create_new__";
const NO_CREATOR_VALUE = "__none__";
const PENDING_NEW_VALUE = "__pending_new__";

export type CreatorFieldValue =
	| { mode: "existing"; creatorId: number }
	| { mode: "new"; name: string }
	| { mode: "none" };

interface CreatorFieldProps {
	label: string;
	initialCreatorId: number | null;
	onChange: (value: CreatorFieldValue) => void;
}

export function CreatorField({
	label,
	initialCreatorId,
	onChange,
}: CreatorFieldProps) {
	const { t } = useTranslation();
	const [creatorList, setCreatorList] = useState<{ id: number; name: string }[]>(
		[],
	);
	const [selectValue, setSelectValue] = useState<string>(
		initialCreatorId !== null ? String(initialCreatorId) : NO_CREATOR_VALUE,
	);
	const [pendingNewCreator, setPendingNewCreator] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [dialogInputValue, setDialogInputValue] = useState("");

	useEffect(() => {
		getCreatorListForUser().then(setCreatorList);
	}, []);

	function handleSelectChange(value: string) {
		if (value === CREATE_NEW_VALUE) {
			setDialogInputValue(pendingNewCreator);
			setIsDialogOpen(true);
		} else {
			setSelectValue(value);
			setPendingNewCreator("");
			if (value === NO_CREATOR_VALUE) {
				onChange({ mode: "none" });
			} else {
				onChange({ mode: "existing", creatorId: parseInt(value, 10) });
			}
		}
	}

	function handleDialogConfirm() {
		const name = dialogInputValue.trim();
		setPendingNewCreator(name);
		setSelectValue(PENDING_NEW_VALUE);
		onChange({ mode: "new", name });
		setIsDialogOpen(false);
	}

	return (
		<>
			<FormField label={label}>
				<Select value={selectValue} onValueChange={handleSelectChange}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={NO_CREATOR_VALUE}>
							{t("metadata.noCreator")}
						</SelectItem>
						{creatorList.map((creator) => (
							<SelectItem key={creator.id} value={String(creator.id)}>
								{creator.name}
							</SelectItem>
						))}
						{pendingNewCreator && (
							<SelectItem value={PENDING_NEW_VALUE}>
								{pendingNewCreator}
							</SelectItem>
						)}
						<SelectItem value={CREATE_NEW_VALUE}>
							{t("metadata.createNewCreator")}
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
						<DialogTitle>{t("metadata.createNewCreator")}</DialogTitle>
					</DialogHeader>
					<Input
						autoFocus
						value={dialogInputValue}
						onChange={(e) => setDialogInputValue(e.target.value)}
						placeholder={t("metadata.newCreatorName")}
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
