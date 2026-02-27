/**
 * Auto-Freebie System
 * Automatically adds/removes free gift products based on cart total.
 *
 * Thresholds are compared against the "real" cart total
 * (excluding any items that already have _freebie property).
 */
(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────── */
  var FREEBIES = [
    { threshold: 149900, variantId: '47070925095104' },   // Jaggery  (₹1499+)
    { threshold: 299900, variantId: '47503774187712' }    // Festive Duo (₹2999+)
  ];

  var _processing = false;

  /* ── HELPERS ────────────────────────────────────── */

  function getCart() {
    return fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); });
  }

  function addItem(variantId) {
    return fetch('/cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Number(variantId),
        quantity: 1,
        properties: { _freebie: 'true' }
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed to add freebie');
      return r.json();
    });
  }

  function removeItem(lineKey) {
    return fetch('/cart/change.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lineKey, quantity: 0 })
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed to remove freebie');
      return r.json();
    });
  }

  function refreshCartDrawer() {
    var url = window.routes && window.routes.cart_url
      ? window.routes.cart_url + '?section_id=cart-drawer'
      : '/cart?section_id=cart-drawer';

    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var selectors = ['cart-drawer-items', '.cart-drawer__footer', '.cart__ctas'];
        selectors.forEach(function (sel) {
          var oldEl = document.querySelector(sel);
          var newEl = doc.querySelector(sel);
          if (oldEl && newEl) oldEl.replaceWith(newEl);
        });
      });
  }

  /* ── CORE LOGIC ─────────────────────────────────── */

  function manageFreebie() {
    if (_processing) return;
    _processing = true;

    getCart()
      .then(function (cart) {
        // 1. Calculate real total (exclude freebie items)
        var realTotal = 0;
        var existingFreebie = null;

        cart.items.forEach(function (item) {
          if (item.properties && item.properties._freebie) {
            existingFreebie = item;
          } else {
            realTotal += item.final_line_price;
          }
        });

        // 2. Determine which freebie qualifies (highest threshold met)
        var qualifiedFreebie = null;
        for (var i = FREEBIES.length - 1; i >= 0; i--) {
          if (realTotal >= FREEBIES[i].threshold) {
            qualifiedFreebie = FREEBIES[i];
            break;
          }
        }

        // 3. Decide action
        var existingVariantId = existingFreebie
          ? String(existingFreebie.variant_id)
          : null;
        var neededVariantId = qualifiedFreebie
          ? qualifiedFreebie.variantId
          : null;

        // Already correct → nothing to do
        if (existingVariantId === neededVariantId) {
          _processing = false;
          return;
        }

        // Chain: remove old (if any) → add new (if any) → refresh
        var chain = Promise.resolve();

        if (existingFreebie) {
          chain = chain.then(function () {
            return removeItem(existingFreebie.key);
          });
        }

        if (qualifiedFreebie) {
          chain = chain.then(function () {
            return addItem(qualifiedFreebie.variantId);
          });
        }

        chain
          .then(function () {
            return refreshCartDrawer();
          })
          .then(function () {
            // Update progress bar if function exists
            if (typeof window.updateCartRewards === 'function') {
              getCart().then(function (c) {
                var rt = 0;
                c.items.forEach(function (item) {
                  if (!(item.properties && item.properties._freebie)) {
                    rt += item.final_line_price;
                  }
                });
                window.updateCartRewards(rt);
              });
            }
          })
          .catch(function (err) {
            console.error('[Auto-Freebie]', err);
          })
          .then(function () {
            _processing = false;
          });
      })
      .catch(function (err) {
        console.error('[Auto-Freebie] getCart failed:', err);
        _processing = false;
      });
  }

  /* ── EVENT HOOKS ────────────────────────────────── */

  // Run on initial load
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(manageFreebie, 500);
  });

  // Hook into Shopify PubSub cart updates
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, function (event) {
      // Skip if we triggered this update ourselves
      if (event.source === 'auto-freebie') return;
      setTimeout(manageFreebie, 300);
    });
  }

  // Expose for manual trigger
  window.manageCartFreebie = manageFreebie;
})();
