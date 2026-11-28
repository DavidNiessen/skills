const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const calm = () => reducedMotion.matches;
document.querySelectorAll('[data-enhance]').forEach(element => { element.hidden = false; });

/* ---------- Theme ---------- */
const themeToggle = document.querySelector('#theme-toggle');
const currentTheme = () => root.dataset.theme || (darkScheme.matches ? 'dark' : 'light');
function labelThemeToggle() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${next} mode`);
  const color = getComputedStyle(root).getPropertyValue('--paper').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', color));
}
themeToggle.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  const apply = () => {
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
    labelThemeToggle();
  };
  if (!document.startViewTransition || calm()) return apply();
  const box = themeToggle.getBoundingClientRect();
  const x = box.left + box.width / 2, y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.startViewTransition(apply).ready.then(() => {
    root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
});
darkScheme.addEventListener('change', labelThemeToggle);
labelThemeToggle();

/* ---------- Reveal on scroll ---------- */
const revealables = [...document.querySelectorAll('[data-reveal]')];
const collection = document.querySelector('#collection');
if ('IntersectionObserver' in window && !calm()) {
  root.classList.add('reveal-ready');
  const observer = new IntersectionObserver(entries => {
    const entering = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
    entering.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index, 6) * 70}ms`;
      element.classList.add('in');
      observer.unobserve(element);
      setTimeout(() => { element.style.transitionDelay = ''; }, 1400);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  revealables.forEach(element => observer.observe(element));
  const countObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { collection.classList.add('in-view'); countObserver.disconnect(); } }, { threshold: .1 });
  countObserver.observe(collection);
} else {
  revealables.forEach(element => element.classList.add('in'));
  collection.classList.add('in-view');
}

/* ---------- Search and filters ---------- */
const search = document.querySelector('#search');
const rows = [...document.querySelectorAll('.skill')];
const filters = [...document.querySelectorAll('[data-category-filter]')];
const spring = 'cubic-bezier(.34,1.56,.64,1)';
let category = 'all';
function filterSkills() {
  const before = new Map(rows.filter(row => !row.hidden).map(row => [row, row.getBoundingClientRect()]));
  const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const row of rows) {
    row.hidden = !(category === 'all' || row.dataset.category === category) || !words.every(word => row.dataset.search.includes(word));
    if (!row.hidden) count++;
  }
  document.querySelector('#empty').hidden = count > 0;
  document.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'skill' : 'skills'}`;
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.categoryFilter === category)));
  if (calm()) return;
  rows.filter(row => !row.hidden).forEach((row, index) => {
    row.classList.add('in');
    const first = before.get(row);
    if (!first) {
      row.animate([{ opacity: 0, scale: .7, rotate: '-8deg' }, { opacity: 1, scale: 1, rotate: '0deg' }], { duration: 520, delay: index * 40, easing: spring, fill: 'backwards' });
      return;
    }
    const last = row.getBoundingClientRect();
    const dx = first.left - last.left, dy = first.top - last.top;
    if (dx || dy) row.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 560, easing: spring });
  });
}
search.addEventListener('input', filterSkills);
filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.categoryFilter; filterSkills(); }));
document.querySelector('#clear-search').addEventListener('click', () => { search.value = ''; category = 'all'; filterSkills(); search.focus(); });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); search.focus(); }
  if (event.key === 'Escape' && document.activeElement === search) { search.value = ''; filterSkills(); search.blur(); }
});

/* ---------- Copy, toast and confetti ---------- */
let toastTimer;
function announce(message) {
  const toast = document.querySelector('#toast');
  clearTimeout(toastTimer);
  toast.classList.remove('visible');
  toast.textContent = message;
  void toast.offsetWidth;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}
const confettiColors = ['--tone-0', '--tone-1', '--tone-2', '--tone-3', '--tone-all'];
function burst(element) {
  if (calm()) return;
  const box = element.getBoundingClientRect();
  const x = box.left + box.width / 2, y = box.top + box.height / 2;
  const style = getComputedStyle(root);
  for (let index = 0; index < 18; index++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.setAttribute('aria-hidden', 'true');
    const size = 7 + Math.random() * 7;
    Object.assign(piece.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size * (index % 3 === 0 ? 1 : 1.5)}px`, background: style.getPropertyValue(confettiColors[index % confettiColors.length]), borderRadius: index % 4 === 0 ? '50%' : '2px' });
    document.body.append(piece);
    const angle = Math.random() * Math.PI * 2, distance = 50 + Math.random() * 90;
    const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance - 50;
    const spin = (Math.random() - .5) * 720;
    piece.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin / 2}deg)`, opacity: 1, offset: .45 },
      { transform: `translate(calc(-50% + ${dx * 1.25}px), calc(-50% + ${dy + 140}px)) rotate(${spin}deg)`, opacity: 0 }
    ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' }).finished.then(() => piece.remove(), () => piece.remove());
  }
}
const cheers = ['Copied! Paste it in your terminal.', 'Copied — nice pick!', 'Got it! Command copied.'];
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(button.dataset.copy);
    button.classList.add('copied');
    burst(button);
    announce(cheers[Math.floor(Math.random() * cheers.length)]);
    setTimeout(() => button.classList.remove('copied'), 1800);
  } catch { announce('Copy unavailable. Select and copy the command.'); }
  finally { button.disabled = false; }
}));

/* ---------- Install tabs ---------- */
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus = false) {
  for (const other of tabs) {
    const selected = other === tab;
    other.setAttribute('aria-selected', String(selected));
    other.tabIndex = selected ? 0 : -1;
    document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
  try { localStorage.setItem('install-method', tab.id); } catch {}
}
if (tabs.length) {
  document.querySelector('.notebook').classList.add('tabs-ready');
  let saved = null;
  try { saved = localStorage.getItem('install-method'); } catch {}
  selectTab(tabs.find(tab => tab.id === saved) ?? tabs[0]);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[(next + tabs.length) % tabs.length], true);
    });
  });
}

/* ---------- Card tilt ---------- */
rows.forEach(card => {
  card.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || calm()) return;
    const box = card.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - .5, py = (event.clientY - box.top) / box.height - .5;
    card.classList.add('tilting');
    card.style.setProperty('--ry', `${px * 7}deg`);
    card.style.setProperty('--rx', `${py * -7}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.classList.remove('tilting');
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
  });
});

/* ---------- Penny the pencil ---------- */
const mascot = document.querySelector('#mascot');
const bubble = document.querySelector('#bubble');
const eyes = [...mascot.querySelectorAll('.m-eye')];
const pupils = [...mascot.querySelectorAll('.m-pupil')];
const glints = [...mascot.querySelectorAll('.m-glint')];
let lookFrame = 0, pointer = null;
function look() {
  lookFrame = 0;
  if (!pointer) return;
  eyes.forEach((eye, index) => {
    const box = eye.getBoundingClientRect();
    const dx = pointer.x - (box.left + box.width / 2), dy = pointer.y - (box.top + box.height / 2);
    const distance = Math.hypot(dx, dy) || 1, reach = Math.min(5, distance / 30);
    const offset = `translate(${(dx / distance) * reach}px, ${(dy / distance) * reach}px)`;
    pupils[index].style.transform = offset;
    glints[index].style.transform = offset;
  });
}
addEventListener('pointermove', event => {
  pointer = { x: event.clientX, y: event.clientY };
  if (!lookFrame) lookFrame = requestAnimationFrame(look);
}, { passive: true });
(function blink() {
  setTimeout(() => {
    if (!calm()) { mascot.classList.add('blink'); setTimeout(() => mascot.classList.remove('blink'), 140); }
    blink();
  }, 2500 + Math.random() * 3500);
})();
const tips = [
  'Press / anywhere to jump to search.',
  'Psst — the sun or moon up top flips the lights.',
  'Each card has its own install commands inside.',
  'Add the marketplace once, then pick a plugin.',
  'Every skill is plain Markdown. Read the source!',
  'Hey, that tickles!',
  'Try wiggling your mouse over the cards.',
  'Copy a command for a little party.'
];
let tip = -1;
mascot.addEventListener('click', () => {
  tip = (tip + 1) % tips.length;
  bubble.textContent = tips[tip];
  bubble.classList.remove('say');
  mascot.classList.remove('poked');
  void mascot.offsetWidth;
  bubble.classList.add('say');
  mascot.classList.add('poked');
  burst(mascot);
});
mascot.addEventListener('animationend', event => { if (event.animationName === 'hop') mascot.classList.remove('poked'); });

/* ---------- Hero: parallax doodles and pencil trail ---------- */
const hero = document.querySelector('.hero');
const canvas = hero.querySelector('.trail');
const context = canvas.getContext('2d');
let points = [], trailFrame = 0, parallaxFrame = 0;
function sizeCanvas() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = hero.clientWidth * ratio;
  canvas.height = hero.clientHeight * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function drawTrail() {
  const now = performance.now(), life = 900;
  points = points.filter(point => now - point.t < life);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = getComputedStyle(root).getPropertyValue('--trail');
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index];
    if (b.t - a.t > 80) continue;
    const age = 1 - (now - b.t) / life;
    context.globalAlpha = age * .55;
    context.lineWidth = 1.5 + age * 3;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    context.lineTo(b.x, b.y);
    context.stroke();
  }
  trailFrame = points.length ? requestAnimationFrame(drawTrail) : 0;
}
if (finePointer.matches) {
  sizeCanvas();
  new ResizeObserver(sizeCanvas).observe(hero);
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || calm()) return;
    const box = hero.getBoundingClientRect();
    points.push({ x: event.clientX - box.left, y: event.clientY - box.top, t: performance.now() });
    if (!trailFrame) trailFrame = requestAnimationFrame(drawTrail);
    if (!parallaxFrame) parallaxFrame = requestAnimationFrame(() => {
      parallaxFrame = 0;
      hero.style.setProperty('--px', ((event.clientX - box.left) / box.width - .5).toFixed(3));
      hero.style.setProperty('--py', ((event.clientY - box.top) / box.height - .5).toFixed(3));
    });
  });
}
