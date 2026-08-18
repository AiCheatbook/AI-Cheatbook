import {
  modelConfigs,
  type ModelConfig,
  type UserPlan,
} from "./modelConfig";

export function getAvailableModels(
  plan: UserPlan
): ModelConfig[] {
  return modelConfigs.filter((model) =>
    model.availableFor.includes(plan)
  );
}

export function getDefaultModel(
  plan: UserPlan
): ModelConfig {
  const availableModels =
    getAvailableModels(plan);

  if (availableModels.length === 0) {
    throw new Error(
      `No AI model is available for the "${plan}" plan.`
    );
  }

  return availableModels[0];
}