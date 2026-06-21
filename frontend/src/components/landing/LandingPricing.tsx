import React, { useState } from 'react';
import { Check, FolderOpen, ChevronDown, Zap } from 'lucide-react';

interface LandingPricingProps {
  onRegister?: () => void;
  showToast: (msg: string) => void;
}

export default function LandingPricing({ onRegister, showToast }: LandingPricingProps) {
  const [pricingActiveTab, setPricingActiveTab] = useState<'design' | 'whiteboard' | 'dev'>('design');
  const [isTeamAnnualBilling, setIsTeamAnnualBilling] = useState<boolean>(false);
  const [isBasicExpanded, setIsBasicExpanded] = useState<boolean>(true);
  const [isSmartDeliveryExpanded, setIsSmartDeliveryExpanded] = useState<boolean>(true);

  return (
    <section className="px-4 md:px-8 py-20 bg-stone-50 border-t border-stone-200 scroll-mt-20 z-10" id="pixso-pricing">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">

        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 tracking-tight leading-tight">
            Subscription Plans & Pricing
          </h2>
          <p className="text-neutral-500 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            New role-based seats to boost integrated collaboration efficiency.
          </p>
        </div>

        {/* Pricing Switchers */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs text-neutral-500 font-medium">
            <span>Please choose the plan that fits you best.</span>
          </div>

          <div className="bg-stone-100/80 p-1.5 rounded-xl flex items-center shadow-inner border border-stone-200/55">
            <button
              type="button"
              onClick={() => {
                setPricingActiveTab('design');
                showToast("🎨 Switched to Design files configuration");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                pricingActiveTab === 'design'
                  ? 'bg-white text-neutral-950 shadow-sm border border-stone-200/40'
                  : 'text-stone-500 hover:text-stone-850'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-violet-500"></div>
              Design files
            </button>
            <button
              type="button"
              onClick={() => {
                setPricingActiveTab('whiteboard');
                showToast("✏️ Switched to Whiteboard files configuration");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                pricingActiveTab === 'whiteboard'
                  ? 'bg-white text-neutral-950 shadow-sm border border-stone-200/40'
                  : 'text-stone-500 hover:text-stone-850'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              Whiteboard files
            </button>
            <button
              type="button"
              onClick={() => {
                setPricingActiveTab('dev');
                showToast("💻 Switched to Developer view configuration");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                pricingActiveTab === 'dev'
                  ? 'bg-white text-neutral-950 shadow-sm border border-stone-200/40'
                  : 'text-stone-500 hover:text-stone-850'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-[#15395e]"></div>
              Dev view
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mt-4">

          {/* Free Tier */}
          <div className="bg-white rounded-3xl border border-stone-250/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div>
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-cyan-400 via-sky-450 to-purple-400 text-white mb-6 shadow-sm">
                <h4 className="text-xl font-bold">Free</h4>
                <p className="text-[11px] text-white/95 mt-1 leading-normal font-medium">For personal creation, prototyping, and exploration</p>
              </div>

              <div className="space-y-4 px-1">
                <div>
                  <div className="text-2xl font-bold text-neutral-955">Free</div>
                  <div className="text-xs text-stone-400 mt-1 font-medium">Unlimited free viewer seats</div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-100 flex-grow px-1">
                <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mb-3">Free plan includes:</p>
                <ul className="space-y-2.5">
                  <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Unlimited viewer seats</span>
                  </li>
                  <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Unlimited draft files</span>
                  </li>
                  <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>3 free design files</span>
                  </li>
                  <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>3 free whiteboard files</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={onRegister}
                className="w-full py-3 px-4 rounded-xl border border-stone-300 text-stone-850 font-bold text-xs hover:bg-stone-50 hover:border-stone-400 transition-all active:scale-[0.98] cursor-pointer text-center"
              >
                Get started
              </button>
            </div>
          </div>

          {/* Team Tier */}
          <div className="bg-white rounded-3xl border border-stone-250/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-150 mb-6 flex flex-col justify-between min-h-[110px]">
                <div>
                  <h4 className="text-xl font-bold text-neutral-950">Team</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">For growing startups and SMBs</p>
                </div>

                <div className="mt-4 bg-stone-200/60 p-0.5 rounded-lg flex items-center w-full max-w-[145px] border border-stone-200/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTeamAnnualBilling(false);
                      showToast("💳 Set Team plan billing cycle to Monthly");
                    }}
                    className={`flex-1 py-1 rounded text-[9px] font-bold tracking-tight transition-all ${
                      !isTeamAnnualBilling
                        ? 'bg-white text-neutral-950 shadow-sm'
                        : 'text-stone-500 hover:text-stone-850'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTeamAnnualBilling(true);
                      showToast("🎁 Set Team plan billing cycle to Annual");
                    }}
                    className={`flex-1 py-1 rounded text-[9px] font-bold tracking-tight transition-all ${
                      isTeamAnnualBilling
                        ? 'bg-white text-neutral-950 shadow-sm'
                        : 'text-stone-500 hover:text-stone-850'
                    }`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              <div className="space-y-3 px-1">
                <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                  <div>
                    <span className="block text-xs font-bold text-neutral-900 font-sans">Creator seat</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15395e]"></span>
                      <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider font-mono">ALL</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-neutral-950">${isTeamAnnualBilling ? '10' : '12'}</span>
                    <span className="text-[10px] text-stone-400 block font-mono">/month/seat</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                  <div>
                    <span className="block text-xs font-bold text-neutral-900 font-sans">Developer seat</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15395e]"></span>
                      <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider font-mono">DEV</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-neutral-950">${isTeamAnnualBilling ? '6' : '8'}</span>
                    <span className="text-[10px] text-stone-400 block font-mono">/month/seat</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-stone-100 px-1 font-sans">
                <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mb-2.5">Everything in Free, plus:</p>
                <ul className="space-y-2">
                  {['Unlimited projects', 'Unlimited files', 'Private files', 'Team resource libraries'].map((f, i) => (
                    <li key={i} className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => showToast("🚀 Upgrading to High-Fidelity Team workspace subscription...")}
                className="w-full py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer text-center shadow-sm"
              >
                Upgrade to Team
              </button>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div className="bg-white rounded-3xl border border-stone-250/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-150 mb-6 flex flex-col justify-between min-h-[110px]">
                <div>
                  <h4 className="text-xl font-bold text-neutral-950">Enterprise</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">For SMBs and organizations</p>
                </div>
                <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md uppercase tracking-wider w-fit mt-3">Yearly Billed</div>
              </div>

              <div className="space-y-3 px-1">
                <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                  <div>
                    <span className="block text-xs font-bold text-neutral-900 font-sans">Creator seat</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse"></span>
                      <span className="text-[8px] font-bold text-stone-500 uppercase tracking-wider font-mono">Scale Full</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-neutral-950">$280</span>
                    <span className="text-[10px] text-stone-400 block font-mono">/year/seat</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-stone-100 px-1">
                <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mb-2.5">Everything in Team, plus:</p>
                <ul className="space-y-2">
                  {['Advanced permissions', 'SSO authentication', 'Enterprise active support', 'Collaboration logs'].map((f, i) => (
                    <li key={i} className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => showToast("🏢 Requesting custom setup quote for enterprise options...")}
                className="w-full py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer text-center shadow-sm"
              >
                Upgrade to Enterprise
              </button>
            </div>
          </div>

          {/* On-premise Tier */}
          <div className="bg-white rounded-3xl border border-stone-250/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-150 mb-6 flex flex-col justify-between min-h-[110px]">
                <div>
                  <h4 className="text-xl font-bold text-neutral-950">On-premise</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">Custom compliance & support</p>
                </div>
                <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md uppercase tracking-wider w-fit mt-3">Dedicated Host</div>
              </div>

              <div className="text-center py-7 bg-[#fafaf9] rounded-2xl border border-stone-150 mb-6 px-2">
                <span className="block text-xl font-bold text-stone-900 tracking-tight">Custom Plan</span>
                <p className="text-[11px] text-stone-400 mt-1 font-medium">Contact partner support for quotes</p>
              </div>

              <div className="mt-6 pt-5 border-t border-stone-100 px-1">
                <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mb-2.5">Everything in Enterprise, plus:</p>
                <ul className="space-y-2">
                  {['On-premise deployment', 'Custom feature development', 'Core data encryption', 'Dedicated consultant seat'].map((f, i) => (
                    <li key={i} className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-[#019cda] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => showToast("✉️ Forwarding inquiry message to enterprise sales partners...")}
                className="w-full py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer text-center shadow-sm"
              >
                Contact us
              </button>
            </div>
          </div>

        </div>

        {/* Interactive Comparison Sheets matrix */}
        <div className="mt-14 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-medium text-neutral-955">Version comparison</h3>
            <p className="text-xs text-stone-400 font-medium font-sans">Find the plan that fits you best</p>
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-stone-200">
                  <td className="p-6 text-xs font-extrabold uppercase tracking-wider text-stone-400 bg-stone-50/50 w-1/3 font-sans">Features Comparison</td>
                  <td className="p-6 text-center bg-stone-50/50">
                    <div className="font-bold text-sm text-neutral-950">Free</div>
                    <button
                      type="button"
                      onClick={onRegister}
                      className="mt-2 text-[10px] font-bold bg-white border border-stone-250 hover:bg-stone-50 px-3 py-1.5 rounded-lg text-stone-750 cursor-pointer transition-all"
                    >
                      Get started
                    </button>
                  </td>
                  <td className="p-6 text-center bg-stone-50/50">
                    <div className="font-bold text-sm text-neutral-950">Team</div>
                    <button
                      type="button"
                      onClick={() => showToast("🚀 Upgrading to Team pipeline tier...")}
                      className="mt-2 text-[10px] font-bold bg-neutral-950 text-white hover:bg-neutral-900 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      Upgrade to Team
                    </button>
                  </td>
                  <td className="p-6 text-center bg-stone-50/50">
                    <div className="font-bold text-sm text-neutral-955">Enterprise</div>
                    <button
                      type="button"
                      onClick={() => showToast("🏢 Shifting to Enterprise level options...")}
                      className="mt-2 text-[10px] font-bold bg-neutral-950 text-white hover:bg-neutral-900 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      Upgrade Enterprise
                    </button>
                  </td>
                  <td className="p-6 text-center bg-stone-50/50">
                    <div className="font-bold text-sm text-neutral-955">On-premise</div>
                    <button
                      type="button"
                      onClick={() => showToast("✉️ Inquiring custom enterprise scope design...")}
                      className="mt-2 text-[10px] font-bold bg-white border border-stone-250 hover:bg-stone-50 px-3 py-1.5 rounded-lg text-stone-750 cursor-pointer transition-all"
                    >
                      Contact us
                    </button>
                  </td>
                </tr>
              </thead>

              <tbody>
                <tr className="bg-stone-50/80 border-b border-stone-200 cursor-pointer select-none" onClick={() => setIsBasicExpanded(!isBasicExpanded)}>
                  <td colSpan={5} className="p-4 text-xs font-bold text-neutral-955 flex items-center justify-between font-sans">
                    <span className="flex items-center gap-2 uppercase tracking-widest text-[10px] text-stone-600">
                      <FolderOpen className="w-3.5 h-3.5 text-[#15395e]" />
                      Basic Limits
                    </span>
                    <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${isBasicExpanded ? 'rotate-180' : ''}`} />
                  </td>
                </tr>

                {isBasicExpanded && (
                  <>
                    <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 text-xs text-neutral-750 font-medium pl-6">Draft files</td>
                      <td className="p-4 text-center text-xs text-stone-500 font-mono">Unlimited</td>
                      <td className="p-4 text-center text-xs text-stone-850 font-semibold font-mono">Unlimited</td>
                      <td className="p-4 text-center text-xs text-stone-855 font-semibold font-mono">Unlimited</td>
                      <td className="p-4 text-center text-xs text-stone-855 font-semibold font-mono">Unlimited</td>
                    </tr>
                    <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 text-xs text-neutral-750 font-medium pl-6">Design files limit</td>
                      <td className="p-4 text-center text-xs text-stone-500 font-mono">3</td>
                      <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                      <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                      <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                    </tr>
                  </>
                )}

                <tr className="bg-stone-50/80 border-b border-stone-200 cursor-pointer select-none" onClick={() => setIsSmartDeliveryExpanded(!isSmartDeliveryExpanded)}>
                  <td colSpan={5} className="p-4 text-xs font-bold text-neutral-900 flex items-center justify-between font-sans">
                    <span className="flex items-center gap-2 uppercase tracking-widest text-[10px] text-stone-600">
                      <Zap className="w-3.5 h-3.5 text-[#019cda]" />
                      Smart Delivery
                    </span>
                    <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${isSmartDeliveryExpanded ? 'rotate-180' : ''}`} />
                  </td>
                </tr>

                {isSmartDeliveryExpanded && (
                  <>
                    <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 text-xs text-neutral-750 font-medium pl-6">Design-to-Code Generation</td>
                      <td className="p-4 text-center text-xs text-stone-400 font-mono">&mdash;</td>
                      <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                      <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                      <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}
