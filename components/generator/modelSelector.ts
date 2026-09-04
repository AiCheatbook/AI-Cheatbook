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

// Looks up an explicitly-requested model by id, but only within
// what's actually available for this plan — a request for a
// paid-tier model on a free plan (or a stale/unknown id) falls
// back to getDefaultModel rather than trusting the client blindly.
export function getModelById(
  modelId: string | undefined,
  plan: UserPlan
): ModelConfig {
  if (!modelId) {
    return getDefaultModel(plan);
  }

  const match = getAvailableModels(plan).find(
    (model) => model.id === modelId
  );

  return match || getDefaultModel(plan);
}