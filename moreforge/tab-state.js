'use strict';
// Restore the section before showing it, independently of wallet and chain reads.
document.documentElement.setAttribute('data-more-tab-pending', '');
window.moreForgeTabs = (() => {
  const keys = new Set(['build', 'buy', 'pools', 'rewards', 'burns']);
  function select(requested, updateUrl = true) {
    const key = keys.has(requested) ? requested : 'build';
    document.querySelectorAll('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === key;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      button.id = 'tab-' + button.dataset.tab;
      button.setAttribute('aria-controls', 'panel-' + button.dataset.tab);
    });
    document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
      panel.hidden = panel.id !== 'panel-' + key;
      panel.setAttribute('aria-labelledby', panel.id.replace('panel-', 'tab-'));
    });
    for (const element of document.querySelectorAll('.hero, .burn-summary')) {
      element.hidden = key !== 'build';
    }
    if (updateUrl) {
      history.replaceState(null, '', '#' + key);
      const navigation = document.querySelector('.tabs');
      const destination = document.querySelector(key === 'build' ? '.hero' : '#panel-' + key);
      if (navigation && destination) window.scrollTo({top: Math.max(0, destination.getBoundingClientRect().top + window.scrollY - navigation.getBoundingClientRect().height - 20), behavior: 'instant'});
    }
    document.documentElement.removeAttribute('data-more-tab-pending');
  }
  function restore() {
    select(location.hash.slice(1), false);
    document.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => select(button.dataset.tab);
      button.onkeydown = event => {
        const tabs = [...document.querySelectorAll('[data-tab]')];
        const index = tabs.indexOf(button);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : -1;
        if (next < 0) return;
        event.preventDefault();
        select(tabs[next].dataset.tab);
        tabs[next].focus({preventScroll: true});
      };
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
