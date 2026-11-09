const setPressed = (buttons: HTMLElement[], active: HTMLElement) =>
  buttons.forEach((button) => button.setAttribute('aria-pressed', String(button === active)));

const compare = document.querySelector<HTMLElement>('[data-compare]');

if (compare) {
  const input = compare.querySelector<HTMLInputElement>('[data-compare-input]');
  const tabs = [...document.querySelectorAll<HTMLElement>('[data-voice-tab]')];
  const samples = [...compare.querySelectorAll<HTMLElement>('[data-voice-sample]')];

  input?.addEventListener('input', () => compare.style.setProperty('--split', `${input.value}%`));

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    setPressed(tabs, tab);
    samples.forEach((sample) => {
      sample.hidden = sample.dataset.voiceSample !== tab.dataset.voiceTab;
    });
  }));
}

const review = document.querySelector<HTMLElement>('[data-review]');

if (review) {
  const actions = [...review.querySelectorAll<HTMLButtonElement>('[data-review-action]')];
  const reset = review.querySelector<HTMLButtonElement>('[data-review-reset]');
  const result = review.querySelector<HTMLElement>('[data-review-result]');
  const status = review.querySelector<HTMLElement>('[data-review-status]');
  const outcomes: Record<string, { status: string; result: string }> = {
    approve: { status: 'Approved', result: 'Approved by you. It is ready to take to your channel.' },
    edit: { status: 'In revision', result: 'Your note goes back with the draft for another pass.' },
    hold: { status: 'Held', result: 'On hold. Nothing happens until you come back to it.' },
  };
  const pending = result?.textContent ?? '';

  actions.forEach((button) => button.addEventListener('click', () => {
    const outcome = outcomes[button.dataset.reviewAction ?? ''];
    if (!outcome) return;
    review.dataset.reviewState = button.dataset.reviewAction;
    actions.forEach((action) => (action.disabled = true));
    if (reset) reset.hidden = false;
    if (result) result.textContent = outcome.result;
    if (status) status.textContent = outcome.status;
  }));

  reset?.addEventListener('click', () => {
    review.dataset.reviewState = 'pending';
    actions.forEach((action) => (action.disabled = false));
    reset.hidden = true;
    if (result) result.textContent = pending;
    if (status) status.textContent = 'Needs your review';
    actions[0]?.focus();
  });
}

const accessLink = document.querySelector<HTMLAnchorElement>('[data-access-link]');

if (accessLink) {
  const base = accessLink.href.split('&body=')[0];
  const chips = [...document.querySelectorAll<HTMLButtonElement>('[data-access-channel]')];

  const compose = () => {
    const picked = chips
      .filter((chip) => chip.getAttribute('aria-pressed') === 'true')
      .map((chip) => chip.dataset.accessChannel);
    const body = [
      'My website:',
      '',
      `Channels I use: ${picked.length > 0 ? picked.join(', ') : ''}`,
      '',
      'The marketing task that takes the most time each week:',
      '',
    ].join('\n');
    accessLink.href = `${base}&body=${encodeURIComponent(body)}`;
  };

  chips.forEach((chip) => chip.addEventListener('click', () => {
    chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    compose();
  }));
  compose();
}

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
  const label = button.querySelector<HTMLElement>('[data-copy-label]');
  const original = label?.textContent ?? '';
  let timer = 0;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
    } catch {
      return;
    }
    button.dataset.copied = 'true';
    if (label) label.textContent = 'Copied';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      delete button.dataset.copied;
      if (label) label.textContent = original;
    }, 1800);
  });
});
