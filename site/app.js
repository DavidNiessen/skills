const search = document.querySelector('#search');
const rows = [...document.querySelectorAll('.skill')];
const filters = [...document.querySelectorAll('[data-category-filter]')];
let category = 'all';
document.querySelectorAll('[data-enhance]').forEach(element => { element.hidden = false; });
function filterSkills() {
  const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const row of rows) {
    row.hidden = !(category === 'all' || row.dataset.category === category) || !words.every(word => row.dataset.search.includes(word));
    if (!row.hidden) count++;
  }
  document.querySelector('#empty').hidden = count > 0;
  document.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'skill' : 'skills'}`;
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.categoryFilter === category)));
}
search.addEventListener('input', filterSkills);
filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.categoryFilter; filterSkills(); }));
document.querySelector('#clear-search').addEventListener('click', () => { search.value = ''; category = 'all'; filterSkills(); search.focus(); });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); search.focus(); }
  if (event.key === 'Escape' && document.activeElement === search) { search.value = ''; filterSkills(); search.blur(); }
});
let toastTimer;
function announce(message) {
  const toast = document.querySelector('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(button.dataset.copy);
    announce('Install command copied');
  } catch { announce('Copy unavailable. Select and copy the command above.'); }
  finally { button.disabled = false; }
}));
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
  document.querySelector('.install-panel').classList.add('tabs-ready');
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
