/* ─── Talented Platform — Plan definitions ──────────────────────────────────
   Stripe price IDs: replace pk_test_* / price_* with your real keys.
   Set VITE_STRIPE_PUBLISHABLE_KEY in your .env file.
   Backend must expose POST /api/stripe/create-checkout-session
─────────────────────────────────────────────────────────────────────────── */

export type PlanId = 'free' | 'team' | 'enterprise' | 'custom';

export interface PlanLimits {
  maxProjects        : number;     // -1 = unlimited
  maxGenerationsMonth: number;     // -1 = unlimited
  maxTeamSeats       : number;
  maxAgentsPerProject: number;
  versionHistoryDays : number;     // -1 = unlimited
  canExportGitLab    : boolean;
  canUseSSO          : boolean;
  canUseAPI          : boolean;
  codeWatermark      : boolean;
  canUseMeetingMode  : boolean;
  canUseJiraMode     : boolean;
  wcagLevel          : 'none' | 'basic' | 'full';
}

export interface Plan {
  id          : PlanId;
  name        : string;
  tagline     : string;
  priceMonthly: number | null;   // null = custom/contact
  priceYearly : number | null;
  /** Stripe price IDs — replace with your real ones from Stripe dashboard */
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly : string | null;
  color       : string;
  badgeBg     : string;
  badgeText   : string;
  limits      : PlanLimits;
  features    : string[];
  cta         : string;
}

export const PLANS: Record<PlanId, Plan> = {

  free: {
    id: 'free',
    name: 'Free',
    tagline: 'For personal creation, prototyping, and exploration.',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    color: '#475569',
    badgeBg: '#f1f5f9',
    badgeText: '#334155',
    limits: {
      maxProjects:         3,
      maxGenerationsMonth: 10,
      maxTeamSeats:        1,
      maxAgentsPerProject: 0,
      versionHistoryDays:  7,
      canExportGitLab:     false,
      canUseSSO:           false,
      canUseAPI:           false,
      codeWatermark:       true,
      canUseMeetingMode:   false,
      canUseJiraMode:      false,
      wcagLevel:           'none',
    },
    features: [
      '3 projects',
      '10 AI generations / month',
      'Prompt-to-UI mode only',
      'Basic component library',
      'Watermarked code export',
      '7-day version history',
      'Community support',
    ],
    cta: 'Get started free',
  },

  team: {
    id: 'team',
    name: 'Team Plan',
    tagline: 'For growing startups and SMBs.',
    priceMonthly: 12,
    priceYearly: 10,
    stripePriceIdMonthly: 'price_1TlbfMFE0aUBf54KlSc6JRai',   // ← Stripe Dashboard → Products → Team Plan → Copy price ID
    stripePriceIdYearly:  'price_1TlbfMFE0aUBf54KpweXNlqr',
    color: '#059669',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
    limits: {
      maxProjects:         20,
      maxGenerationsMonth: 100,
      maxTeamSeats:        10,
      maxAgentsPerProject: 5,
      versionHistoryDays:  60,
      canExportGitLab:     true,
      canUseSSO:           false,
      canUseAPI:           false,
      codeWatermark:       false,
      canUseMeetingMode:   true,
      canUseJiraMode:      true,
      wcagLevel:           'basic',
    },
    features: [
      '20 projects',
      '100 AI generations / month',
      'Prompt + Meeting + Jira modes',
      'Up to 5 custom agents / project',
      '10 team seats',
      'GitLab & GitHub export',
      'No watermark on exports',
      '60-day version history',
      'Basic WCAG audit',
      'Priority email support',
    ],
    cta: 'Upgrade to Team',
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For SMBs and organizations that need scale.',
    priceMonthly: 28,
    priceYearly: 22,
    stripePriceIdMonthly: 'price_1TlbheFE0aUBf54KNyXOvMC4',  // ← Stripe Dashboard → Products → Enterprise Plan → Copy price ID
    stripePriceIdYearly:  'price_1TlbiDFE0aUBf54KNWKf6Pkb',
    color: '#7c3aed',
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
    limits: {
      maxProjects:         -1,
      maxGenerationsMonth: -1,
      maxTeamSeats:        -1,
      maxAgentsPerProject: -1,
      versionHistoryDays:  365,
      canExportGitLab:     true,
      canUseSSO:           true,
      canUseAPI:           true,
      codeWatermark:       false,
      canUseMeetingMode:   true,
      canUseJiraMode:      true,
      wcagLevel:           'full',
    },
    features: [
      'Unlimited projects',
      'Unlimited AI generations',
      'All generation modes',
      'Custom agent pipelines',
      'Unlimited team seats',
      'SSO / SAML authentication',
      'Advanced RBAC permissions',
      'Full WCAG 2.1 compliance suite',
      '1-year version history',
      'REST API access',
      'Audit & collaboration logs',
      'Dedicated account manager',
      '99.9% uptime SLA',
    ],
    cta: 'Upgrade to Enterprise',
  },

  custom: {
    id: 'custom',
    name: 'Custom',
    tagline: 'On-premise deployment with compliance and partner support.',
    priceMonthly: null,
    priceYearly: null,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    color: '#0f172a',
    badgeBg: '#0f172a',
    badgeText: '#e2e8f0',
    limits: {
      maxProjects:         -1,
      maxGenerationsMonth: -1,
      maxTeamSeats:        -1,
      maxAgentsPerProject: -1,
      versionHistoryDays:  -1,
      canExportGitLab:     true,
      canUseSSO:           true,
      canUseAPI:           true,
      codeWatermark:       false,
      canUseMeetingMode:   true,
      canUseJiraMode:      true,
      wcagLevel:           'full',
    },
    features: [
      'Everything in Enterprise',
      'Private Kubernetes / on-premise deploy',
      'Custom feature development',
      'AES-256 encryption at rest',
      'Dedicated consultant seat',
      'Airgapped deployment option',
      'White-label option',
      'Custom SLA & compliance reports',
    ],
    cta: 'Contact us',
  },
};

/* ── Limit check helpers ─────────────────────────────────────────────── */

export const getPlan = (planId: PlanId | string | undefined): Plan =>
  PLANS[(planId as PlanId) ?? 'free'] ?? PLANS.free;

export const isUnlimited = (val: number) => val === -1;

export const formatLimit = (val: number, unit = '') =>
  val === -1 ? 'Unlimited' : `${val}${unit ? ' ' + unit : ''}`;

/** Which plan gates a given feature */
export const FEATURE_GATES: Record<string, PlanId> = {
  meetingMode   : 'team',
  jiraMode      : 'team',
  gitlabExport  : 'team',
  removeWatermark: 'team',
  customAgents  : 'team',
  sso           : 'enterprise',
  apiAccess     : 'enterprise',
  fullWcag      : 'enterprise',
  onPremise     : 'custom',
};

export const PLAN_ORDER: PlanId[] = ['free', 'team', 'enterprise', 'custom'];

export const planRank = (id: PlanId) => PLAN_ORDER.indexOf(id);

export const canAccess = (userPlan: PlanId, requiredPlan: PlanId): boolean =>
  planRank(userPlan) >= planRank(requiredPlan);
