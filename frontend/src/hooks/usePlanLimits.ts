import { useState, useCallback } from 'react';
import { getPlan, PLANS, planRank, type PlanId } from '../lib/plans';

export interface LimitContext {
  type   : 'projects' | 'generations' | 'teamSeats' | 'feature';
  current: number;
  max    : number;
  feature?: string;
}

export interface UsePlanLimitsReturn {
  plan          : ReturnType<typeof getPlan>;
  planId        : PlanId;
  checkProject  : (currentCount: number) => boolean;   // returns true if allowed
  checkGeneration: (monthlyCount: number) => boolean;
  checkFeature  : (feature: keyof typeof PLANS.free.limits) => boolean;
  upgradeContext: LimitContext | null;
  showUpgrade   : (ctx: LimitContext) => void;
  clearUpgrade  : () => void;
}

/** Reads the user's current plan from localStorage (set after Stripe success webhook) */
export const getUserPlan = (): PlanId => {
  try {
    const stored = localStorage.getItem('talented_plan');
    if (stored && ['free','team','enterprise','custom'].includes(stored)) return stored as PlanId;
  } catch { /* */ }
  return 'free';
};

export const setUserPlan = (planId: PlanId) => {
  localStorage.setItem('talented_plan', planId);
};

export function usePlanLimits(): UsePlanLimitsReturn {
  const planId = getUserPlan();
  const plan   = getPlan(planId);
  const [upgradeContext, setUpgradeContext] = useState<LimitContext | null>(null);

  const showUpgrade = useCallback((ctx: LimitContext) => setUpgradeContext(ctx), []);
  const clearUpgrade = useCallback(() => setUpgradeContext(null), []);

  const checkProject = useCallback((currentCount: number): boolean => {
    const max = plan.limits.maxProjects;
    if (max === -1) return true;
    if (currentCount >= max) {
      showUpgrade({ type: 'projects', current: currentCount, max });
      return false;
    }
    return true;
  }, [plan, showUpgrade]);

  const checkGeneration = useCallback((monthlyCount: number): boolean => {
    const max = plan.limits.maxGenerationsMonth;
    if (max === -1) return true;
    if (monthlyCount >= max) {
      showUpgrade({ type: 'generations', current: monthlyCount, max });
      return false;
    }
    return true;
  }, [plan, showUpgrade]);

  const checkFeature = useCallback((feature: keyof typeof PLANS.free.limits): boolean => {
    const val = plan.limits[feature];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number')  return val !== 0;
    return false;
  }, [plan]);

  return { plan, planId, checkProject, checkGeneration, checkFeature, upgradeContext, showUpgrade, clearUpgrade };
}
