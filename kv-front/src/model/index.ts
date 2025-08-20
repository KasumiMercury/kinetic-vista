import type { ComponentType, JSX } from "react";

type ModelComponentType = ComponentType<JSX.IntrinsicElements["group"]>;

const modules = import.meta.glob<{ default: ModelComponentType }>("./*.tsx", {
	eager: true,
	import: "default",
});
export const AllModels = Object.entries(modules).map(([path, component]) => ({
	path: path.replace("./", "").replace(".tsx", ""),
	component: component as unknown as ModelComponentType,
}));

export type ModelComponent = ModelComponentType;
