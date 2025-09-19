import { useEffect, useState } from "react";

const FALLBACK_MATCH = false;

export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
			return FALLBACK_MATCH;
		}

		return window.matchMedia(query).matches;
	});

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
			return;
		}

		const mediaQueryList = window.matchMedia(query);
		const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

		setMatches(mediaQueryList.matches);
		mediaQueryList.addEventListener("change", handleChange);

		return () => {
			mediaQueryList.removeEventListener("change", handleChange);
		};
	}, [query]);

	return matches;
}
