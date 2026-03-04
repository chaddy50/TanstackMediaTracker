import { useTranslation } from "react-i18next";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { ViewFilters, ViewSubject } from "#/db/schema";
import { EditViewForm } from "./components/editViewForm/EditViewForm";

interface LibraryFilterDialogProps {
	isOpen: boolean;
	onClose: () => void;
	initialFilters: ViewFilters;
	onApply: (filters: ViewFilters) => void;
	subject?: ViewSubject;
	title?: string;
}

export function LibraryFilterDialog({
	isOpen,
	onClose,
	initialFilters,
	onApply,
	subject = "items",
	title,
}: LibraryFilterDialogProps) {
	const { t } = useTranslation();

	function handleSubmit(data: { filters: ViewFilters }) {
		onApply(data.filters);
		onClose();
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{title ?? t("library.filterAndSort")}</DialogTitle>
				</DialogHeader>
				<EditViewForm
					initialSubject={subject}
					initialFilters={initialFilters}
					shouldShowName={false}
					shouldShowSubject={false}
					submitLabel={t("library.applyFilters")}
					onSubmit={handleSubmit}
					onCancel={onClose}
				/>
			</DialogContent>
		</Dialog>
	);
}
