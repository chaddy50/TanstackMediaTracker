import { useQuery } from "@tanstack/react-query";
import type { FilterAndSortOptions, ViewSubject } from "#/db/schema";
import { getGenres } from "#/server/genres";
import { getTags } from "#/server/tags";
import { useState } from "react";
import { FilterAndSortActions } from "../common/filterAndSortForm/components/FilterAndSortActions";
import { Filters } from "../common/filterAndSortForm/components/Filters";
import { SortingOptions } from "../common/filterAndSortForm/components/SortingOptions";
import { ViewName } from "../common/filterAndSortForm/components/ViewName";
import { ViewSubjectChooser } from "../common/filterAndSortForm/components/ViewSubject";
import { useFilterAndSortFormState } from "../common/filterAndSortForm/useFilterAndSortFormState";

interface ViewFilterAndSortFormProps {
	initialName?: string;
	initialSubject?: ViewSubject;
	initialFilters?: FilterAndSortOptions;
	onSubmit: (data: {
		name: string;
		subject: ViewSubject;
		filters: FilterAndSortOptions;
	}) => Promise<void>;
	onCancel: () => void;
	onDelete?: () => Promise<void>;
}

export function ViewFilterAndSortForm({
	initialName = "",
	initialSubject = "items",
	initialFilters = {},
	onSubmit,
	onCancel,
	onDelete,
}: ViewFilterAndSortFormProps) {
	const [name, setName] = useState(initialName);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const { data: tagsList = [] } = useQuery({
		queryKey: ["tags"],
		queryFn: () => getTags(),
	});
	const { data: genresList = [] } = useQuery({
		queryKey: ["genres"],
		queryFn: () => getGenres(),
	});
	const availableTags = tagsList.map((tag) => tag.name);
	const availableGenres = genresList.map((genre) => genre.name);
	const {
		subject,
		onSubjectChanged,
		filtersProps,
		sortingProps,
		buildFilters,
	} = useFilterAndSortFormState(initialSubject, initialFilters, availableTags, availableGenres);

	async function handleSubmit() {
		setIsSubmitting(true);
		try {
			await onSubmit({ name, subject, filters: buildFilters() });
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!onDelete) return;
		setIsDeleting(true);
		try {
			await onDelete();
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<ViewName name={name} setName={setName} />
			<ViewSubjectChooser
				subject={subject}
				onSubjectChanged={onSubjectChanged}
			/>
			<Filters {...filtersProps} />
			<SortingOptions {...sortingProps} />
			<FilterAndSortActions
				onSubmit={handleSubmit}
				onCancel={onCancel}
				isSubmitting={isSubmitting}
				isSubmitDisabled={name.trim().length === 0}
				onDelete={onDelete ? handleDelete : undefined}
				isDeleting={isDeleting}
			/>
		</div>
	);
}
