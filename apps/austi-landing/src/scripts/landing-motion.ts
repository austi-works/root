import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ALLOW_MOTION = '(prefers-reduced-motion: no-preference)';
const root = document.documentElement;
const motionAllowed = () => window.matchMedia(ALLOW_MOTION).matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

const one = <T extends HTMLElement = HTMLElement>(selector: string, scope: ParentNode = document) =>
  scope.querySelector<T>(selector);
const all = <T extends HTMLElement = HTMLElement>(selector: string, scope: ParentNode = document) => [
  ...scope.querySelectorAll<T>(selector),
];

/** A timeline scrubbed across a tall section whose stage is sticky. */
const scene = (trigger: Element, vars: ScrollTrigger.Vars = {}) =>
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.4,
      invalidateOnRefresh: true,
      ...vars,
    },
  });

/* Scenes */

const heroScene = () => {
  const hero = one('[data-hero]');
  const stage = one('[data-hero-stage]');
  const intro = one('[data-hero-intro]');
  const frame = one('[data-hero-frame]');
  const mock = one('[data-hero-mock]');
  const dim = one('[data-hero-dim]');
  const media = frame && one('[data-frame-media]', frame);
  if (!hero || !stage || !intro || !frame || !mock || !dim || !media) return;

  const clipTop = () => Math.min(intro.offsetTop + intro.offsetHeight + 16, stage.clientHeight * 0.8);

  scene(hero)
    .fromTo(
      frame,
      { '--clip-top': () => `${clipTop()}px`, '--clip-x': () => `${intro.offsetLeft}px`, '--clip-r': '8px' },
      { '--clip-top': '0px', '--clip-x': '0px', '--clip-r': '0px', duration: 5 },
      0,
    )
    .fromTo(media, { scale: 1.18 }, { scale: 1, duration: 5 }, 0)
    .fromTo(
      mock,
      { y: () => clipTop() + stage.clientHeight * 0.05 - mock.offsetTop, scale: 0.92 },
      { y: 0, scale: 1, duration: 5 },
      0,
    )
    .to(intro, { y: -140, autoAlpha: 0, duration: 2.2 }, 0.2)
    .fromTo(
      all('[data-hero-tag]', frame),
      { autoAlpha: 0, y: 36 },
      { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.35 },
      4.4,
    )
    .to(mock, { scale: 0.95, y: -48, duration: 2 }, 8)
    .to(dim, { opacity: 1, duration: 2 }, 8);
};

const heroSpotlight = () => {
  const hero = one('[data-hero]');
  const spot = one('[data-hero-spot]');
  if (!hero || !spot) return;
  const travel = () => hero.offsetHeight - window.innerHeight;
  ScrollTrigger.create({
    start: () => hero.offsetTop + travel() * 0.56,
    end: () => hero.offsetTop + travel() * 0.84,
    onToggle: (self) => {
      if (self.isActive) spot.dataset.spotRegion = 'approvals';
      else delete spot.dataset.spotRegion;
      aimSpot(spot);
    },
  });
};

const statementScene = () => {
  const statement = one('[data-statement]');
  if (!statement) return;
  scene(statement).to(all('[data-word]', statement), {
    opacity: 1,
    duration: 1,
    stagger: 0.42,
  });
};

const horizontalScene = () => {
  const section = one('[data-horizontal]');
  const track = one('[data-horizontal-track]');
  const bar = one('[data-horizontal-bar]');
  const count = one('[data-horizontal-count]');
  if (!section || !track) return;

  const distance = () => Math.max(track.scrollWidth - window.innerWidth, 0);
  const setHeight = () => {
    section.style.height = `${window.innerHeight + distance()}px`;
  };
  setHeight();
  ScrollTrigger.addEventListener('refreshInit', setHeight);

  const panels = all('[data-horizontal-panel]', track);
  const slide = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (bar) bar.style.transform = `scaleX(${self.progress})`;
        if (count) {
          const current = Math.min(Math.floor(self.progress * panels.length) + 1, panels.length);
          count.textContent = String(current).padStart(2, '0');
        }
      },
    },
  });

  panels.forEach((panel) => {
    const media = one('[data-frame-media]', panel);
    if (!media) return;
    gsap.fromTo(
      media,
      { xPercent: -5 },
      {
        xPercent: 5,
        ease: 'none',
        scrollTrigger: { containerAnimation: slide, trigger: panel, start: 'left right', end: 'right left', scrub: true },
      },
    );
  });

  return () => {
    ScrollTrigger.removeEventListener('refreshInit', setHeight);
    section.style.removeProperty('height');
  };
};

const irisScene = () => {
  const iris = one('[data-iris]');
  const paper = one('[data-iris-paper]');
  if (!iris || !paper) return;
  const titles = all('[data-iris-title]', iris);
  scene(iris)
    .fromTo(titles, { scale: 0.9 }, { scale: 1.04, duration: 10 }, 0)
    .fromTo(paper, { '--iris': 0 }, { '--iris': 125, duration: 7, ease: 'power1.in' }, 2);
};

const curtainScene = () => {
  const run = one('[data-paper-run]');
  const curtain = one('[data-curtain]');
  if (!run || !curtain) return;
  const stick = () => {
    run.style.top = `${Math.min(window.innerHeight - run.offsetHeight, 0)}px`;
  };
  stick();
  ScrollTrigger.addEventListener('refreshInit', stick);
  gsap.fromTo(
    run,
    { scale: 1 },
    {
      scale: 0.93,
      ease: 'none',
      transformOrigin: '50% 100%',
      scrollTrigger: { trigger: curtain, start: 'top bottom', end: 'top top', scrub: true },
    },
  );
  return () => ScrollTrigger.removeEventListener('refreshInit', stick);
};

const planetScene = () => {
  const planet = one('[data-planet]');
  const body = one('[data-planet-body]');
  const ring = one('[data-planet-ring]');
  const first = one('[data-planet-first]');
  const second = one('[data-planet-second]');
  if (!planet || !body || !ring || !first || !second) return;
  const labels = all('[data-planet-label]', ring);

  scene(planet)
    .fromTo(body, { scale: 0.34 }, { scale: 1, duration: 4, ease: 'power1.out' }, 0)
    .fromTo(first, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.3)
    .to(first, { autoAlpha: 0, y: -40, duration: 1 }, 3.2)
    .fromTo(ring, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 1.6 }, 2.6)
    .fromTo(ring, { rotation: -40 }, { rotation: 60, duration: 6 }, 2.6)
    .fromTo(labels, { rotation: 40 }, { rotation: -60, duration: 6 }, 2.6)
    .fromTo(second, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1 }, 4.2)
    .to(second, { autoAlpha: 0, scale: 1.3, duration: 1 }, 7.2)
    .to(ring, { autoAlpha: 0, scale: 1.7, duration: 1.1 }, 7.2)
    .to(body, { scale: 4.2, duration: 2.8, ease: 'power2.in' }, 7.2)
    .to(body, { opacity: 0, duration: 0.9 }, 9.1);
};

const weekScene = () => {
  const list = one('[data-week]');
  const line = one('[data-week-line]');
  if (!list || !line) return;
  gsap.fromTo(
    line,
    { scaleY: 0 },
    { scaleY: 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 55%', end: 'bottom 55%', scrub: 0.3 } },
  );
  all('[data-week-item]', list).forEach((item) => {
    ScrollTrigger.create({
      trigger: item,
      start: 'top 55%',
      onEnter: () => item.classList.add('is-on'),
      onLeaveBack: () => item.classList.remove('is-on'),
    });
  });
};

const stackScene = () => {
  const cards = all('[data-stack-card]');
  cards.slice(0, -1).forEach((card, index) => {
    const next = cards[index + 1];
    const inner = one('[data-frame]', card);
    if (!next || !inner) return;
    // GSAP reads an unset filter as brightness(0), so the starting value must be explicit.
    gsap.fromTo(
      inner,
      { scale: 1, filter: 'brightness(1)' },
      {
        scale: 0.93,
        filter: 'brightness(0.55)',
        ease: 'none',
        scrollTrigger: { trigger: next, start: 'top 75%', end: 'top 15%', scrub: true },
      },
    );
  });
};

const closingScene = () => {
  const closing = one('[data-closing]');
  const frame = one('[data-closing-frame]');
  const copy = one('[data-closing-copy]');
  if (!closing || !frame || !copy) return;
  const media = one('[data-frame-media]', frame);
  scene(closing)
    .fromTo(
      frame,
      { '--clip-y': '22svh', '--clip-x': '26vw', '--clip-r': '8px' },
      { '--clip-y': '0svh', '--clip-x': '0vw', '--clip-r': '0px', duration: 6 },
      0,
    )
    .fromTo(media, { scale: 1.3 }, { scale: 1, duration: 6 }, 0)
    .fromTo(copy, { autoAlpha: 0, y: 60, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 3 }, 3.4);
};

/* Ambient scroll depth */

const SCENE_FRAMES = '[data-horizontal], .hero-frame, .closing-frame';

const frameDepth = () => {
  all('[data-frame]').forEach((frame) => {
    if (frame.matches(SCENE_FRAMES) || frame.closest(SCENE_FRAMES)) return;
    const media = one('[data-frame-media]', frame);
    if (!media) return;
    gsap.fromTo(
      media,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
};

const floatingDepth = () => {
  all('[data-float]').forEach((element) => {
    const travel = Number(element.dataset.float ?? 80);
    gsap.fromTo(
      element,
      { y: travel },
      {
        y: -travel,
        ease: 'none',
        scrollTrigger: {
          trigger: element.closest('section') ?? element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      },
    );
  });
};

const marqueeVelocity = () => {
  all('[data-marquee]').forEach((track) => {
    const drift = gsap.to(track, { xPercent: -50, duration: 46, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      trigger: track,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const boost = Math.min(Math.abs(self.getVelocity()) / 260, 7);
        gsap.to(drift, {
          timeScale: 1 + boost,
          duration: 0.2,
          overwrite: true,
          onComplete: () => void gsap.to(drift, { timeScale: 1, duration: 0.9 }),
        });
      },
    });
  });
};

const compareSweep = () => {
  const input = one<HTMLInputElement>('[data-compare-input]');
  if (!input) return;
  const value = { current: Number(input.value) };
  const apply = () => {
    input.value = String(value.current);
    input.dispatchEvent(new Event('input'));
  };
  const sweep = gsap
    .timeline({ paused: true })
    .to(value, { current: 34, duration: 1.1, ease: 'power2.inOut', onUpdate: apply })
    .to(value, { current: 50, duration: 1.2, ease: 'power2.inOut', onUpdate: apply });
  const trigger = ScrollTrigger.create({ trigger: input, start: 'top 72%', once: true, onEnter: () => void sweep.play() });
  // A person reaching for the slider always wins over the demonstration.
  const stop = () => {
    sweep.kill();
    trigger.kill();
  };
  input.addEventListener('pointerdown', stop, { once: true });
  input.addEventListener('keydown', stop, { once: true });
};

const media = gsap.matchMedia();

media.add(ALLOW_MOTION, () => {
  heroScene();
  heroSpotlight();
  statementScene();
  irisScene();
  const releaseCurtain = curtainScene();
  planetScene();
  weekScene();
  stackScene();
  closingScene();
  frameDepth();
  floatingDepth();
  marqueeVelocity();
  compareSweep();
  return releaseCurtain;
});

media.add(`${ALLOW_MOTION} and (min-width: 900px)`, horizontalScene);

/* Reveal once, as content arrives. */

const revealOnce = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target as HTMLElement;
      element.classList.add(element.matches('[data-frame]') ? 'is-live' : 'is-in');
      revealOnce.unobserve(element);
    });
  },
  { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
);
all('[data-reveal]').forEach((element) => revealOnce.observe(element));
all('[data-frame]').forEach((frame) => revealOnce.observe(frame));

/* Spotlight: frame one region of the full interface and let the rest fall into shadow. */

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

const positionIn = (element: HTMLElement, canvas: HTMLElement) => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== canvas) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, width: element.offsetWidth, height: element.offsetHeight };
};

const aimSpot = (spot: HTMLElement) => {
  const canvas = one('[data-spot-canvas]', spot);
  const hole = one('[data-spot-hole]', spot);
  if (!canvas || !hole) return;

  const hostWidth = spot.clientWidth;
  const hostHeight = spot.clientHeight;
  if (!hostWidth || !hostHeight) return;

  const narrow = hostWidth < 560;
  const name = (narrow && spot.dataset.spotMobile) || spot.dataset.spotRegion;
  const region = name ? one(`[data-region="${name}"]`, canvas) : null;
  const box = region ? positionIn(region, canvas) : null;
  const still = spot.hasAttribute('data-spot-still') && !(narrow && spot.dataset.spotMobile);
  // A zoomed view is a slice of the app: lit region, a band of shadowed context, then the backdrop.
  const zoomed = box && !still;
  const band = zoomed ? (narrow ? 26 : 64) : 0;
  const gap = zoomed ? (narrow ? 12 : 30) : 0;
  const view = zoomed ? box : { x: 0, y: 0, width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
  const scale = Math.min(
    (hostWidth - gap * 2) / (view.width + band * 2),
    (hostHeight - gap * 2) / (view.height + band * 2),
    1.2,
  );
  const left = (hostWidth - view.width * scale) / 2 - view.x * scale;
  const top = (hostHeight - view.height * scale) / 2 - view.y * scale;
  canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  const cropTop = Math.max(view.y - band, 0);
  const cropLeft = Math.max(view.x - band, 0);
  const cropBottom = Math.max(DESIGN_HEIGHT - (view.y + view.height + band), 0);
  const cropRight = Math.max(DESIGN_WIDTH - (view.x + view.width + band), 0);
  canvas.style.clipPath = zoomed
    ? `inset(${cropTop}px ${cropRight}px ${cropBottom}px ${cropLeft}px round 16px)`
    : 'inset(0px 0px 0px 0px round 16px)';

  const lit = box && !(narrow && still);
  hole.style.opacity = lit ? '1' : '0';
  if (box) {
    const bleed = 6;
    hole.style.left = `${box.x - bleed}px`;
    hole.style.top = `${box.y - bleed}px`;
    hole.style.width = `${box.width + bleed * 2}px`;
    hole.style.height = `${box.height + bleed * 2}px`;
  }
};

const spots = all('[data-spot]');
const measureSpots = new ResizeObserver((entries) => {
  entries.forEach((entry) => aimSpot(entry.target as HTMLElement));
});
spots.forEach((spot) => {
  aimSpot(spot);
  measureSpots.observe(spot);
});

/* Normal-flow steps drive whatever is floating beside them. */

const stepLine = () => (window.innerWidth < 900 ? '66%' : 'center');

all('[data-steps]').forEach((group) => {
  const steps = all('[data-step]', group);
  const follower = one('[data-spot-follow]', group);
  const marks = all('[data-progress-item]', group);

  const activate = (active: number) => {
    const stateOf = (index: number) => (index < active ? 'done' : index === active ? 'active' : 'next');
    steps.forEach((step, index) => (step.dataset.state = stateOf(index)));
    marks.forEach((mark, index) => (mark.dataset.state = stateOf(index)));
    const region = steps[active]?.dataset.region;
    if (follower && region && follower.dataset.spotRegion !== region) {
      follower.dataset.spotRegion = region;
      aimSpot(follower);
    }
  };

  activate(0);
  steps.forEach((step, index) => {
    ScrollTrigger.create({
      trigger: step,
      // On phones the frame floats over the top half, so steps change lower down.
      start: () => `top ${stepLine()}`,
      end: () => `bottom ${stepLine()}`,
      onToggle: (self) => {
        if (self.isActive) activate(index);
      },
    });
  });
});

/* Chrome: progress line, header CTA, active chapter. */

const progress = one('[data-scroll-progress]');
if (progress) {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      progress.style.transform = `scaleX(${self.progress})`;
    },
  });
}

const header = one('[data-site-header]');
if (header) {
  ScrollTrigger.create({
    start: 12,
    end: 'max',
    onToggle: (self) => header.toggleAttribute('data-scrolled', self.isActive),
  });
}

const navPill = one('[data-nav-pill]');
const moveNavPill = (chapter: string) => {
  if (!navPill) return;
  const link = one(`[data-nav-link="${chapter}"]`);
  navPill.style.opacity = link ? '1' : '0';
  if (!link) return;
  navPill.style.width = `${link.offsetWidth}px`;
  navPill.style.transform = `translateX(${link.offsetLeft}px)`;
};

const setChapter = (id: string) => {
  all('[data-chapter-link]').forEach((link) => {
    const current = link.dataset.chapterLink === id;
    link.classList.toggle('is-active', current);
    if (current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  moveNavPill(id);
};

all('[data-chapter-link]').forEach((link) => {
  const chapter = document.getElementById(link.dataset.chapterLink ?? '');
  if (!chapter) return;
  ScrollTrigger.create({
    trigger: chapter,
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => {
      if (self.isActive) setChapter(link.dataset.chapterLink ?? '');
    },
  });
});

/* Pointer microinteractions. */

if (finePointer.matches) {
  all('[data-frame]').forEach((frame) => {
    let queued: PointerEvent | undefined;
    const paint = () => {
      if (!queued) return;
      const box = frame.getBoundingClientRect();
      const x = (queued.clientX - box.left) / box.width;
      const y = (queued.clientY - box.top) / box.height;
      frame.style.setProperty('--gx', `${x * 100}%`);
      frame.style.setProperty('--gy', `${y * 100}%`);
      if (motionAllowed()) {
        frame.style.setProperty('--px', (x * 2 - 1).toFixed(3));
        frame.style.setProperty('--py', (y * 2 - 1).toFixed(3));
      }
      queued = undefined;
    };
    frame.addEventListener('pointermove', (event) => {
      if (!queued) requestAnimationFrame(paint);
      queued = event;
    });
    frame.addEventListener('pointerleave', () => {
      frame.style.setProperty('--px', '0');
      frame.style.setProperty('--py', '0');
    });
  });

  all('[data-magnetic]').forEach((element) => {
    const moveX = gsap.quickTo(element, 'x', { duration: 0.5, ease: 'power3.out' });
    const moveY = gsap.quickTo(element, 'y', { duration: 0.5, ease: 'power3.out' });
    element.addEventListener('pointermove', (event) => {
      if (!motionAllowed()) return;
      const box = element.getBoundingClientRect();
      moveX((event.clientX - box.left - box.width / 2) * 0.16);
      moveY((event.clientY - box.top - box.height / 2) * 0.3);
    });
    element.addEventListener('pointerleave', () => {
      moveX(0);
      moveY(0);
    });
  });

  const follower = one('[data-follow]');
  const followList = one('[data-follow-list]');
  if (follower && followList) {
    const moveX = gsap.quickTo(follower, 'x', { duration: 0.55, ease: 'power3.out' });
    const moveY = gsap.quickTo(follower, 'y', { duration: 0.55, ease: 'power3.out' });
    const images = all('[data-follow-image]', follower);

    followList.addEventListener('pointermove', (event) => {
      moveX(event.clientX);
      moveY(event.clientY);
    });
    followList.addEventListener('pointerleave', () => follower.classList.remove('is-on'));
    all('[data-follow-row]', followList).forEach((row, index) => {
      row.addEventListener('pointerenter', () => {
        follower.classList.add('is-on');
        images.forEach((image, imageIndex) => image.classList.toggle('is-on', imageIndex === index));
      });
    });
  }
}

/* Images and fonts change layout, so measure the scenes again once they settle. */
window.addEventListener('load', () => {
  ScrollTrigger.refresh();
  spots.forEach(aimSpot);
});
void document.fonts?.ready.then(() => ScrollTrigger.refresh());

root.dataset.motionReady = 'true';
