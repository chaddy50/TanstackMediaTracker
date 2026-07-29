import { useBlocker } from "@tanstack/react-router";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "#/components/hooks/useUnsavedChangesGuard";

vi.mock("@tanstack/react-router", () => ({
	useBlocker: vi.fn(),
}));

interface CapturedBlockerOptions {
	shouldBlockFn: (args?: unknown) => boolean;
	enableBeforeUnload: () => boolean;
	withResolver: boolean;
}

interface TestResolver {
	status: "idle" | "blocked";
	proceed?: () => void;
	reset?: () => void;
}

const idleResolver: TestResolver = { status: "idle" };

function blockedResolver(): TestResolver {
	return { status: "blocked", proceed: vi.fn(), reset: vi.fn() };
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

const mockedUseBlocker = useBlocker as unknown as ReturnType<typeof vi.fn>;

let capturedOptions: CapturedBlockerOptions;
let resolver: TestResolver;
let hasUnsavedChanges: ReturnType<typeof vi.fn>;
let isEnabled: ReturnType<typeof vi.fn>;
let save: ReturnType<typeof vi.fn>;

/** Renders the guard with the current doubles; pass `withoutGuardToggle` to omit the option. */
function renderGuard(options: { withoutGuardToggle?: boolean } = {}) {
	return renderHook(() =>
		useUnsavedChangesGuard({
			hasUnsavedChanges: () => hasUnsavedChanges(),
			save: () => save(),
			isEnabled: options.withoutGuardToggle ? undefined : () => isEnabled(),
		}),
	);
}

afterEach(cleanup);
beforeEach(() => {
	vi.clearAllMocks();
	resolver = idleResolver;
	hasUnsavedChanges = vi.fn().mockReturnValue(false);
	isEnabled = vi.fn().mockReturnValue(true);
	save = vi.fn().mockResolvedValue(true);
	mockedUseBlocker.mockImplementation((options: CapturedBlockerOptions) => {
		capturedOptions = options;
		return resolver;
	});
});

describe("useUnsavedChangesGuard", () => {
	it("blocks navigation only while the editor is dirty", () => {
		renderGuard();

		hasUnsavedChanges.mockReturnValue(true);
		expect(capturedOptions.shouldBlockFn({})).toBe(true);

		hasUnsavedChanges.mockReturnValue(false);
		expect(capturedOptions.shouldBlockFn({})).toBe(false);
	});

	it("asks the router for a resolver", () => {
		renderGuard();

		expect(capturedOptions.withResolver).toBe(true);
	});

	it("gates the browser unload prompt on dirtiness with a lazily evaluated function", () => {
		renderGuard();

		expect(typeof capturedOptions.enableBeforeUnload).toBe("function");

		hasUnsavedChanges.mockReturnValue(true);
		expect(capturedOptions.enableBeforeUnload()).toBe(true);

		hasUnsavedChanges.mockReturnValue(false);
		expect(capturedOptions.enableBeforeUnload()).toBe(false);
	});

	it("is not prompting when the resolver is idle and nothing is pending", () => {
		const { result } = renderGuard();

		expect(result.current.isPrompting).toBe(false);
	});

	it("is prompting when the router has blocked a navigation", () => {
		resolver = blockedResolver();
		const { result } = renderGuard();

		expect(result.current.isPrompting).toBe(true);
	});

	it("starts editing immediately when the editor is clean", () => {
		const { result } = renderGuard();
		const action = vi.fn();

		act(() => result.current.startEditing(action));

		expect(action).toHaveBeenCalledTimes(1);
		expect(result.current.isPrompting).toBe(false);
	});

	it("defers editing behind the prompt when the editor is dirty", () => {
		hasUnsavedChanges.mockReturnValue(true);
		const { result } = renderGuard();
		const action = vi.fn();

		act(() => result.current.startEditing(action));

		expect(action).not.toHaveBeenCalled();
		expect(result.current.isPrompting).toBe(true);
	});

	it("drops a pending action when the user keeps editing", () => {
		hasUnsavedChanges.mockReturnValue(true);
		const { result } = renderGuard();
		const action = vi.fn();

		act(() => result.current.startEditing(action));
		act(() => result.current.keepEditing());

		expect(action).not.toHaveBeenCalled();
		expect(result.current.isPrompting).toBe(false);
	});

	it("resets a blocked navigation when the user keeps editing", () => {
		resolver = blockedResolver();
		hasUnsavedChanges.mockReturnValue(true);
		const { result } = renderGuard();

		act(() => result.current.keepEditing());

		expect(resolver.reset).toHaveBeenCalledTimes(1);
		expect(resolver.proceed).not.toHaveBeenCalled();
	});

	it("runs the pending action when the user discards", () => {
		hasUnsavedChanges.mockReturnValue(true);
		const { result } = renderGuard();
		const action = vi.fn();

		act(() => result.current.startEditing(action));
		act(() => result.current.discard());

		expect(action).toHaveBeenCalledTimes(1);
		expect(result.current.isPrompting).toBe(false);
	});

	it("proceeds with a blocked navigation when the user discards", () => {
		resolver = blockedResolver();
		hasUnsavedChanges.mockReturnValue(true);
		const { result } = renderGuard();

		act(() => result.current.discard());

		expect(resolver.proceed).toHaveBeenCalledTimes(1);
		expect(resolver.reset).not.toHaveBeenCalled();
	});

	it("saves before running the pending action", async () => {
		hasUnsavedChanges.mockReturnValue(true);
		const { result } = renderGuard();
		const action = vi.fn();

		act(() => result.current.startEditing(action));
		await act(() => result.current.saveAndContinue());

		expect(save).toHaveBeenCalledTimes(1);
		expect(action).toHaveBeenCalledTimes(1);
		expect(result.current.isPrompting).toBe(false);
		expect(result.current.isSaving).toBe(false);
	});

	it("saves before proceeding with a blocked navigation", async () => {
		resolver = blockedResolver();
		hasUnsavedChanges.mockReturnValue(true);
		const { result } = renderGuard();

		await act(() => result.current.saveAndContinue());

		expect(save).toHaveBeenCalledTimes(1);
		expect(resolver.proceed).toHaveBeenCalledTimes(1);
	});

	it("abandons the pending action when the save fails validation", async () => {
		hasUnsavedChanges.mockReturnValue(true);
		save.mockResolvedValue(false);
		const { result } = renderGuard();
		const action = vi.fn();

		act(() => result.current.startEditing(action));
		await act(() => result.current.saveAndContinue());

		// The prompt closes so the user can see the validation error it refused on.
		expect(action).not.toHaveBeenCalled();
		expect(result.current.isPrompting).toBe(false);
		expect(result.current.isSaving).toBe(false);
	});

	it("cancels the blocked navigation when the save fails validation", async () => {
		resolver = blockedResolver();
		hasUnsavedChanges.mockReturnValue(true);
		save.mockResolvedValue(false);
		const { result } = renderGuard();

		await act(() => result.current.saveAndContinue());

		expect(resolver.proceed).not.toHaveBeenCalled();
		expect(resolver.reset).toHaveBeenCalledTimes(1);
		expect(result.current.isSaving).toBe(false);
	});

	it("reports saving while the save is in flight", async () => {
		resolver = blockedResolver();
		hasUnsavedChanges.mockReturnValue(true);
		const pendingSave = deferred<boolean>();
		save.mockReturnValue(pendingSave.promise);
		const { result } = renderGuard();

		let saveAndContinue: Promise<void> | undefined;
		act(() => {
			saveAndContinue = result.current.saveAndContinue();
		});
		expect(result.current.isSaving).toBe(true);

		await act(async () => {
			pendingSave.resolve(true);
			await saveAndContinue;
		});
		expect(result.current.isSaving).toBe(false);
	});

	it("stops reporting saving when the save rejects", async () => {
		resolver = blockedResolver();
		hasUnsavedChanges.mockReturnValue(true);
		save.mockRejectedValue(new Error("network down"));
		const { result } = renderGuard();

		await act(() => result.current.saveAndContinue());

		expect(result.current.isSaving).toBe(false);
		expect(resolver.proceed).not.toHaveBeenCalled();
		expect(resolver.reset).toHaveBeenCalledTimes(1);
	});

	it("does not block while the guard is disabled, even with a dirty editor", () => {
		hasUnsavedChanges.mockReturnValue(true);
		isEnabled.mockReturnValue(false);
		renderGuard();

		expect(capturedOptions.shouldBlockFn({})).toBe(false);
		expect(capturedOptions.enableBeforeUnload()).toBe(false);
	});

	it("starts editing immediately while disabled", () => {
		hasUnsavedChanges.mockReturnValue(true);
		isEnabled.mockReturnValue(false);
		const { result } = renderGuard();
		const action = vi.fn();

		act(() => result.current.startEditing(action));

		expect(action).toHaveBeenCalledTimes(1);
		expect(result.current.isPrompting).toBe(false);
	});

	it("re-arms as soon as the guard is enabled again", () => {
		hasUnsavedChanges.mockReturnValue(true);
		isEnabled.mockReturnValueOnce(false).mockReturnValue(true);
		renderGuard();

		expect(capturedOptions.shouldBlockFn({})).toBe(false);
		expect(capturedOptions.shouldBlockFn({})).toBe(true);
	});

	it("blocks normally when no enabled predicate is supplied", () => {
		hasUnsavedChanges.mockReturnValue(true);
		renderGuard({ withoutGuardToggle: true });

		expect(capturedOptions.shouldBlockFn({})).toBe(true);
	});
});
