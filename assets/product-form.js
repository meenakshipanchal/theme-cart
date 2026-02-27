if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      async onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        // Check if product already exists in cart & Only One Qty
        /*
        const metaQty = document.querySelector('[name=metaQty]');
        if (metaQty && metaQty.value) {
          const productInCart = await this.checkProductInCart(this.variantIdInput.value);
          const quantityInput = document.querySelector('[name=quantity]');
          const alertIcon = '<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" style="margin-right:5px"><path d="M12 10V13" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M12 16V15.9888" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M10.2518 5.147L3.6508 17.0287C2.91021 18.3618 3.87415 20 5.39912 20H18.6011C20.126 20 21.09 18.3618 20.3494 17.0287L13.7484 5.147C12.9864 3.77538 11.0138 3.77538 10.2518 5.147Z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          if (productInCart) {
            // alert('This product is already in your cart. You can only add one of each product.');
            document.getElementById('popup').style.display = 'block';
            document.getElementById('popupHeading').innerHTML = alertIcon + ' Already in Your Cart';
            document.getElementById('popupMessage').innerHTML = "This product is already in your cart. You can only add one of each product.";
            return;
          }
          if (quantityInput && parseInt(quantityInput.value) > 1) {
            // this.handleErrorMessage('You can only add one of each product to the cart.');
            document.getElementById('popup').style.display = 'block';
            document.getElementById('popupHeading').innerHTML = alertIcon + ' One Item Limit';
            document.getElementById('popupMessage').innerHTML = "You can only add one of each product to the cart.";
            return; // Prevent form submission
          }
        } */
        
        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }

            // Show Cross-Sell Modal after successful add to cart (only on PDP, not quick-add)
            const isPDP = window.location.pathname.includes('/products/');
            const isQuickAdd = this.closest('quick-add-modal') || this.closest('.quick-add');

            if (isPDP && !isQuickAdd && typeof showCrossSellModal === 'function') {
              // Small delay - let cart update first, then show cross-sell modal
              setTimeout(() => {
                showCrossSellModal();
              }, 300);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
            /* add custom js */
            setTimeout(()=>{
              typeof(renderPopPrices)==='function' && renderPopPrices(true);  
            },200);
          });
      }

      async checkProductInCart(variantId) {
        // Fetch the current cart contents
        const response = await fetch('/cart.js');
        const cart = await response.json();

        // Check if the variant ID exists in the cart items
        return cart.items.some(item => item.id === parseInt(variantId));
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}
