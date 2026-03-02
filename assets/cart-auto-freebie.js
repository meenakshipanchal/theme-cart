/**
 * Visual Freebie Card + Progress Bar Updater
 * Lightweight — no Cart API calls. Zero TBT/INP impact.
 */
(function () {
  'use strict';

  var TIERS = [
    { min: 499900, tier: '2' },
    { min: 249900, tier: '1' }
  ];

  function updateFreebie(total) {
    var card = document.getElementById('freebieCard');
    if (!card) return;

    if (total === undefined || total === null) {
      total = parseInt(card.getAttribute('data-cart-total') || '0', 10);
    }

    var activeTier = null;
    for (var i = 0; i < TIERS.length; i++) {
      if (total >= TIERS[i].min) { activeTier = TIERS[i].tier; break; }
    }

    var cards = card.querySelectorAll('.freebie-visual-card');
    var any = false;
    for (var j = 0; j < cards.length; j++) {
      var show = cards[j].getAttribute('data-freebie-tier') === activeTier;
      cards[j].style.display = show ? '' : 'none';
      if (show) any = true;
    }
    card.style.display = any ? '' : 'none';
  }

  function refresh(total) {
    if (total === undefined || total === null) {
      var card = document.getElementById('freebieCard');
      if (card) total = parseInt(card.getAttribute('data-cart-total') || '0', 10);
    }
    if (typeof window.updateCartRewards === 'function') window.updateCartRewards(total);
    updateFreebie(total);
  }

  /* Page load */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { refresh(); });
  } else {
    refresh();
  }

  /* Cart drawer mutations → re-read data-cart-total from freshly rendered HTML */
  var _debounce = null;
  var drawer = document.getElementById('CartDrawer');
  if (drawer) {
    new MutationObserver(function () {
      clearTimeout(_debounce);
      _debounce = setTimeout(function () { refresh(); }, 200);
    }).observe(drawer, { childList: true, subtree: true });
  }

  window.refreshCartExtras = refresh;
})();
