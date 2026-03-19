import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import {
	getConsumptionLabel,
	InstanceRow,
} from "#/components/mediaItemDetails/history/components/instance/InstanceRow";
import type { MediaItemDetails } from "#/server/mediaItems/mediaItem";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

type Instance = MediaItemDetails["instances"][number];

const baseInstance: Instance = {
	id: 1,
	rating: 0,
	fictionRating: null,
	seasonReviews: null,
	consumptionInfo: null,
	reviewText: null,
	startedAt: null,
	completedAt: null,
};

function renderInstanceRow(instanceOverrides: Partial<Instance> = {}) {
	return render(
		<TooltipProvider>
			<InstanceRow
				index={1}
				instance={{ ...baseInstance, ...instanceOverrides }}
				onEdit={vi.fn()}
			/>
		</TooltipProvider>,
	);
}

const t = (key: string) => key;

afterEach(cleanup);

describe("getConsumptionLabel", () => {
	it("returns null when consumptionInfo is null", () => {
		expect(getConsumptionLabel(null, t)).toBeNull();
	});

	it("returns the translated method for method-based consumption", () => {
		expect(getConsumptionLabel({ method: "ebook" }, t)).toBe("consumption.method.ebook");
	});

	it("returns translated platform and translated control method joined with ·", () => {
		expect(
			getConsumptionLabel({ method: "ps5", controlMethod: "controller" }, t),
		).toBe("consumption.gamePlatform.ps5 · consumption.controlMethod.controller");
	});
});

describe("InstanceRow", () => {
	it("does not show season reviews when seasonReviews is null", () => {
		renderInstanceRow({ seasonReviews: null });
		expect(screen.queryByText("mediaItemDetails.seasonN")).not.toBeInTheDocument();
	});

	it("does not show season reviews when seasonReviews is empty", () => {
		renderInstanceRow({ seasonReviews: [] });
		expect(screen.queryByText("mediaItemDetails.seasonN")).not.toBeInTheDocument();
	});

	it("shows season reviews when seasonReviews has entries", () => {
		renderInstanceRow({
			seasonReviews: [
				{
					season: 1,
					startedAt: "",
					completedAt: "",
					rating: 0,
					reviewText: "",
				},
			],
		});
		expect(screen.getByText("mediaItemDetails.seasonN")).toBeInTheDocument();
	});
});
