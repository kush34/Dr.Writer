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

const defaultModelKey = "drwriter.defaultModel";
export function getDefaultModel() {
  const saved = localStorage.getItem(defaultModelKey);
  return saved && availableModels.includes(saved) ? saved : availableModels[0];
}
export function setDefaultModel(model: string) {
  localStorage.setItem(defaultModelKey, model);
}
