import { Building } from './Building';

export { Building };

export const AllModels = [
  Building,
] as const;

export type ModelComponent = typeof AllModels[number];