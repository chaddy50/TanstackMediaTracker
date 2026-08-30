/**
 * Test helper for infinite scrolling. jsdom implements no IntersectionObserver at all, so
 * any hook that constructs one throws on mount — which is why the screen suites mock
 * `useInfiniteScroll` out wholesale. This stub records each live observer so a test can
 * drive the sentinel by hand.
 */

interface IntersectionObserverStub {
	/** Fires an intersection on every observer that is watching an element. */
	trigger: (isIntersecting?: boolean) => void;
	restore: () => void;
}

// Pinned to the members the double actually provides rather than to the whole
// `IntersectionObserver` interface, which grows with lib.dom — `scrollMargin`
// arriving there is otherwise enough to break this file on a TypeScript bump.
type StubbedMembers = Pick<
	IntersectionObserver,
	"root" | "rootMargin" | "thresholds" | "observe" | "unobserve" | "disconnect"
>;

export function stubIntersectionObserver(): IntersectionObserverStub {
	// Keyed by observer instance rather than by callback: two observers can be built
	// from the same function, and disconnecting one must not silence the other.
	const liveObservers = new Map<
		StubbedIntersectionObserver,
		IntersectionObserverCallback
	>();
	const realIntersectionObserver = globalThis.IntersectionObserver;
	const hadRealIntersectionObserver = "IntersectionObserver" in globalThis;

	class StubbedIntersectionObserver implements StubbedMembers {
		readonly root: Document | Element | null;
		readonly rootMargin: string;
		readonly thresholds: readonly number[];
		private readonly observedElements = new Set<Element>();

		constructor(
			callback: IntersectionObserverCallback,
			options: IntersectionObserverInit = {},
		) {
			this.root = options.root ?? null;
			this.rootMargin = options.rootMargin ?? "0px";
			this.thresholds = Array.isArray(options.threshold)
				? options.threshold
				: [options.threshold ?? 0];
			liveObservers.set(this, callback);
		}

		observe(target: Element) {
			this.observedElements.add(target);
		}

		unobserve(target: Element) {
			this.observedElements.delete(target);
		}

		disconnect() {
			// The hook disconnects on unmount, and a remount test would otherwise keep
			// firing the unmounted component's callback alongside the new one's.
			this.observedElements.clear();
			liveObservers.delete(this);
		}

		get isWatchingAnything() {
			return this.observedElements.size > 0;
		}
	}

	globalThis.IntersectionObserver =
		StubbedIntersectionObserver as unknown as typeof IntersectionObserver;

	return {
		trigger(isIntersecting = true) {
			for (const [observer, callback] of [...liveObservers]) {
				// A real observer reports nothing until something is observed, and the
				// hook bails out early when its sentinel ref is empty.
				if (!observer.isWatchingAnything) {
					continue;
				}
				callback(
					[{ isIntersecting } as IntersectionObserverEntry],
					observer as unknown as IntersectionObserver,
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
