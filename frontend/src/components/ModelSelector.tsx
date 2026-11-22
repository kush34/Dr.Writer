import { Bot } from "lucide-react";
import { ModelPicker, type PickerModel } from "@/components/ui/model-picker";
import { availableModels } from "@/config/models";

const logos: Record<string, string> = {
  google: "googlegemini", openai: "openai", qwen: "qwen",
  nvidia: "nvidia", openrouter: "openrouter", deepseek: "deepseek",
};
const models: PickerModel[] = availableModels.map(id => {
  const [provider, name] = id.split("/");
  const logo = logos[provider.toLowerCase()];
  return { id, name: name || provider, provider, icon: logo ? <img src={`/model-logos/${logo}.svg`} alt="" className="size-4 dark:rounded-sm dark:bg-white dark:p-0.5" /> : <Bot aria-hidden="true" className="size-4" /> };
});

export function ModelSelector({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) {
  return <ModelPicker id={id} models={models} value={value} onChange={onChange} />;
}
