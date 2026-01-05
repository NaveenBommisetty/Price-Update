export const PLAN_LIMITS = {
  FREE: {
    maxProducts: 10,
  },
  PRO: {
    maxProducts: 20,
  },
};

export function getPlanKey(subscription) {
  return subscription ? "PRO" : "FREE";
}
