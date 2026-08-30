/**
 * Test helper for infinite scrolling. jsdom implements no IntersectionObserver at all, so
 * any hook that constructs one throws on mount — which is why the screen suites mock
 * `useInfiniteScroll` out wholesale. This stub records each live observer so a test can
 * drive the sentinel by hand.
 */

interface IntersectionObserverStub {
	/** Fires an intersection on every observer that is still connected. */
	trigger: (isIntersecting?: boolean) => void;
	restore: () => void;
}

export function stubIntersectionObserver(): IntersectionObserverStub {
	// Keyed by observer instance rather than by callback: two observers can be built
	// from the same function, and disconnecting one must not silence the other.
	const callbacksByObserver = new Map<object, IntersectionObserverCallback>();
	const realIntersectionObserver = globalThis.IntersectionObserver;
	const hadRealIntersectionObserver = "IntersectionObserver" in globalThis;

	// Pinned to the members the double actually provides rather than to the whole
	// `IntersectionObserver` interface, which grows with lib.dom — `scrollMargin`
	// arriving there is otherwise enough to break this file on a TypeScript bump.
	class StubbedIntersectionObserver
		implements
			Pick<
				IntersectionObserver,
				| "root"
				| "rootMargin"
				| "thresholds"
				| "observe"
				| "unobserve"
				| "takeRecords"
				| "disconnect"
			>
	{
		readonly root: Document | Element | null;
		readonly rootMargin: string;
		readonly thresholds: readonly number[];

		constructor(
			callback: IntersectionObserverCallback,
			options: IntersectionObserverInit = {},
		) {
			this.root = options.root ?? null;
			this.rootMargin = options.rootMargin ?? "0px";
			this.thresholds = Array.isArray(options.threshold)
				? options.threshold
				: [options.threshold ?? 0];
			callbacksByObserver.set(this, callback);
		}

		observe() {}
		unobserve() {}
		takeRecords(): IntersectionObserverEntry[] {
			return [];
		}

		disconnect() {
			// The hook disconnects on unmount, and a remount test would otherwise keep
			// firing the unmounted component's callback alongside the new one's.
			callbacksByObserver.delete(this);
		}
	}

	globalThis.IntersectionObserver =
		StubbedIntersectionObserver as unknown as typeof IntersectionObserver;

	return {
		trigger(isIntersecting = true) {
			for (const [observer, callback] of [...callbacksByObserver]) {
				callback(
					[{ isIntersecting } as IntersectionObserverEntry],
					observer as IntersectionObserver,
				);
			}
		},
		restore() {
			// Assigning the captured value back would leave the property present but
			// undefined, so code guarding on `"IntersectionObserver" in globalThis`
			// would see a constructor that is not there.
			if (!hadRealIntersectionObserver) {
				Reflect.deleteProperty(globalThis, "IntersectionObserver");
				return;
			}
			globalThis.IntersectionObserver = realIntersectionObserver;
		},
	};
}
