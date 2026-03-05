import { useTranslation } from "react-i18next";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { FilterAndSortOptions, ViewSubject } from "#/db/schema";
import { FilterAndSortForm } from "../common/filterAndSortForm/FilterAndSortForm";

interface LibraryFilterAndSortDialogProps {
	isOpen: boolean;
	onClose: () => void;
	initialFilters: FilterAndSortOptions;
	onApply: (filters: FilterAndSortOptions) => void;
	subject?: ViewSubject;
	title?: string;
}

export function LibraryFilterAndSortDialog({
	isOpen,
	onClose,
	initialFilters,
	onApply,
	subject = "items",
	title,
}: LibraryFilterAndSortDialogProps) {
	const { t } = useTranslation();

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
				<FilterAndSortForm
					subject={subject}
					initialFilters={initialFilters}
					submitLabel={t("library.applyFilters")}
					onSubmit={async (filters) => {
						onApply(filters);
						onClose();
					}}
					onCancel={onClose}
				/>
			</DialogContent>
		</Dialog>
	);
}
