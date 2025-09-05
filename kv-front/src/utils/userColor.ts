// Utilities to generate and manipulate user colors

// Convert HSL to HEX string
function hslToHex(h: number, s: number, l: number): string {
	// h in [0,360), s,l in [0,1]
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hp = h / 60;
	const x = c * (1 - Math.abs((hp % 2) - 1));
	let r = 0,
		g = 0,
		b = 0;
	if (0 <= hp && hp < 1) [r, g, b] = [c, x, 0];
	else if (1 <= hp && hp < 2) [r, g, b] = [x, c, 0];
	else if (2 <= hp && hp < 3) [r, g, b] = [0, c, x];
	else if (3 <= hp && hp < 4) [r, g, b] = [0, x, c];
	else if (4 <= hp && hp < 5) [r, g, b] = [x, 0, c];
	else if (5 <= hp && hp < 6) [r, g, b] = [c, 0, x];
	const m = l - c / 2;
	const R = Math.round((r + m) * 255);
	const G = Math.round((g + m) * 255);
	const B = Math.round((b + m) * 255);
	const toHex = (n: number) => n.toString(16).padStart(2, "0");
	return `#${toHex(R)}${toHex(G)}${toHex(B)}`.toUpperCase();
}

// Generate a vibrant, non-dull hex color using HSL
export function generateVibrantHexColor(seed?: number): string {
	// Use golden ratio to distribute hues evenly
	const golden = 0.61803398875;
	let h = Math.random();
	if (typeof seed === "number") {
		// deterministic-ish mapping
		h = (seed * golden) % 1;
	}
	h = (h + golden) % 1; // scramble
	const hue = Math.round(h * 360);
	const saturation = 0.75; // 0.65 - 0.85 works well; pick fixed for vibrancy
	const lightness = 0.55; // mid lightness to avoid too dark/pale
	return hslToHex(hue, saturation, lightness);
}

export function hexToRgba(hex: string, alpha = 1): string {
	const m = hex.replace("#", "");
	const r = parseInt(m.substring(0, 2), 16);
	const g = parseInt(m.substring(2, 4), 16);
	const b = parseInt(m.substring(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lightenHex(hex: string, amount: number): string {
	// amount in [0,1]; simple linear lighten in RGB
	const m = hex.replace("#", "");
	let r = parseInt(m.substring(0, 2), 16);
	let g = parseInt(m.substring(2, 4), 16);
	let b = parseInt(m.substring(4, 6), 16);
	r = Math.min(255, Math.round(r + (255 - r) * amount));
	g = Math.min(255, Math.round(g + (255 - g) * amount));
	b = Math.min(255, Math.round(b + (255 - b) * amount));
	const toHex = (n: number) => n.toString(16).padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
