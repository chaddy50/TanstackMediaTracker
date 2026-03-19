import { ConsumptionEditor } from "#/components/mediaItemDetails/history/components/instance/ConsumptionEditor";
import { MediaItemType } from "#/server/enums";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

const noop = vi.fn();

afterEach(cleanup);

describe("ConsumptionEditor", () => {
	it("shows consumption-method-select for BOOK", () => {
		render(
			<ConsumptionEditor
				mediaItemType={MediaItemType.BOOK}
				value={null}
				onChange={noop}
			/>,
		);
		expect(screen.getByTestId("consumption-method-select")).toBeInTheDocument();
		expect(
			screen.queryByTestId("consumption-control-method-select"),
		).not.toBeInTheDocument();
	});

	it("shows consumption-method-select for MOVIE", () => {
		render(
			<ConsumptionEditor
				mediaItemType={MediaItemType.MOVIE}
				value={null}
				onChange={noop}
			/>,
		);
		expect(screen.getByTestId("consumption-method-select")).toBeInTheDocument();
		expect(
			screen.queryByTestId("consumption-control-method-select"),
		).not.toBeInTheDocument();
	});

	it("shows consumption-method-select for TV_SHOW", () => {
		render(
			<ConsumptionEditor
				mediaItemType={MediaItemType.TV_SHOW}
				value={null}
				onChange={noop}
			/>,
		);
		expect(screen.getByTestId("consumption-method-select")).toBeInTheDocument();
		expect(
			screen.queryByTestId("consumption-control-method-select"),
		).not.toBeInTheDocument();
	});

	it("shows platform and control method selects for VIDEO_GAME", () => {
		render(
			<ConsumptionEditor
				mediaItemType={MediaItemType.VIDEO_GAME}
				value={null}
				onChange={noop}
			/>,
		);
		expect(
			screen.queryByTestId("consumption-method-select"),
		).toBeInTheDocument();
		expect(
			screen.getByTestId("consumption-control-method-select"),
		).toBeInTheDocument();
	});

	it("renders nothing for PODCAST", () => {
		const { container } = render(
			<ConsumptionEditor
				mediaItemType={MediaItemType.PODCAST}
				value={null}
				onChange={noop}
			/>,
		);
		expect(container.firstChild).toBeNull();
		expect(
			screen.queryByTestId("consumption-method-select"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("consumption-control-method-select"),
		).not.toBeInTheDocument();
	});

	describe("defaults", () => {
		it("BOOK defaults to ebook", () => {
			render(
				<ConsumptionEditor
					mediaItemType={MediaItemType.BOOK}
					value={null}
					onChange={noop}
				/>,
			);
			const trigger = screen.getByTestId("consumption-method-select");
			expect(
				within(trigger).getByText("consumption.method.ebook"),
			).toBeInTheDocument();
		});

		it("MOVIE defaults to local copy", () => {
			render(
				<ConsumptionEditor
					mediaItemType={MediaItemType.MOVIE}
					value={null}
					onChange={noop}
				/>,
			);
			const trigger = screen.getByTestId("consumption-method-select");
			expect(
				within(trigger).getByText("consumption.method.local_copy"),
			).toBeInTheDocument();
		});

		it("TV_SHOW defaults to local copy", () => {
			render(
				<ConsumptionEditor
					mediaItemType={MediaItemType.TV_SHOW}
					value={null}
					onChange={noop}
				/>,
			);
			const trigger = screen.getByTestId("consumption-method-select");
			expect(
				within(trigger).getByText("consumption.method.local_copy"),
			).toBeInTheDocument();
		});

		it("VIDEO_GAME defaults to PC platform and controller", () => {
			render(
				<ConsumptionEditor
					mediaItemType={MediaItemType.VIDEO_GAME}
					value={null}
					onChange={noop}
				/>,
			);
			const platformTrigger = screen.getByTestId("consumption-method-select");
			expect(
				within(platformTrigger).getByText("consumption.gamePlatform.pc"),
			).toBeInTheDocument();

			const controlMethodTrigger = screen.getByTestId(
				"consumption-control-method-select",
			);
			expect(
				within(controlMethodTrigger).getByText(
					"consumption.controlMethod.controller",
				),
			).toBeInTheDocument();
		});
	});
});
