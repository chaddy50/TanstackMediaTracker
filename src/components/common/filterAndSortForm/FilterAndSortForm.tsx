import type { FilterAndSortOptions, ViewSubject } from "#/db/schema";
import { useState } from "react";
import { FilterAndSortActions } from "./components/FilterAndSortActions";
import { Filters } from "./components/Filters";
import { SortingOptions } from "./components/SortingOptions";
import { useFilterAndSortFormState } from "./useFilterAndSortFormState";

interface FilterAndSortFormProps {
	subject?: ViewSubject;
	initialFilters?: FilterAndSortOptions;
	onSubmit: (filters: FilterAndSortOptions) => Promise<void>;
	onCancel: () => void;
	submitLabel?: string;
}

export function FilterAndSortForm({
	subject = "items",
	initialFilters = {},
	onSubmit,
	onCancel,
	submitLabel,
}: FilterAndSortFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { filtersProps, sortingProps, buildFilters } =
		useFilterAndSortFormState(subject, initialFilters);

	async function handleSubmit() {
		setIsSubmitting(true);
		try {
			await onSubmit(buildFilters());
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<Filters {...filtersProps} />
			<SortingOptions {...sortingProps} />
			<FilterAndSortActions
				onSubmit={handleSubmit}
				onCancel={onCancel}
				submitLabel={submitLabel}
				isSubmitting={isSubmitting}
				isSubmitDisabled={false}
			/>
		</div>
	);
}
