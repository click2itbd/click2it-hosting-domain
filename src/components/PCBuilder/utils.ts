import { Product } from '../../types';
import { CompatibilityEngine, CompatibilityReport } from './CompatibilityEngine';

export const getCompatibility = (categoryId: string, product: Product, allSelected: Record<string, Product>) => {
  // We simulate selecting this product to see if the overall system remains compatible
  const simulatedSelection = { ...allSelected, [categoryId]: product };
  const report = CompatibilityEngine.evaluate(simulatedSelection);

  // If there are errors specifically related to this category, surface them
  if (!report.isCompatible) {
    // For simplicity, we just return the first error as the reason
    // A better approach would be filtering errors related to the current categoryId
    return { isCompatible: false, reason: report.errors[0] };
  }

  return { isCompatible: true, reason: '' };
};

export const getOverallCompatibility = (allSelected: Record<string, Product>): CompatibilityReport => {
  return CompatibilityEngine.evaluate(allSelected);
};

export const calculateEstimatedWattage = (selectedComponents: Record<string, Product>): number => {
  return CompatibilityEngine.calculateTotalTDP(selectedComponents);
};
