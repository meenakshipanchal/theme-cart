/**
 * Auto-Freebie System — Final Production Version
 * Adds/removes free gift products based on cart total.
 * Zero performance impact: all work is async, no blocking.
 */
(function () {
  'use strict';

  var FREEBIES = [
    { threshold: 149900, variantId: '47070925095104' },
    { threshold: 299900, variantId: '47503774187712' }
  ];

  var SECTION_ID = 'cart-drawer';
  var _busy = false;
  var _busyTimer = null;
  var _pendingCart = null;

  /* ── Helpers ─────────────────────────────────────── */

  function lock() {
    _busy = true;
    clearTimeout(_busyTimer);
    _busyTimer = setTimeout(function () { _busy = false; }, 15000);
  }

  function unlock() {
    _busy = false;
    clearTimeout(_busyTimer);
    if (_pendingCart !== null) {
      var cart = _pendingCart;
      _pendingCart = null;
      run(cart);
    }
  }

  function fetchCart() {
    return fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); });
  }

  function addToCart(variantId) {
    return fetch('/cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Number(variantId),
        quantity: 1,
        properties: { _freebie: 'true' },
        sections: SECTION_ID
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('add-fail');
      return r.json();
    });
  }

  function removeFromCart(lineKey) {
    return fetch('/cart/change.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: lineKey,
        quantity: 0,
        sections: SECTION_ID
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('remove-fail');
      return r.json();
    });
  }

  function hideFreebies() {
    var els = document.querySelectorAll('[data-freebie]');
    for (var i = 0; i < els.length; i++) els[i].style.display = 'none';
  }

  function patchDrawer(resp) {
    var html = resp && resp.sections && resp.sections[SECTION_ID];
    if (!html) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var oldD = document.querySelector('#CartDrawer');
    var newD = doc.querySelector('#CartDrawer');
    if (!oldD || !newD) return;

    oldD.innerHTML = newD.innerHTML;

    var el = document.querySelector('cart-drawer');
    var nel = doc.querySelector('cart-drawer');
    if (el && nel) {
      var wasA = el.classList.contains('active');
      var wasAn = el.classList.contains('animate');
      el.className = nel.className;
      if (wasA) el.classList.add('active');
      if (wasAn) el.classList.add('animate');
    }
    var ov = document.querySelector('#CartDrawer-Overlay');
    if (ov && el) ov.addEventListener('click', function () { el.close(); });
  }

  /* ── Main logic ──────────────────────────────────── */

  function run(cartData) {
    if (_busy) {
      _pendingCart = cartData || true;
      return;
    }
    lock();

    var p = (cartData && cartData.items) ? Promise.resolve(cartData) : fetchCart();

    p.then(function (cart) {
      if (!cart || !cart.items || cart.items.length === 0) {
        unlock();
        return;
      }

      var realTotal = 0;
      var freebie = null;

      for (var i = 0; i < cart.items.length; i++) {
        var it = cart.items[i];
        if (it.properties && it.properties._freebie) {
          freebie = it;
        } else {
          realTotal += it.final_line_price;
        }
      }

      // Progress bar — instant
      if (typeof window.updateCartRewards === 'function') {
        window.updateCartRewards(realTotal);
      }

      // Which freebie should be in the cart?
      var target = null;
      for (var j = FREEBIES.length - 1; j >= 0; j--) {
        if (realTotal >= FREEBIES[j].threshold) {
          target = FREEBIES[j];
          break;
        }
      }

      var haveVid = freebie ? String(freebie.variant_id) : null;
      var wantVid = target ? target.variantId : null;

      // Correct freebie already present
      if (haveVid === wantVid) {
        unlock();
        return;
      }

      // Wrong freebie visible → hide instantly
      if (freebie) hideFreebies();

      // Build API chain
      var chain = Promise.resolve();
      var last = null;

      if (freebie && target) {
        // Swap
        chain = chain
          .then(function () { return removeFromCart(freebie.key); })
          .then(function () { return addToCart(target.variantId); })
          .then(function (r) { last = r; });
      } else if (freebie) {
        // Remove only
        chain = chain
          .then(function () { return removeFromCart(freebie.key); })
          .then(function (r) { last = r; });
      } else if (target) {
        // Add only
        chain = chain
          .then(function () { return addToCart(target.variantId); })
          .then(function (r) { last = r; });
      }

      return chain.then(function () {
        if (last) {
          patchDrawer(last);
          if (typeof window.updateCartRewards === 'function') {
            window.updateCartRewards(realTotal);
          }
        }
      });
    })
    .catch(function (e) { console.error('[Freebie]', e); })
    .then(function () { unlock(); });
  }

  /* ── Triggers ────────────────────────────────────── */

  // 1) Page load — works whether DOM is ready or not
  function init() { setTimeout(run, 80); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 2) Cart changes via theme PubSub
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, function (ev) {
      if (ev.source === 'auto-freebie') return;
      var cart = (ev.cartData && ev.cartData.items) ? ev.cartData : null;
      setTimeout(function () { run(cart); }, 0);
    });
  }

  window.manageCartFreebie = run;
})();
