export const availableModels = [
  "openrouter/free",
  "google/gemma-3-27b-it:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-coder:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
];

const defaultModelKey = "drwriter.defaultModel";
export function getDefaultModel() {
  const saved = localStorage.getItem(defaultModelKey);
  return saved && availableModels.includes(saved) ? saved : availableModels[0];
}
export function setDefaultModel(model: string) {
  localStorage.setItem(defaultModelKey, model);
}
