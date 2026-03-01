/**
 * Auto-Freebie System
 * Adds/removes free gift based on cart total.
 */
(function () {
  'use strict';

  var FREEBIES = [
    { threshold: 149900, variantId: '47070925095104' },
    { threshold: 499900, variantId: '47503774187712' }
  ];

  var SECTION = 'cart-drawer';
  var _busy = false;
  var _busyTimer = null;
  var _selfUpdate = false;

  function fetchCart() {
    return fetch('/cart.js', { credentials: 'same-origin' }).then(function (r) { return r.json(); });
  }

  function addToCart(vid) {
    return fetch('/cart/add.js', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(vid), quantity: 1, properties: { _freebie: 'true' }, sections: SECTION })
    }).then(function (r) { if (!r.ok) throw new Error('add'); return r.json(); });
  }

  function removeFromCart(key) {
    return fetch('/cart/change.js', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: 0, sections: SECTION })
    }).then(function (r) { if (!r.ok) throw new Error('rm'); return r.json(); });
  }

  function hideFreebies() {
    var els = document.querySelectorAll('[data-freebie]');
    for (var i = 0; i < els.length; i++) els[i].style.display = 'none';
  }

  function showEmptyCart() {
    var cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) cartDrawer.classList.add('is-empty');
    var cartItems = document.querySelector('cart-drawer-items');
    if (cartItems) cartItems.classList.add('is-empty');
  }

  function patchDrawer(resp) {
    var html = resp && resp.sections && resp.sections[SECTION];
    if (!html) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var oldD = document.querySelector('#CartDrawer');
    var newD = doc.querySelector('#CartDrawer');
    if (!oldD || !newD) return;

    var scroller = oldD.querySelector('.drawer__inner') || oldD;
    var scrollTop = scroller.scrollTop;

    _selfUpdate = true;
    oldD.innerHTML = newD.innerHTML;

    var newScroller = oldD.querySelector('.drawer__inner') || oldD;
    newScroller.scrollTop = scrollTop;

    var el = document.querySelector('cart-drawer');
    var nel = doc.querySelector('cart-drawer');
    if (el && nel) {
      var a = el.classList.contains('active');
      var an = el.classList.contains('animate');
      el.className = nel.className;
      if (a) el.classList.add('active');
      if (an) el.classList.add('animate');
    }

    // Re-bind overlay (remove old first to prevent accumulation)
    var ov = document.querySelector('#CartDrawer-Overlay');
    if (ov && el) {
      var newOv = ov.cloneNode(true);
      ov.parentNode.replaceChild(newOv, ov);
      newOv.addEventListener('click', function () { el.close(); });
    }

    setTimeout(function () { _selfUpdate = false; }, 100);
  }

  function lock() {
    _busy = true;
    clearTimeout(_busyTimer);
    _busyTimer = setTimeout(function () { _busy = false; }, 15000);
  }

  function unlock() {
    _busy = false;
    clearTimeout(_busyTimer);
  }

  function run() {
    if (_busy) return;
    lock();

    fetchCart().then(function (cart) {
      if (!cart || !cart.items || cart.items.length === 0) return;

      var realTotal = 0;
      var freebie = null;
      for (var i = 0; i < cart.items.length; i++) {
        if (cart.items[i].properties && cart.items[i].properties._freebie) {
          freebie = cart.items[i];
        } else {
          realTotal += cart.items[i].final_line_price;
        }
      }

      if (typeof window.updateCartRewards === 'function') window.updateCartRewards(realTotal);

      var target = null;
      for (var j = FREEBIES.length - 1; j >= 0; j--) {
        if (realTotal >= FREEBIES[j].threshold) { target = FREEBIES[j]; break; }
      }

      var have = freebie ? String(freebie.variant_id) : null;
      var want = target ? target.variantId : null;

      if (have === want) return;

      // Freebie needs removal — hide instantly + show empty cart if no real items
      if (freebie) {
        hideFreebies();
        if (realTotal === 0) showEmptyCart();
      }

      var chain = Promise.resolve();
      var last = null;

      if (freebie && target) {
        chain = chain.then(function () { return removeFromCart(freebie.key); })
          .then(function () { return addToCart(target.variantId); })
          .then(function (r) { last = r; });
      } else if (freebie) {
        chain = chain.then(function () { return removeFromCart(freebie.key); })
          .then(function (r) { last = r; });
      } else if (target) {
        chain = chain.then(function () { return addToCart(target.variantId); })
          .then(function (r) { last = r; });
      }

      return chain.then(function () {
        if (last) {
          patchDrawer(last);
          if (typeof window.updateCartRewards === 'function') window.updateCartRewards(realTotal);
        }
      });
    })
    .catch(function (e) { console.error('[Freebie]', e); })
    .then(function () { unlock(); });
  }

  // Trigger 1: Page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 80); });
  } else {
    setTimeout(run, 80);
  }

  // Trigger 2: Cart drawer content changes
  var _debounce = null;
  function onDrawerChange() {
    if (_selfUpdate) return;
    clearTimeout(_debounce);
    _debounce = setTimeout(run, 300);
  }

  var drawer = document.getElementById('CartDrawer');
  if (drawer) {
    new MutationObserver(onDrawerChange).observe(drawer, { childList: true, subtree: true });
  }

  window.manageCartFreebie = run;
})();
