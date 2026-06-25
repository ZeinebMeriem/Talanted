import React, { useState } from 'react';
import { Check, Zap, ArrowRight } from 'lucide-react';
import { PLAN_ORDER, getPlan, type PlanId } from '../../lib/plans';

interface LandingPricingProps {
  onRegister?: () => void;
  showToast: (msg: string) => void;
  accessToken?: string;
}

async function handleStripeCheckout(priceId: string | null, planId: PlanId, yearly: boolean, accessToken?: string) {
  if (planId === 'custom') {
    window.location.href = 'mailto:sales@talented.ai?subject=Custom Plan Inquiry';
    return;
  }
  if (planId === 'free') { return; }
  if (!priceId) { alert('Price configuration missing. Please contact support.'); return; }
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        priceId,
        successUrl: `${window.location.origin}/?upgrade=success`,
        cancelUrl: window.location.href,
      }),
    });
    if (!res.ok) throw new Error();
    const { url } = await res.json();
    window.location.href = url;
  } catch {
    alert('Could not connect to payment provider. Please try again.');
  }
}

const PLAN_CARD_STYLES: Record<PlanId, { wrapper: React.CSSProperties; card: React.CSSProperties; titleColor: string; subColor: string; divider: string }> = {
  free: {
    wrapper: { background: '#fff', color: '#0f172a', borderRight: '1px solid rgba(0,0,0,.07)' },
    card: { background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1px solid #e2e8f0' },
    titleColor: '#0f172a', subColor: '#94a3b8', divider: '#f1f5f9',
  },
  team: {
    wrapper: { background: '#fff', color: '#0f172a', borderRight: '1px solid rgba(0,0,0,.07)' },
    card: { background: 'linear-gradient(135deg,#065f46,#047857)', border: '1px solid #064e3b' },
    titleColor: '#0f172a', subColor: '#64748b', divider: '#f1f5f9',
  },
  enterprise: {
    wrapper: { background: '#04081c', color: '#fff', borderRight: '1px solid rgba(255,255,255,.06)' },
    card: { background: 'linear-gradient(135deg,#1e1b4b,#2e1065)', border: '1px solid rgba(167,139,250,.3)' },
    titleColor: '#fff', subColor: '#c4b5fd', divider: '#1e2a4a',
  },
  custom: {
    wrapper: { background: '#fff', color: '#0f172a', borderRight: 'none' },
    card: { background: 'linear-gradient(135deg,#0f172a,#1e293b)', border: '1px solid #334155' },
    titleColor: '#0f172a', subColor: '#475569', divider: '#f1f5f9',
  },
};

const CARD_CHIP_COLORS: Record<PlanId, string> = {
  free: 'from-amber-200 to-amber-300',
  team: 'from-amber-200 to-amber-300',
  enterprise: 'from-amber-300 to-amber-400',
  custom: 'from-slate-700 to-slate-600',
};
const CARD_NUMBER: Record<PlanId, string> = {
  free:       '5412 5683 9021 0001',
  team:       '5412 5683 9021 3491',
  enterprise: '5412 5683 9021 8847',
  custom:     'HOST-9921-X999-COMS',
};
const CARD_HOLDER: Record<PlanId, string> = {
  free: 'Free Explorer', team: 'Team Workspace', enterprise: 'Enterprise Host', custom: 'Private Kubernetes',
};

const CTA_STYLES: Record<PlanId, React.CSSProperties> = {
  free:       { background: '#f1f5f9', color: '#0f172a' },
  team:       { background: '#10b981', color: '#fff', boxShadow: '0 4px 14px rgba(16,185,129,.3)' },
  enterprise: { background: '#7c3aed', color: '#fff', boxShadow: '0 4px 14px rgba(124,58,237,.35)' },
  custom:     { background: '#0f172a', color: '#fff' },
};

export default function LandingPricing({ onRegister, showToast, accessToken }: LandingPricingProps) {
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<PlanId | null>(null);

  const handleCTA = async (planId: PlanId) => {
    if (planId === 'free') { onRegister?.(); return; }
    const plan = getPlan(planId);
    const priceId = yearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    setLoading(planId);
    await handleStripeCheckout(priceId, planId, yearly, accessToken);
    setLoading(null);
  };

  return (
    <section className="py-20 lg:py-24 bg-white relative z-10 w-full" id="pricing">
      <div className="max-w-7xl mx-auto px-6 sm:px-12">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="max-w-xl">
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-slate-900 leading-tight">
              Simple and transparent pricing for every team
            </h2>
            <p className="mt-3 text-slate-500 text-sm leading-relaxed">
              Start free. Upgrade when you need more power. No hidden fees.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span style={{ fontSize:13, fontWeight:600, color: yearly?'#94a3b8':'#0f172a' }}>Monthly</span>
            <button type="button" onClick={() => setYearly(p=>!p)}
              style={{ width:48, height:26, borderRadius:13, background: yearly?'#7c3aed':'#e2e8f0', border:'none', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left: yearly?22:3, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}/>
            </button>
            <span style={{ fontSize:13, fontWeight:600, color: yearly?'#0f172a':'#94a3b8' }}>
              Yearly{' '}
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">Save 17%</span>
            </span>
          </div>
        </div>

        {/* 4-column plan grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', border:'1px solid rgba(0,0,0,.08)', borderRadius:24, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.04)' }}>
          {(PLAN_ORDER as PlanId[]).map(planId => {
            const plan  = getPlan(planId);
            const style = PLAN_CARD_STYLES[planId];
            const price = yearly ? plan.priceYearly : plan.priceMonthly;
            const isFree = planId === 'free';
            const isEnterprise = planId === 'enterprise';
            const isLoading = loading === planId;

            return (
              <div key={planId} style={{ padding:'32px 24px', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden', ...style.wrapper }}>
                {isEnterprise && <div style={{ position:'absolute', top:-40, right:-40, width:120, height:120, borderRadius:'50%', background:'rgba(124,58,237,.12)', pointerEvents:'none' }}/>}

                <div>
                  {/* Badge */}
                  <div style={{ marginBottom:16 }}>
                    <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', padding:'3px 10px', borderRadius:20, background: isEnterprise?'rgba(124,58,237,.2)':'rgba(0,0,0,.06)', color: isEnterprise?'#c4b5fd':style.titleColor }}>
                      {plan.name}
                    </span>
                  </div>

                  {/* Credit card visual */}
                  <div style={{ width:'100%', height:140, borderRadius:16, padding:14, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden', marginBottom:20, ...style.card }}
                    className="group select-none">
                    <div className="absolute top-0 left-[-150%] w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[150%] transition-all duration-1000 ease-out"/>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:900, fontStyle:'italic', fontSize:11, color:'#fff', opacity:.9 }}>talented</span>
                      <span style={{ fontSize:7, fontWeight:800, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,.5)', fontFamily:'monospace' }}>{plan.name}</span>
                    </div>
                    <div className={`w-7 h-5 bg-gradient-to-br ${CARD_CHIP_COLORS[planId]} rounded shadow-sm opacity-80`}/>
                    <p style={{ fontFamily:'monospace', fontSize:11, letterSpacing:'0.15em', color:'rgba(255,255,255,.85)', fontWeight:500 }}>{CARD_NUMBER[planId]}</p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                      <div>
                        <p style={{ fontSize:7, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,255,255,.45)', fontWeight:800, margin:0 }}>
                          {planId === 'custom' ? 'Server Core' : 'Card Holder'}
                        </p>
                        <p style={{ fontSize:10, fontFamily:'monospace', color:'#fff', fontWeight:700, margin:'2px 0 0' }}>{CARD_HOLDER[planId]}</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:7, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,255,255,.45)', fontWeight:800, margin:0 }}>
                          {planId === 'custom' ? 'Deployment' : 'Plan'}
                        </p>
                        <p style={{ fontSize:10, fontFamily:'monospace', color:'#fff', fontWeight:700, margin:'2px 0 0' }}>
                          {planId === 'custom' ? 'Airgapped' : plan.id.charAt(0).toUpperCase() + plan.id.slice(1)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price + name */}
                  <div style={{ marginBottom:20 }}>
                    <h3 style={{ fontSize:28, fontWeight:900, color: style.titleColor, margin:'0 0 2px', letterSpacing:'-0.02em' }}>{plan.name}</h3>
                    {!isFree && planId !== 'custom' ? (
                      <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                        <span style={{ fontSize:22, fontWeight:900, color: style.titleColor }}>${price}</span>
                        <span style={{ fontSize:11, color: style.subColor, fontWeight:600 }}>/seat/month{yearly?' · billed yearly':''}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize:13, fontWeight:700, color: style.subColor }}>
                        {isFree ? 'Free forever' : 'Custom pricing · contact us'}
                      </span>
                    )}
                    <p style={{ fontSize:12, color: style.subColor, marginTop:6, lineHeight:1.5 }}>{plan.tagline}</p>
                  </div>

                  {/* Features list */}
                  <div style={{ paddingTop:16, borderTop:`1px solid ${style.divider}` }}>
                    <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color: style.subColor, margin:'0 0 10px' }}>
                      {planId === 'free' ? 'Includes:' : 'Everything below, plus:'}
                    </p>
                    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:7 }}>
                      {plan.features.map((feat, i) => (
                        <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                          <div style={{ width:16, height:16, borderRadius:'50%', background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                            <Check size={10} color="#fff" strokeWidth={3.5}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:600, color: isEnterprise?'rgba(255,255,255,.8)':'#374151', lineHeight:1.4 }}>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA */}
                <div style={{ marginTop:24 }}>
                  <button type="button" onClick={() => handleCTA(planId)} disabled={isLoading}
                    style={{ width:'100%', padding:'12px 0', borderRadius:14, border:'none', cursor: isLoading?'not-allowed':'pointer', fontWeight:800, fontSize:13, letterSpacing:'0.02em', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all .15s', opacity: isLoading?.7:1, ...CTA_STYLES[planId] }}>
                    {isLoading ? 'Redirecting…' : (
                      <>
                        {planId !== 'free' && <Zap size={13} fill="currentColor"/>}
                        {plan.cta}
                        {planId !== 'free' && <ArrowRight size={13}/>}
                      </>
                    )}
                  </button>
                  <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center', marginTop:8, color: isEnterprise?'rgba(255,255,255,.3)':'#94a3b8' }}>
                    {isFree         ? 'No credit card required' :
                     planId==='custom' ? 'Quotes on special hardware' :
                     yearly ? `$${price}/seat/mo · billed annually` : `$${price}/seat · billed monthly`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust strip */}
        <div style={{ marginTop:32, display:'flex', alignItems:'center', justifyContent:'center', gap:24, flexWrap:'wrap' }}>
          {[
            { icon:'🔒', text:'Payments secured by Stripe' },
            { icon:'↩️', text:'Cancel any time, no lock-in' },
            { icon:'🏢', text:'SOC 2 compliant infrastructure' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:600, color:'#64748b' }}>
              <span style={{ fontSize:14 }}>{icon}</span>{text}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
