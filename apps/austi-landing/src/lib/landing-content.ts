export interface HeroProof {
  label: string;
  avatars?: { src: string; alt: string }[];
  rating?: { value: number; max: number; label: string };
}

export interface HeroIntegration {
  name: string;
  logo: string;
}

export const heroContent = {
  product: 'Austi',
  heading: 'Your marketing on autopilot.',
  paragraph:
    'Give Austi your website once. It learns your brand, then keeps your ads, posts, emails and search content moving.',
  paragraphMuted: 'Nothing goes live until you say so.',
  cta: 'Get early access',
  trust: [
    { icon: 'lock', title: 'Private and secure', detail: 'Your data stays yours' },
    { icon: 'check', title: 'You approve everything', detail: 'Nothing publishes without you' },
  ],
  // Set only after verifying the claim. No proof is rendered by default.
  proof: import.meta.env.PUBLIC_HERO_PROOF_LABEL?.trim()
    ? ({ label: import.meta.env.PUBLIC_HERO_PROOF_LABEL.trim() } as HeroProof)
    : undefined,
  metric: {
    endpoint: import.meta.env.PUBLIC_HERO_METRIC_ENDPOINT?.trim(),
    label: 'pieces of content created in beta',
  },
  // TODO: Add verified publishing integrations and their local logo assets once supported.
  integrations: [] as HeroIntegration[],
  integrationsLabel: 'Publishes to',
};

export const outcomes = [
  {
    id: 'coordination',
    name: 'Less coordination work',
    copy: 'Fewer repetitive calls, emails, scheduling conversations and follow-ups spread across the team.',
    detail: 'Routine handoffs stay attached to one case.',
  },
  {
    id: 'response',
    name: 'Faster first response',
    copy: 'Intake and basic diagnosis can begin when the report arrives, even before a coordinator is available.',
    detail: 'Urgent and uncertain cases surface sooner.',
  },
  {
    id: 'pms',
    name: 'Keep your existing PMS',
    copy: 'Add a coordination layer without migrating the system your team already uses as its source of truth.',
    detail: 'The complete case returns to the existing record.',
  },
] as const;

export const workflowPhases = [
  {
    name: 'Understand',
    range: 'Report → Triage',
    title: 'Turn a fragmented report into a workable brief.',
  },
  {
    name: 'Decide',
    range: 'Approval',
    title: 'Apply the operator’s policy before anything moves.',
  },
  {
    name: 'Coordinate',
    range: 'Select → Follow up',
    title: 'Bring the resident and contractor to one confirmed plan.',
  },
  {
    name: 'Close',
    range: 'Resolve → Record',
    title: 'Verify the outcome and return a complete case to the PMS.',
  },
] as const;

export const stages = [
  {
    name: 'Report',
    copy: 'Pick up the report across phone, email and WhatsApp, then connect it to the right resident and property.',
  },
  {
    name: 'Diagnose',
    copy: 'Ask structured follow-up questions, collect photos, video, error codes and approved low-risk checks.',
  },
  {
    name: 'Triage',
    copy: 'Classify urgency, likely responsibility and trade, while making uncertainty visible.',
  },
  {
    name: 'Approve',
    copy: 'Apply responsibility and spend rules, pausing for a person whenever policy or judgment requires it.',
  },
  {
    name: 'Select',
    copy: 'Start with approved contractors for that property and trade, with a complete job brief ready.',
  },
  {
    name: 'Schedule',
    copy: 'Line up resident access and contractor availability, chase silence and confirm the appointment.',
  },
  {
    name: 'Follow up',
    copy: 'Chase missing replies, keep every party updated and surface a stalled case before it disappears.',
  },
  {
    name: 'Resolve',
    copy: 'Confirm attendance and the outcome with the resident and contractor, then collect evidence and invoice details.',
  },
  {
    name: 'Record',
    copy: 'Prepare the full case history for the PMS so the existing system remains the source of truth.',
  },
] as const;

export const controls = [
  {
    name: 'Portfolio policy',
    copy: 'Approval limits and responsibilities can differ by owner, property and repair type.',
  },
  {
    name: 'Contractor order',
    copy: 'Choose preferred, backup and emergency contractors for every property and trade.',
  },
  {
    name: 'Escalation moments',
    copy: 'Danger, liability, uncertainty, sensitive residents and human requests go straight to a person.',
  },
  {
    name: 'Communication rules',
    copy: 'Set the tone, working hours, update cadence and information each party should receive.',
  },
] as const;

export const faqGroups = [
  {
    id: 'product',
    name: 'Product',
  },
  {
    id: 'operation',
    name: 'How it works',
  },
  {
    id: 'stage',
    name: 'Availability',
  },
] as const;

export const faqItems = [
  {
    group: 'product',
    question: 'What is Austi?',
    answer:
      'Austi is an AI marketing workspace in development for founders and small teams. The focus is turning your brand context into coordinated campaign drafts across ads, social posts, emails and search content.',
  },
  {
    group: 'product',
    question: 'Who is it for?',
    answer:
      'Founders, independent businesses and small marketing teams who know their product but need more time to plan and create their marketing. Early-access conversations help us decide which workflows to build first.',
  },
  {
    group: 'product',
    question: 'What can I create with Austi?',
    answer:
      'The planned workspace brings together ad copy and creative briefs, social captions and content plans, launch emails and newsletters, and search-focused article outlines. The examples on this page illustrate that direction; they are not output from a live product.',
  },
  {
    group: 'operation',
    question: 'How does Austi learn my brand?',
    answer:
      'The proposed starting point is your website, product information, audience and examples of your writing. You provide the source material and feedback so campaign drafts can reflect your business and voice.',
  },
  {
    group: 'operation',
    question: 'Will content go live without my approval?',
    answer:
      'The workflow is being designed around your review. You check the content, verify product claims and approve what you want to use. Automatic publishing and ad spending are not available on this landing page.',
  },
  {
    group: 'operation',
    question: 'Can Austi publish to my existing channels?',
    answer:
      'Publishing connections are being explored during early access. We do not claim live integrations with specific ad, social or email platforms yet. Tell us which tools you use so we can prioritize the connections that matter.',
  },
  {
    group: 'operation',
    question: 'Can I use it for more than social posts?',
    answer:
      'Yes, the product direction covers a whole campaign: ads, social posts, emails and search content built around the same offer. You can discuss a single channel or a broader campaign with us during early access.',
  },
  {
    group: 'stage',
    question: 'Is Austi available today?',
    answer:
      'Austi is in development and is not open for public self-service signup. The early-access links open an email to our team so we can discuss your marketing workflow and whether early testing is a fit.',
  },
  {
    group: 'stage',
    question: 'How much does it cost?',
    answer:
      'Pricing has not been announced. We are learning which marketing workflows are most useful before defining plans. There is no purchase or paid trial on this page.',
  },
  {
    group: 'stage',
    question: 'What should I share when I get in touch?',
    answer:
      'Send us your website, the channels you use and the marketing task that takes the most time each week. We will use that conversation to explore how Austi could fit your work.',
  },
] as const;
