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
