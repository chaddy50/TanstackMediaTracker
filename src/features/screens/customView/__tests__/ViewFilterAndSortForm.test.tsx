import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ViewFilterAndSortForm } from "../ViewFilterAndSortForm";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({ data: [] }),
}));

vi.mock("#/lib/tags", () => ({ getTags: vi.fn() }));
vi.mock("#/lib/genres/genres", () => ({ getGenres: vi.fn() }));

let capturedSortingOptionsProps: Record<string, unknown> | null = null;
vi.mock("#/features/filterAndSort/components/SortingOptions", () => ({
	SortingOptions: (props: Record<string, unknown>) => {
		capturedSortingOptionsProps = props;
		return <div data-testid="sorting-options" />;
	},
}));

vi.mock("#/features/filterAndSort/components/Filters", () => ({
	Filters: () => <div />,
}));
vi.mock("#/features/filterAndSort/components/FilterAndSortActions", () => ({
	FilterAndSortActions: () => <div />,
}));
vi.mock("#/features/filterAndSort/components/ViewName", () => ({
	ViewName: () => <div />,
}));
vi.mock("#/features/filterAndSort/components/ViewSubject", () => ({
	ViewSubjectChooser: () => <div />,
}));

afterEach(() => {
	capturedSortingOptionsProps = null;
	cleanup();
});

describe("ViewFilterAndSortForm", () => {
	it("lets its sorting options offer custom order", () => {
		render(<ViewFilterAndSortForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

		expect(capturedSortingOptionsProps?.shouldAllowCustomOrder).toBe(true);
	});
});
