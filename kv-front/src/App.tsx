import { useCallback, useEffect, useMemo, useState } from "react";
import SimpleNavigationApp from "./SimpleNavigationApp";

type ThreeNavigationAppComponent = typeof import("./ThreeNavigationApp").default;

const fallbackContent = (
	<div className="flex h-screen w-screen items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white">
		<div className="rounded-xl bg-black/70 px-6 py-4 text-sm text-white/80 shadow-xl">
			3Dナビゲーションを読み込んでいます...
		</div>
	</div>
);

type ViewState = "selection" | "simple" | "three";

function App() {
	const [view, setView] = useState<ViewState>("selection");
	const [ThreeNavComponent, setThreeNavComponent] =
		useState<ThreeNavigationAppComponent | null>(null);
	const [isLoadingThreeNav, setIsLoadingThreeNav] = useState(false);

	const loadThreeNavigation = useCallback(async () => {
		if (ThreeNavComponent || isLoadingThreeNav) return;
		setIsLoadingThreeNav(true);
		try {
			const module = await import("./ThreeNavigationApp");
			setThreeNavComponent(() => module.default);
		} catch (error) {
			console.error("Failed to load ThreeNavigationApp:", error);
		} finally {
			setIsLoadingThreeNav(false);
		}
	}, [ThreeNavComponent, isLoadingThreeNav]);

	useEffect(() => {
		if (view === "three") void loadThreeNavigation();
	}, [view, loadThreeNavigation]);

	const content = useMemo(() => {
		switch (view) {
			case "simple":
				return <SimpleNavigationApp onBack={() => setView("selection")} />;
			case "three":
				if (!ThreeNavComponent) return fallbackContent;
				return (
					<ThreeNavComponent onBack={() => setView("selection")} />
				);
			default:
				return (
					<div className="flex h-screen w-screen items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white">
						<div className="flex w-[min(90vw,480px)] flex-col gap-6 rounded-2xl bg-black/70 p-8 text-center shadow-2xl">
							<div className="space-y-2">
								<h1 className="text-2xl font-semibold">ナビゲーションモードを選択</h1>
								<p className="text-sm text-white/70">
									軽量な簡易ナビゲーション、または3D表示による詳細ナビゲーションを選択できます。
								</p>
							</div>
							<div className="space-y-3">
								<button
									type="button"
									onClick={() => setView("simple")}
									className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-base font-medium text-white transition-colors hover:border-white/40 hover:bg-white/20"
								>
									簡易ナビゲーション
									<span className="mt-1 block text-xs font-normal text-white/60">ランドマーク一覧で方角を確認（準備中）</span>
								</button>
								<button
									type="button"
									onClick={() => {
									setView("three");
									void loadThreeNavigation();
								}}
									onMouseEnter={() => void loadThreeNavigation()}
									onFocus={() => void loadThreeNavigation()}
									className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-blue-500"
								>
									3Dナビゲーション
									<span className="mt-1 block text-xs font-normal text-blue-100/70">three.jsを読み込んで3Dシーンを表示</span>
								</button>
							</div>
						</div>
					</div>
				);
		}
	}, [ThreeNavComponent, loadThreeNavigation, view]);

	return content;
}

export default App;
