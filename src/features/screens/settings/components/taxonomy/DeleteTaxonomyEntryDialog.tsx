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

interface DeleteTaxonomyEntryDialogProps {
	isOpen: boolean;
	/** i18n group holding the entity's own strings, e.g. "settings.genres". */
	i18nPrefix: string;
	entryName: string;
	itemCount: number;
	isDeleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DeleteTaxonomyEntryDialog(
	props: DeleteTaxonomyEntryDialogProps,
) {
	const {
		isOpen,
		i18nPrefix,
		entryName,
		itemCount,
		isDeleting,
		onCancel,
		onConfirm,
	} = props;
	const { t } = useTranslation();

	const isEntryInUse = itemCount > 0;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isDialogOpen) => {
				if (!isDialogOpen) {
					onCancel();
				}
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("settings.taxonomy.deleteTitle")}</DialogTitle>
					<DialogDescription>
						{isEntryInUse
							? t(`${i18nPrefix}.deleteInUseDescription` as never, {
									name: entryName,
									count: itemCount,
								})
							: t(`${i18nPrefix}.deleteDescription` as never, {
									name: entryName,
								})}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="pt-2">
					<Button variant="outline" onClick={onCancel} disabled={isDeleting}>
						{t("settings.taxonomy.cancel")}
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={isDeleting}
					>
						{isDeleting
							? t("settings.taxonomy.deleting")
							: t("settings.taxonomy.confirmDelete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
