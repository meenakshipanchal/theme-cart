document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('select[data-product-id]').forEach(function(select) {
    
    select.addEventListener('change', function() {
      var selectedVariantId = this.value;
      var selectedOption = this.options[this.selectedIndex];
      
      var price = selectedOption.getAttribute('data-price');
      var available = selectedOption.getAttribute('data-available') === 'true';
      
      // Update price
      var priceElement = document.querySelector('#price-' + this.getAttribute('data-product-id'));
      if (priceElement) {
        priceElement.innerHTML = price; // Update price
      }
      // Saving Price
      let saveOuter = document.querySelector('#save' + this.getAttribute('data-product-id'));
      if (selectedOption.getAttribute('data-save') == '₹0') {
        saveOuter.classList.add("hide-saving")
      } else {
        saveOuter.classList.remove("hide-saving")
        document.querySelector('#save-' + this.getAttribute('data-product-id')).innerHTML =
        selectedOption.getAttribute('data-save');
      }
      
      // Saving Discount
      // document.querySelector('#discount_' + this.getAttribute('data-product-id')).innerHTML =
      // selectedOption.getAttribute('data-discount');

      // Update image if needed (assuming you store variant images)
      var variantImageElement = document.querySelector('#product-image-' + this.getAttribute('data-product-id'));
      if (variantImageElement) {
        var variantImageUrl = selectedOption.getAttribute('data-image-url');
        console.log(variantImageUrl);
        if (variantImageUrl) {
          variantImageElement.setAttribute('src', variantImageUrl);
          variantImageElement.setAttribute('srcset', variantImageUrl);
        }
      }

      // Show availability status
      var availabilityElement = document.querySelector('#availability-' + this.getAttribute('data-product-id'));
      var btntxt = document.querySelector('#btntxt-' + this.getAttribute('data-product-id'));
      if (availabilityElement) {
        btntxt.textContent = available ? 'Add to cart' : 'Out of stock';
        availabilityElement.disabled = available ? false : true;
      }
    });
  });
});