export type PlanId = "starter" | "growth" | "group";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$129",
    priceNote: "/mo after trial",
    description: "For a single location getting reservations online.",
    features: ["Online booking page", "Guest profiles", "Host stand", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$289",
    priceNote: "/mo after trial",
    description: "For busy rooms that need marketing and loyalty.",
    features: [
      "Everything in Starter",
      "Loyalty & SMS",
      "Analytics & reports",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "group",
    name: "Group",
    price: "Custom",
    priceNote: "talk to us",
    description: "Multi-location operators and restaurant groups.",
    features: ["Multi-location", "SSO-ready", "Dedicated success", "Custom integrations"],
  },
];

const PLAN_KEY = "restostack:plan";

export function isPlanId(v: unknown): v is PlanId {
  return v === "starter" || v === "growth" || v === "group";
}

export function saveSelectedPlan(plan: PlanId) {
  try {
    sessionStorage.setItem(PLAN_KEY, plan);
  } catch {
    /* ignore */
  }
}

export function readSelectedPlan(): PlanId {
  try {
    const v = sessionStorage.getItem(PLAN_KEY);
    if (isPlanId(v)) return v;
  } catch {
    /* ignore */
  }
  return "starter";
}

export function clearSelectedPlan() {
  try {
    sessionStorage.removeItem(PLAN_KEY);
  } catch {
    /* ignore */
  }
}
