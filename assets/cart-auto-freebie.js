/**
 * Auto-Freebie System (Optimized)
 * Automatically adds/removes free gift products based on cart total.
 * Uses Shopify sections API to avoid extra round-trips.
 */
(function () {
  'use strict';

  var FREEBIES = [
    { threshold: 149900, variantId: '47070925095104' },   // Jaggery  (₹1499+)
    { threshold: 299900, variantId: '47503774187712' }    // Festive Duo (₹2999+)
  ];

  var _processing = false;
  var SECTION_ID = 'cart-drawer';

  function getCart() {
    return fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); });
  }

  /** Add item and get updated section HTML in one call */
  function addItem(variantId) {
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
      if (!r.ok) throw new Error('Failed to add freebie');
      return r.json();
    });
  }

  /** Remove item and get updated section HTML in one call */
  function removeItem(lineKey) {
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
      if (!r.ok) throw new Error('Failed to remove freebie');
      return r.json();
    });
  }

  /** Apply section HTML from API response directly — no extra fetch */
  function applySectionHTML(response) {
    var html = response && response.sections && response.sections[SECTION_ID];
    if (!html) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var oldDrawer = document.querySelector('#CartDrawer');
    var newDrawer = doc.querySelector('#CartDrawer');
    if (oldDrawer && newDrawer) {
      oldDrawer.innerHTML = newDrawer.innerHTML;
      // Update is-empty class but PRESERVE active/animate classes
      var cartDrawerEl = document.querySelector('cart-drawer');
      var newCartDrawerEl = doc.querySelector('cart-drawer');
      if (cartDrawerEl && newCartDrawerEl) {
        var wasActive = cartDrawerEl.classList.contains('active');
        var wasAnimate = cartDrawerEl.classList.contains('animate');
        cartDrawerEl.className = newCartDrawerEl.className;
        if (wasActive) cartDrawerEl.classList.add('active');
        if (wasAnimate) cartDrawerEl.classList.add('animate');
      }
      // Re-bind overlay click handler (lost during innerHTML replacement)
      var overlay = document.querySelector('#CartDrawer-Overlay');
      if (overlay && cartDrawerEl) {
        overlay.addEventListener('click', function () { cartDrawerEl.close(); });
      }
    }
  }

  function manageFreebie() {
    if (_processing) return;
    _processing = true;

    getCart()
      .then(function (cart) {
        // Skip if cart is truly empty
        if (!cart.items || cart.items.length === 0) {
          _processing = false;
          return;
        }

        var realTotal = 0;
        var existingFreebie = null;

        cart.items.forEach(function (item) {
          if (item.properties && item.properties._freebie) {
            existingFreebie = item;
          } else {
            realTotal += item.final_line_price;
          }
        });

        // Determine which freebie qualifies (highest threshold met)
        var qualifiedFreebie = null;
        for (var i = FREEBIES.length - 1; i >= 0; i--) {
          if (realTotal >= FREEBIES[i].threshold) {
            qualifiedFreebie = FREEBIES[i];
            break;
          }
        }

        var existingVid = existingFreebie ? String(existingFreebie.variant_id) : null;
        var neededVid = qualifiedFreebie ? qualifiedFreebie.variantId : null;

        // Already correct → skip
        if (existingVid === neededVid) {
          _processing = false;
          return;
        }

        // Build chain: remove old → add new
        // Last call in chain returns sections HTML, so no extra refresh needed
        var chain = Promise.resolve();
        var lastResponse = null;

        if (existingFreebie && qualifiedFreebie) {
          // Swap: remove old (skip sections), add new (with sections)
          chain = chain
            .then(function () { return removeItem(existingFreebie.key); })
            .then(function () { return addItem(qualifiedFreebie.variantId); })
            .then(function (resp) { lastResponse = resp; });
        } else if (existingFreebie) {
          // Just remove
          chain = chain
            .then(function () { return removeItem(existingFreebie.key); })
            .then(function (resp) { lastResponse = resp; });
        } else if (qualifiedFreebie) {
          // Just add
          chain = chain
            .then(function () { return addItem(qualifiedFreebie.variantId); })
            .then(function (resp) { lastResponse = resp; });
        }

        return chain.then(function () {
          if (lastResponse) {
            applySectionHTML(lastResponse);
            // Update rewards slider after DOM replacement
            if (typeof window.updateCartRewards === 'function') {
              window.updateCartRewards(realTotal);
            }
          }
        });
      })
      .catch(function (err) {
        console.error('[Auto-Freebie]', err);
      })
      .then(function () {
        _processing = false;
      });
  }

  // Run on initial load (minimal delay)
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(manageFreebie, 80);
  });

  // Hook into Shopify PubSub cart updates
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, function (event) {
      if (event.source === 'auto-freebie') return;
      setTimeout(manageFreebie, 80);
    });
  }

  window.manageCartFreebie = manageFreebie;
})();
