import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";

interface UnsavedChangesDialogProps {
	open: boolean;
	isSaving: boolean;
	onKeepEditing: () => void;
	onDiscard: () => void;
	onSaveAndContinue: () => void;
}

export function UnsavedChangesDialog(props: UnsavedChangesDialogProps) {
	const { open, isSaving, onKeepEditing, onDiscard, onSaveAndContinue } = props;
	const { t } = useTranslation();

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					onKeepEditing();
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("unsavedChanges.title")}</DialogTitle>
					<DialogDescription>
						{t("unsavedChanges.description")}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="pt-2">
					<Button variant="outline" size="sm" onClick={onKeepEditing}>
						{t("unsavedChanges.keepEditing")}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onDiscard}
						disabled={isSaving}
					>
						{t("unsavedChanges.discard")}
					</Button>
					<Button size="sm" onClick={onSaveAndContinue} disabled={isSaving}>
						{isSaving
							? t("common.saving")
							: t("unsavedChanges.saveAndContinue")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
