import { Check } from "lucide-react";

const Plans = () => {
  const plans = [
    {
      title: "Free Plan",
      perks: [
        "Up to 10 files",
        "10 prompts per 5 minutes",
        "Basic editor",
        "No version history",
        "No collaboration",
        "No support",
      ],
      price: 0,
    },
    {
      title: "Standard Plan",
      perks: [
        "Up to 100 files",
        "50 prompts per 5 minutes",
        "Export as PDF / DOCX / Markdown",
        "Cloud sync",
      ],
      price: 20,
      featured: true,
    },
    {
      title: "Plus Plan",
      perks: [
        "Unlimited files",
        "Unlimited prompts",
        "Advanced AI editor",
        "Full version history",
        "Real-time collaboration",
        "Role-based access",
      ],
      price: 50,
    },
  ];

  return (
    <div className="py-10 text-secondary flex flex-col gap-12 items-center">
      <h1 className="text-4xl font-medium">Our Plans</h1>

      {/* IMPORTANT: items-stretch */}
      <div className="flex items-stretch gap-12">
        {plans.map((plan) => (
          <div
            key={plan.title}
            className="flex flex-col justify-between border p-10 rounded-2xl w-80 h-[520px] shadow"
          >
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold">{plan.title}</h2>

              {/* Fixed height list */}
              <ul className="flex flex-col gap-4 text-sm h-[220px] overflow-y-auto">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check size={16} className="mt-1" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`border rounded-2xl px-5 py-3 font-medium transition ${
                plan.featured
                  ? "bg-primary text-background"
                  : "hover:bg-muted"
              }`}
            >
              $ {plan.price}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Plans;
