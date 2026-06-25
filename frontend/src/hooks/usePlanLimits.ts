import { useState, useCallback, useEffect } from 'react';
import { getPlan, PLANS, type PlanId } from '../lib/plans';
import type { UserProfileResponse } from '../api';

export interface LimitContext {
  type   : 'projects' | 'generations' | 'teamSeats' | 'feature';
  current: number;
  max    : number;
  feature?: string;
}

export interface UsePlanLimitsReturn {
  plan          : ReturnType<typeof getPlan>;
  planId        : PlanId;
  checkProject  : (currentCount: number) => boolean;
  checkGeneration: (monthlyCount: number) => boolean;
  checkFeature  : (feature: keyof typeof PLANS.free.limits) => boolean;
  upgradeContext: LimitContext | null;
  showUpgrade   : (ctx: LimitContext) => void;
  clearUpgrade  : () => void;
}

/** Read plan from localStorage (written after Stripe success or profile load) */
export const getUserPlan = (): PlanId => {
  try {
    const stored = localStorage.getItem('talented_plan')
    if (stored && ['free','team','enterprise','custom'].includes(stored)) return stored as PlanId
  } catch { /* */ }
  return 'free'
}

export const setUserPlan = (planId: PlanId) => {
  localStorage.setItem('talented_plan', planId)
  window.dispatchEvent(new CustomEvent('talented_plan_changed', { detail: planId }))
}

/** Sync plan from a freshly-loaded profile — sets localStorage and returns the planId */
export const syncPlanFromProfile = (profile: UserProfileResponse | null): PlanId => {
  if (!profile?.planId) return getUserPlan()
  const id = profile.planId as PlanId
  if (['free','team','enterprise','custom'].includes(id)) {
    setUserPlan(id)
    return id
  }
  return getUserPlan()
}

export function usePlanLimits(): UsePlanLimitsReturn {
  const [planId, setPlanId] = useState<PlanId>(getUserPlan)
  const plan   = getPlan(planId)
  const [upgradeContext, setUpgradeContext] = useState<LimitContext | null>(null)

  useEffect(() => {
    const handler = (e: Event) => setPlanId((e as CustomEvent<PlanId>).detail)
    window.addEventListener('talented_plan_changed', handler)
    return () => window.removeEventListener('talented_plan_changed', handler)
  }, [])

  const showUpgrade  = useCallback((ctx: LimitContext) => setUpgradeContext(ctx), [])
  const clearUpgrade = useCallback(() => setUpgradeContext(null), [])

  const checkProject = useCallback((currentCount: number): boolean => {
    const max = plan.limits.maxProjects
    if (max === -1) return true
    if (currentCount >= max) {
      showUpgrade({ type: 'projects', current: currentCount, max })
      return false
    }
    return true
  }, [plan, showUpgrade])

  const checkGeneration = useCallback((monthlyCount: number): boolean => {
    const max = plan.limits.maxGenerationsMonth
    if (max === -1) return true
    if (monthlyCount >= max) {
      showUpgrade({ type: 'generations', current: monthlyCount, max })
      return false
    }
    return true
  }, [plan, showUpgrade])

  const checkFeature = useCallback((feature: keyof typeof PLANS.free.limits): boolean => {
    const val = plan.limits[feature]
    if (typeof val === 'boolean') return val
    if (typeof val === 'number')  return val !== 0
    return false
  }, [plan])

  return { plan, planId, checkProject, checkGeneration, checkFeature, upgradeContext, showUpgrade, clearUpgrade }
}
