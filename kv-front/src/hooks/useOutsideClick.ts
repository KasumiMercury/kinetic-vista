import { useEffect, type RefObject } from "react";

export function useOutsideClick<T extends HTMLElement>(
	ref: RefObject<T | null>,
	handler: () => void,
	enabled = true,
): void {
	useEffect(() => {
		if (!enabled) return;

		const listener = (event: PointerEvent) => {
			const element = ref.current;
			if (!element) return;

			const target = event.target;
			if (target instanceof Node && element.contains(target)) return;

			handler();
		};

		const listenerOptions: AddEventListenerOptions = { capture: true };
		document.addEventListener("pointerdown", listener, listenerOptions);

		return () => {
			document.removeEventListener("pointerdown", listener, listenerOptions);
		};
	}, [ref, handler, enabled]);
}
