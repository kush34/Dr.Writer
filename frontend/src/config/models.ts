export const availableModels = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "nvidia/nemotron-3.5-lightning:free",
  "recursive/flint-v1.0:free",
  "inclusionai/ling-3.2-flash:free",
  "baidu/ernie-5.5-flash-preview:free",
];

// The largest listed model; the free router picks a different (often small) model on every request.
export const recommendedModel = "nvidia/nemotron-3-ultra-550b-a55b:free";

/** Why a model is likely to give poor document or slide edits, or null when there is no known concern. */
export function weakModelReason(model: string) {
  if (model === "openrouter/free") return "The free router picks a different model on each request, so edit quality varies.";
  if (/lightning|flash|a4b/i.test(model)) return "This is a small, fast model; long documents and slide decks may come out thin or malformed.";
  return null;
}

const defaultModelKey = "drwriter.defaultModel";
export function getDefaultModel() {
  const saved = localStorage.getItem(defaultModelKey);
  return saved && availableModels.includes(saved) ? saved : recommendedModel;
}
export function setDefaultModel(model: string) {
  localStorage.setItem(defaultModelKey, model);
}
