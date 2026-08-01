import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MetadataList } from "#/features/screens/mediaItemDetails/components/metadata/components/MetadataList";
import { MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: { year: number }) =>
			key === "time.yearBCE" ? `${options?.year} BCE` : key,
	}),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderMetadataList(releaseDate: string | null) {
	return render(
		<MetadataList
			type={MediaItemType.BOOK}
			metadata={null}
			releaseDate={releaseDate}
		/>,
	);
}

afterEach(cleanup);

describe("MetadataList", () => {
	it("shows a pre-0 CE release year with a BCE suffix", () => {
		renderMetadataList("1200-01-01 BC");

		expect(screen.getByText("1200 BCE")).toBeInTheDocument();
		expect(screen.queryByText("NaN")).not.toBeInTheDocument();
	});

	it("shows a CE release year as a bare year", () => {
		renderMetadataList("2020-01-01");

		expect(screen.getByText("2020")).toBeInTheDocument();
	});

	it("omits the release field when there is no release date", () => {
		renderMetadataList(null);

		expect(
			screen.queryByText("mediaItemDetails.releaseDate"),
		).not.toBeInTheDocument();
	});
});
