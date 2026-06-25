import React, { useState } from 'react';
import { X, Zap, Check, ArrowRight, Lock } from 'lucide-react';
import { PLANS, getPlan, PLAN_ORDER, type PlanId } from '../lib/plans';
import type { LimitContext } from '../hooks/usePlanLimits';
import { getUserPlan } from '../hooks/usePlanLimits';

interface UpgradeModalProps {
  context    : LimitContext | null;
  onClose    : () => void;
  accessToken?: string;
  userSub?   : string;
}

const LIMIT_COPY: Record<LimitContext['type'], (ctx: LimitContext) => { title: string; body: string }> = {
  projects:    c => ({ title: `You've reached your ${c.max}-project limit`, body: `Free plan includes ${c.max} projects. Upgrade to create unlimited projects and collaborate with your team.` }),
  generations: c => ({ title: `Monthly generation limit reached`, body: `You've used all ${c.max} AI generations this month on your current plan.` }),
  teamSeats:   c => ({ title: `Team seat limit reached`, body: `Your plan allows up to ${c.max} team members.` }),
  feature:     _c => ({ title: 'This feature requires an upgrade', body: 'Unlock this capability by upgrading your plan.' }),
};

async function createCheckoutSession(priceId: string, accessToken?: string, yearly = false, userSub?: string): Promise<void> {
  try {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        priceId,
        successUrl: `${window.location.origin}/?upgrade=success`,
        cancelUrl: window.location.href,
        ...(userSub ? { userId: userSub } : {}),
      }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error('Stripe checkout error:', err);
    alert('Could not connect to payment provider. Please try again later.');
  }
}

export default function UpgradeModal({ context, onClose, accessToken, userSub }: UpgradeModalProps) {
  if (!context) return null;

  const currentPlanId = getUserPlan();
  const currentRank   = PLAN_ORDER.indexOf(currentPlanId);
  const nextPlanId    = PLAN_ORDER[currentRank + 1] as PlanId | undefined;
  const nextPlan      = nextPlanId ? getPlan(nextPlanId) : null;
  const copy          = LIMIT_COPY[context.type](context);
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (planId: PlanId) => {
    const plan = getPlan(planId);
    if (planId === 'custom') {
      window.location.href = 'mailto:sales@talented.ai?subject=Custom Plan Inquiry';
      return;
    }
    const priceId = yearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) return;
    setLoading(true);
    await createCheckoutSession(priceId, accessToken, yearly, userSub);
    setLoading(false);
  };

  const paidPlans = PLAN_ORDER.filter(id => {
    if (id === 'free' || id === 'custom') return false;
    return PLAN_ORDER.indexOf(id) > currentRank;
  }) as PlanId[];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(4,8,28,.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{ background:'#fff', borderRadius:24, boxShadow:'0 24px 80px rgba(0,0,0,.25)', width:'100%', maxWidth:540, overflow:'hidden', fontFamily:"'Inter',sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ background:'linear-gradient(135deg,#04081c,#1e1b4b)', padding:'24px 24px 20px', position:'relative' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:120, height:120, borderRadius:'50%', background:'rgba(124,58,237,.2)', pointerEvents:'none' }}/>
          <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.1)', border:'none', color:'rgba(255,255,255,.7)', width:28, height:28, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14}/>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(124,58,237,.3)', border:'1px solid rgba(124,58,237,.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={18} color="#c4b5fd" fill="#c4b5fd"/>
            </div>
            <div>
              <p style={{ margin:0, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,255,255,.5)' }}>Upgrade required</p>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'#fff' }}>{copy.title}</h3>
            </div>
          </div>
          <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.6 }}>{copy.body}</p>

          {/* Usage bar (for projects/generations limits) */}
          {(context.type === 'projects' || context.type === 'generations') && (
            <div style={{ marginTop:14, background:'rgba(255,255,255,.08)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontWeight:600 }}>
                  {context.type === 'projects' ? 'Projects used' : 'Generations used'}
                </span>
                <span style={{ fontSize:11, color:'#fca5a5', fontWeight:800 }}>{context.current} / {context.max}</span>
              </div>
              <div style={{ height:6, background:'rgba(255,255,255,.1)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#ef4444,#f97316)', width:'100%' }}/>
              </div>
            </div>
          )}
        </div>

        {/* ── Billing toggle ── */}
        <div style={{ padding:'16px 24px 0', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <span style={{ fontSize:12, fontWeight:600, color: yearly?'#94a3b8':'#0f172a' }}>Monthly</span>
          <button onClick={() => setYearly(p => !p)}
            style={{ width:44, height:24, borderRadius:12, background: yearly?'#7c3aed':'#e2e8f0', border:'none', cursor:'pointer', position:'relative', transition:'background .2s' }}>
            <div style={{ position:'absolute', top:3, left: yearly?20:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}/>
          </button>
          <span style={{ fontSize:12, fontWeight:600, color: yearly?'#0f172a':'#94a3b8' }}>
            Yearly <span style={{ fontSize:10, fontWeight:800, color:'#16a34a', background:'#f0fdf4', padding:'1px 6px', borderRadius:10, marginLeft:2 }}>Save 17%</span>
          </span>
        </div>

        {/* ── Plan cards ── */}
        <div style={{ padding:'14px 24px 24px', display:'flex', flexDirection:'column', gap:10 }}>
          {paidPlans.map(planId => {
            const plan = getPlan(planId);
            const price = yearly ? plan.priceYearly : plan.priceMonthly;
            const isRecommended = planId === nextPlanId;
            return (
              <div key={planId} style={{ border: isRecommended?`2px solid #7c3aed`:'1px solid #e2e8f0', borderRadius:14, padding:'14px 16px', background: isRecommended?'#f5f3ff':'#fafafa', position:'relative' }}>
                {isRecommended && (
                  <span style={{ position:'absolute', top:-10, right:16, fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', background:'#7c3aed', color:'#fff', padding:'2px 10px', borderRadius:20 }}>Recommended</span>
                )}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <span style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>{plan.name}</span>
                    <span style={{ marginLeft:8, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background: plan.badgeBg, color: plan.badgeText }}>{plan.id.toUpperCase()}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ fontSize:20, fontWeight:900, color:'#0f172a' }}>${price}</span>
                    <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>/seat/mo</span>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', marginBottom:12 }}>
                  {plan.features.slice(0,4).map((f,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <Check size={11} color="#10b981" strokeWidth={3}/>
                      <span style={{ fontSize:11, color:'#475569', fontWeight:500 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleUpgrade(planId)} disabled={loading}
                  style={{ width:'100%', padding:'10px 0', borderRadius:10, border:'none', cursor: loading?'not-allowed':'pointer', fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .15s',
                    background: isRecommended?'#7c3aed':'#0f172a', color:'#fff', opacity: loading?.7:1,
                    boxShadow: isRecommended?'0 4px 12px rgba(124,58,237,.35)':'none',
                  }}>
                  {loading ? 'Redirecting to Stripe…' : plan.cta}
                  {!loading && <ArrowRight size={14}/>}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign:'center', fontSize:10, color:'#94a3b8', padding:'0 24px 16px', margin:0 }}>
          <Lock size={10} style={{ display:'inline', marginRight:4 }}/>
          Secure payment via Stripe · Cancel any time
        </p>
      </div>
    </div>
  );
}
