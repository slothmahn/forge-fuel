'use strict';
// Restore the section before showing it, independently of wallet and chain reads.
document.documentElement.setAttribute('data-more-tab-pending', '');
window.moreForgeTabs = (() => {
  const keys = new Set(['build', 'buy', 'pools', 'rewards', 'burns']);
  function select(requested, updateUrl = true) {
    const key = keys.has(requested) ? requested : 'build';
    document.querySelectorAll('[data-tab]').forEach(button => {
      button.setAttribute('aria-selected', String(button.dataset.tab === key));
    });
    document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
      panel.hidden = panel.id !== 'panel-' + key;
    });
    for (const element of document.querySelectorAll('.hero, .burn-summary')) {
      element.hidden = key !== 'build';
    }
    if (updateUrl) history.replaceState(null, '', '#' + key);
    document.documentElement.removeAttribute('data-more-tab-pending');
  }
  function restore() {
    select(location.hash.slice(1), false);
    document.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => select(button.dataset.tab);
    });
    const brand = document.querySelector('.more-brand');
    if (brand) brand.onclick = event => {
      event.preventDefault();
      select('buy');
      window.scrollTo({top: 0, behavior: 'instant'});
    };
  }
  window.addEventListener('hashchange', restore);
  return {select, restore};
})();
