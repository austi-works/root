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

export const statement =
  'You know your product better than anyone. You know who it is for. What you do not have is the time to say it everywhere, every week, in a voice that still sounds like you.';

export const formats = [
  'Ad copy',
  'Creative briefs',
  'Social captions',
  'Content plans',
  'Launch emails',
  'Newsletters',
  'Search outlines',
  'Campaign ideas',
] as const;

export const learnSteps = [
  {
    title: 'Start with the address you already have.',
    copy: 'Share your website once. Austi reads it the way a new hire would, looking for what you sell, how you describe it and what you keep coming back to.',
  },
  {
    title: 'Know what is actually on the shelf.',
    copy: 'Product details stay attached to the campaign, so a draft can talk about the real thing rather than a category of things.',
  },
  {
    title: 'Write for someone in particular.',
    copy: 'Tell Austi who you serve and what matters to them. Every brief starts from those people, not from a demographic guess.',
  },
  {
    title: 'Keep the way you talk.',
    copy: 'Add examples of your writing and correct what feels off. The feedback becomes part of the context for the next draft.',
  },
] as const;

export const planSteps = [
  {
    name: 'The idea',
    value: 'Slower mornings',
    title: 'One idea worth repeating.',
    copy: 'A campaign begins as a single thought you can say out loud. Everything after it has to earn its place against that thought.',
  },
  {
    name: 'The offer',
    value: 'The new weekend collection',
    title: 'Be clear about what you are asking.',
    copy: 'Name what is being promoted and what a reader should do next, so five channels do not end up making five different requests.',
  },
  {
    name: 'The angles',
    value: 'Ritual, material, gifting',
    title: 'Several ways into the same story.',
    copy: 'Explore different angles side by side, keep the ones that sound like you and throw the rest away without ceremony.',
  },
  {
    name: 'The plan',
    value: 'Four channels, one week',
    title: 'Put it in order.',
    copy: 'See what goes where and when before anything is written in full. Move it around while moving it is still easy.',
  },
] as const;

export const channels = [
  {
    id: 'ads',
    name: 'Ads',
    title: 'Headlines with a reason to exist.',
    copy: 'Ad copy and creative briefs built from the campaign idea, ready for a designer or your own hands.',
    backdrop: 'ripple-tide',
  },
  {
    id: 'social',
    name: 'Social',
    title: 'Posts that belong to a plan.',
    copy: 'Captions and content plans shaped for the format, still telling the same story as the launch.',
    backdrop: 'forms-veil',
  },
  {
    id: 'email',
    name: 'Email',
    title: 'Letters people already agreed to read.',
    copy: 'Launch emails and newsletters written around your offer, with the subject line treated as part of the job.',
    backdrop: 'dots-swell',
  },
  {
    id: 'search',
    name: 'Search',
    title: 'Answers to what people are asking.',
    copy: 'Search-focused article outlines that connect the questions customers ask with the things you actually know.',
    backdrop: 'ripple-drift',
  },
] as const;

export const voiceSamples = [
  {
    id: 'post',
    name: 'Social post',
    generic: 'Elevate your mornings with our premium new collection. Shop now and transform your weekend routine today!',
    voice: 'Nobody ever wished Saturday went faster. The weekend edit is here, and it is in no hurry either.',
  },
  {
    id: 'subject',
    name: 'Email subject',
    generic: 'Do not miss out: our exciting new collection just dropped!',
    voice: 'Put the kettle on. We made you something.',
  },
  {
    id: 'ad',
    name: 'Ad headline',
    generic: 'Premium home essentials for the modern lifestyle.',
    voice: 'Slower mornings start here.',
  },
] as const;

export const week = [
  {
    day: 'Monday',
    title: 'You mention the launch.',
    copy: 'A new collection, a date and a rough sense of who it is for. That is enough to begin.',
  },
  {
    day: 'Tuesday',
    title: 'The idea comes back to you.',
    copy: 'A campaign direction and a channel plan, written against what Austi already knows about the brand.',
  },
  {
    day: 'Wednesday',
    title: 'Drafts arrive together.',
    copy: 'Ads, posts, an email and a search outline, all on the same page and all making the same promise.',
  },
  {
    day: 'Thursday',
    title: 'You change your mind about the opening line.',
    copy: 'Rewrite it, say why, and ask for another pass. Your note carries across the rest of the campaign.',
  },
  {
    day: 'Friday',
    title: 'You decide what is ready.',
    copy: 'Approve what fits, hold what does not, and take the finished work to your channels.',
  },
] as const;

export const boundaries = [
  {
    title: 'It will not publish without you.',
    copy: 'A draft is a draft until you say otherwise. There is no setting on this page that changes that.',
    backdrop: 'ripple-fold',
  },
  {
    title: 'It will not spend your money.',
    copy: 'Budgets, bids and paid spend stay with you. Austi writes the ad. You decide whether it runs.',
    backdrop: 'forms-arc',
  },
  {
    title: 'It will not make things up about your product.',
    copy: 'Claims should come from your own material, and you check them before anything is used.',
    backdrop: 'dots-field',
  },
  {
    title: 'It will not pretend to be finished.',
    copy: 'Austi is in development. Pricing has not been set, integrations are still being chosen, and early conversations shape both.',
    backdrop: 'forms-dune',
  },
] as const;

export const audiences = [
  {
    name: 'Founders',
    copy: 'You are the head of marketing, among other things, and the launch is on Thursday.',
    backdrop: 'ripple-hero',
  },
  {
    name: 'Independent businesses',
    copy: 'You have a loyal following and a very long list of things that are not marketing.',
    backdrop: 'forms-veil',
  },
  {
    name: 'Small marketing teams',
    copy: 'You have good ideas and four channels that all want something different by Friday.',
    backdrop: 'dots-swell',
  },
] as const;

export const accessChannels = ['Ads', 'Social', 'Email', 'Search'] as const;

export const chapters = [
  { id: 'top', name: 'Intro' },
  { id: 'learn', name: 'Learn' },
  { id: 'plan', name: 'Plan' },
  { id: 'create', name: 'Create' },
  { id: 'voice', name: 'Voice' },
  { id: 'review', name: 'Review' },
  { id: 'everywhere', name: 'Everywhere' },
  { id: 'week', name: 'A week' },
  { id: 'limits', name: 'Limits' },
  { id: 'audience', name: 'Who for' },
  { id: 'access', name: 'Access' },
  { id: 'faq', name: 'FAQ' },
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
      'The planned workspace brings together ad copy and creative briefs, social captions and content plans, launch emails and newsletters, and search-focused article outlines.',
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
