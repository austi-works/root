export {};

type Properties = Record<string, string | number | boolean>;

declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Properties) => void };
  }
}

const SCROLL_MARKS = [25, 50, 75, 100];

const track = (event: string, properties?: Properties) =>
  window.posthog?.capture(event, properties);

const placeOf = (element: Element) => {
  const place = element.closest('section[id], header, footer');
  return place?.id || place?.tagName.toLowerCase() || 'page';
};

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const emailLink = target.closest('a[href^="mailto:"]');
  if (emailLink) track('early_access_clicked', { location: placeOf(emailLink) });
  if (target.closest('[data-copy]')) track('email_copied');

  const voiceTab = target.closest<HTMLElement>('[data-voice-tab]');
  if (voiceTab) track('demo_voice_selected', { sample: voiceTab.dataset.voiceTab ?? '' });

  const reviewAction = target.closest<HTMLElement>('[data-review-action]');
  if (reviewAction) track('demo_review_used', { action: reviewAction.dataset.reviewAction ?? '' });

  const channel = target.closest<HTMLElement>('[data-access-channel]');
  if (channel) track('access_channel_toggled', { channel: channel.dataset.accessChannel ?? '' });
});

// The toggle event does not bubble, so it has to be caught on the way down.
document.addEventListener(
  'toggle',
  (event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.open) return;
    const question = details.querySelector('summary strong')?.textContent?.trim();
    if (question) track('faq_opened', { question });
  },
  true,
);

// A section counts as viewed when it crosses the middle of the screen, however tall it is.
const seenSections = new Set<string>();
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting || seenSections.has(target.id)) return;
      seenSections.add(target.id);
      sectionObserver.unobserve(target);
      track('section_viewed', { section: target.id });
    });
  },
  { rootMargin: '-50% 0px -50% 0px' },
);
document.querySelectorAll('section[id]').forEach((section) => sectionObserver.observe(section));

const pendingMarks = [...SCROLL_MARKS];
const measureScroll = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return;
  const percent = (window.scrollY / scrollable) * 100;
  while (pendingMarks.length && percent >= pendingMarks[0]! - 0.5) {
    track('scroll_depth_reached', { percent: pendingMarks.shift()! });
  }
  if (!pendingMarks.length) window.removeEventListener('scroll', measureScroll);
};
window.addEventListener('scroll', measureScroll, { passive: true });
