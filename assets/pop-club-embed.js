const popArrowSvg = '<svg class="pop-arrow" width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M9.88326 12.9173L9.88327 12.9177C9.89143 13.1844 9.98336 13.4133 10.1634 13.5934C10.3447 13.7746 10.5755 13.8629 10.8437 13.8629C11.1118 13.8629 11.3427 13.7746 11.524 13.5934L16.938 8.17931C17.0335 8.08386 17.1049 7.97666 17.1478 7.85745L17.1481 7.85673C17.1881 7.74374 17.2075 7.62414 17.2075 7.49902C17.2075 7.37385 17.1881 7.25189 17.1491 7.13376L17.1488 7.13285C17.1064 7.00688 17.0342 6.89975 16.9335 6.81419L11.524 1.40468C11.3427 1.22341 11.1118 1.13516 10.8437 1.13516C10.5755 1.13516 10.3447 1.22341 10.1634 1.40468C9.98336 1.5847 9.89143 1.81366 9.88327 2.08037L9.88326 2.08073C9.87566 2.35011 9.96043 2.5828 10.1429 2.76525L13.9131 6.53542L2.0044 6.76113C1.73491 6.76147 1.50176 6.85429 1.31509 7.04031L1.31473 7.04068C1.12837 7.22768 1.03555 7.46133 1.03555 7.73144C1.03555 8.00156 1.12838 8.23505 1.31491 8.42157C1.50188 8.60854 1.73558 8.70176 2.00586 8.70178L2.0087 8.70173L13.8993 8.47636L10.1429 12.2328C9.96043 12.4152 9.87566 12.6479 9.88326 12.9173Z" fill="#fff" stroke="#5E3654" stroke-width="0.3"/> </svg>';

const CUSTOM_POPCOINS_ICON = 'https://cdn.shopify.com/s/files/1/0270/3346/9006/files/imgi_1_Coin.png?v=1767423420';

// Event Delegation
document.addEventListener('click', function (event) {
  const target = event.target;

  if (target === document.querySelector('#popModal')) {
    document.querySelector('#popModal').style.display = "none";
    document.querySelector("#pop-club-quick-buy3").disabled = false;
    document.body.classList.remove('popcoinShow');
    removePopHash();
    renderPopPrices();
  } else if (target === document.querySelector('.pop_club_cart input#buy-with-pop-coins')) {
    // Handle .pop_club_cart click
    popCartDrawerDisc();
  } else if (target === document.querySelector('.pdp_popcoin input#buy-with-pop-coins')) {
    // Handle .pdp_popcoin click
    popPdpDisc();
  }
  else if (target === document.querySelector('.cart_page_popcoin input#buy-with-pop-coins')) {
    popCartPageDisc();
  }
  else if (target === document.querySelector('.atc_popclub input#buy-with-pop-coins')) {
    popAtcDisc();
  }
});

// window.addEventListener('change', function (event) {
//   if (event.target.id !== 'buy-with-pop-coins') {
//     renderPopPrices();
//     console.log('Window Change Happened', event.target);
//   }
//   else if(event.target.closest('quick-add-modal')!==null){
//     updateQuickView(event.target.closest('quick-add-modal'));
//   }
// });

function updatePopVariant(currVariant) {
  console.log(currVariant.price / 100);
  document.querySelector('#pop-club-product-detail')?.setAttribute('price', currVariant.price / 100);
  updatePDPEarn();
}

// Cart Drawer Discount Coupon Create
async function popCartDrawerDisc() {
  const popclub_cart_div = document.querySelector('.pop_club_cart');
  // Function to add a loading indicator
  function addLoader() {
    // const checkoutButton = document.querySelector('cart-drawer #checkout2');
    // if (checkoutButton) {
    //   checkoutButton.setAttribute('disabled', '');
    // }
    popclub_cart_div.classList.add('pop-disc-apply');
  }
  // Function to remove the loading indicator
  function removeLoader() {
    // const checkoutButton = document.querySelector('cart-drawer #checkout2');
    // if (checkoutButton) {
    //   checkoutButton.removeAttribute('disabled');
    // }
    popclub_cart_div.classList.remove('pop-disc-apply');
  }
  try {
    // Fetch cart data
    const cartData = await fetch('/cart.js').then(response => response.json());
    // Apply the discount code with loading indicators
    createPopDiscountCart(cartData, addLoader, removeLoader, popclub_cart_div);
  } catch (error) {
    console.error('Error in popCartPageDisc:', error);
    // Handle any errors that occur during cart data fetching or discount creation
  }

}

function POPClubCartTotalValue(cartObj) {
  let cartTotal = 0;

  cartObj.items.forEach((line_item) => {
    if (excludedProduct_mp.has(line_item.product_id.toString()) === false) {
      cartTotal += ((line_item.final_price / 100) * (line_item.quantity));
    }
  });

  return (cartTotal);

}

const excludedProduct_mp = new Map();
// Store Excluded Products
function storeExcludedProducts(dataExcluded) {
  if (dataExcluded.includes(',') === true) {
    for (let el of dataExcluded.split(',')) {
      let currProdId = el.slice(el.lastIndexOf('/') + 1);
      excludedProduct_mp.set(currProdId, true);
    }
  }
  else {
    let currProdId = dataExcluded.slice(dataExcluded.lastIndexOf('/') + 1);
    excludedProduct_mp.set(currProdId, true);
  }
}

// Cart Analytics
async function cartSession() {
  try {
    const cookies = document.cookie.split('; ').reduce((cookieObj, cookie) => {
      const [name, value] = cookie.split('=');
      cookieObj[name] = value;
      return cookieObj;
    }, {});

    const sessionKey = cookies['_popcoin_session'];

    if (sessionKey) {
      console.log('Cookies available');
      return;
    }

    console.log('Cookies not available');
    // const keySession = cookies['_shopify_s'];
    const keySession = sessionStorage.getItem('popClubSession');

    if (!keySession) {
      console.log('Cookies null or undefined');
      return;
    }

    console.log('Cookies not available & generated');
    const now = new Date();
    const expirationTime = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
    now.setTime(now.getTime() + expirationTime);

    const session_value = "first";
    document.cookie = `_popcoin_session=${session_value}; expires=${now.toUTCString()}; path=/`;
    console.log(Shopify.shop);

    const response = await fetch(`https://prodreplica.mypopcoins.com/api/get/active/sessions?session_id=${keySession}&shop=${Shopify.shop}`);

    if (response.ok) {
      const sessionData = await response.json();
      console.log(sessionData);
    } else {
      throw new Error(`Failed to fetch session data: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error in cartSession:', error);
  }
}

// To add Commas to Number
function numberWithCommas(x) {
  return x.toString().split('.')[0].length > 3 ? x.toString().substring(0, x.toString().split('.')[0].length - 3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + x.toString().substring(x.toString().split('.')[0].length - 3) : x.toString();
}

// Cart Drawer Discount Coupon Create
async function createPopDiscountCart(cartData, addLoader, removeLoader, el) {
  try {
    // Removing the Coupon Code
    removeDiscount();

    // Enable Loader
    addLoader();

    const brandData = JSON.parse(sessionStorage.getItem('popBrandData'));
    const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));

    const percRedeem = brandData.redeem;
    const coinBal = popUserData.coins;

    const currPopPrice = POPClubCartTotalValue(cartData);
    console.log(currPopPrice);

    const currPopDisc = Math.min(Math.round((percRedeem / 100) * (currPopPrice)), coinBal);

    // const key = document.cookie.split('; ').find((row) => row.startsWith('_shopify_s='))?.split('=')[1];
    const key = sessionStorage.getItem('popClubSession');

    const price = cartData.items_subtotal_price / 100;
    let variants = '';

    for (const dataVar of cartData.items) {
      variants += dataVar.variant_id + '-' + dataVar.quantity + ',';
    }

    const parameters = `?cart=${price}&shop=${Shopify.shop}&key=${key}&variants=${variants}`;
    let ch = el.querySelector('input#buy-with-pop-coins').checked;

    if (ch && price > 0) {

      el.querySelector('label#buy-with-pop-coins-label').innerHTML = `₹ ${currPopDisc} | Saved Using <img src="${brandData.popcoins_icon}" width="20" height="20">coins`;

      if (el.classList.contains('cart_page_popcoin')) {
        document.querySelector('#main-cart-footer .totals__total-value').innerHTML = `₹ ${price - currPopDisc}`;
      }
      else if (el.classList.contains('pop_club_cart')) {
        document.querySelector('cart-drawer .totals__total-value').innerHTML = `₹${price - currPopDisc}`;
      }

      const response = await fetch('https://prodreplica.mypopcoins.com/api/get-coins-cart-discount' + parameters);

      if (response.ok) {
        const discData = await response.json();

        if (discData.success) {
          let date = new Date();
          date.setTime(date.getTime() + (60 * 60 * 1000));
          const expires = '; expires=' + date.toUTCString();
          document.cookie = "discount_code=" + discData.code + expires + '; path=/';
        } else {
          // Handle API response indicating failure
          console.error('Failed to get discount data:', discData.error_message);
        }
      }
      else {
        // Handle HTTP error
        console.error('Failed to fetch discount data:', response.status, response.statusText);
      }
      el.classList.add('pop-pdp-disc-applied');
    }
    else {
      el.querySelector('label#buy-with-pop-coins-label').innerHTML = `Save ₹ ${currPopDisc} Using <img src="${CUSTOM_POPCOINS_ICON}" width="20" height="20">coins`;
      if (el.classList.contains('cart_page_popcoin')) {
        document.querySelector('#main-cart-footer .totals__total-value').innerHTML = `₹ ${price}`;
      }
      else if (el.classList.contains('pop_club_cart')) {
        document.querySelector('cart-drawer .totals__total-value').innerHTML = `₹${price}`;
      }
      removeDiscount();
      el.classList.remove('pop-pdp-disc-applied');
    }

    removeLoader();
  } catch (error) {
    console.error('Error in createPopDiscountCart:', error);
    // Handle any other unexpected errors
  }
}


// Cart Page Discount Coupon Create
async function popCartPageDisc() {
  // Check if the user is on the cart page
  if (window.location.href.includes('/cart')) {

    const popclub_cart_div = document.querySelector('.cart_page_popcoin');
    // Function to add a loading indicator
    function addLoader() {
      // const checkoutButton = document.querySelector('#main-cart-footer #checkout2');
      // if (checkoutButton) {
      //   checkoutButton.setAttribute('disabled', '');
      // }
      popclub_cart_div.classList.add('pop-disc-apply');
    }

    // Function to remove the loading indicator
    function removeLoader() {
      // const checkoutButton = document.querySelector('#main-cart-footer #checkout2');
      // if (checkoutButton) {
      //   checkoutButton.removeAttribute('disabled');
      // }
      popclub_cart_div.classList.remove('pop-disc-apply');
    }

    try {
      // Fetch cart data
      const cartData = await fetch('/cart.js').then(response => response.json());

      // Apply the discount code with loading indicators
      createPopDiscountCart(cartData, addLoader, removeLoader, popclub_cart_div);
    } catch (error) {
      console.error('Error in popCartPageDisc:', error);
      // Handle any errors that occur during cart data fetching or discount creation
    }
  }
}

// Cart Page Discount Coupon Create
async function popAtcDisc() {
  // Check if the user is on the cart page

  const popclub_cart_div = document.querySelector('.atc_popclub');
  // Function to add a loading indicator
  function addLoader() {
    const checkoutButton = document.querySelector('#cart-notification-form [name="checkout"]');
    if (checkoutButton) {
      checkoutButton.setAttribute('disabled', '');
    }
    popclub_cart_div.classList.add('loader');
  }

  // Function to remove the loading indicator
  function removeLoader() {
    const checkoutButton = document.querySelector('#cart-notification-form [name="checkout"]');
    if (checkoutButton) {
      checkoutButton.removeAttribute('disabled');
    }
    popclub_cart_div.classList.remove('loader');
  }

  try {
    // Fetch cart data
    const cartData = await fetch('/cart.js').then(response => response.json());

    // Apply the discount code with loading indicators
    createPopDiscountCart(cartData, addLoader, removeLoader, popclub_cart_div);
  } catch (error) {
    console.error('Error in popCartPageDisc:', error);
    // Handle any errors that occur during cart data fetching or discount creation
  }

}

let popPriceTimeout;
function renderPopPrices(useLocal = false) {
  clearTimeout(popPriceTimeout);
  popPriceTimeout = setTimeout(() => {
    load_renderPopPrices(useLocal)
  }, 1500);
}

// Refresh, Onload Function 
async function load_renderPopPrices(useLocal = false) {
  try {

    // const key = document.cookie.split('; ').find((row) => row.startsWith('_shopify_s='))?.split('=')[1];
    sessionStorage.removeItem('popPdpAtc');

    const carttoken = document.cookie.split('; ').find((row) => row.startsWith('cart'))?.split('=')[1];
    const key = sessionStorage.getItem('popClubSession');
    const parameters = `?shop=${Shopify.shop}&key=${key}${carttoken ? '&carttoken=' + carttoken : ''}`;

    let brandData;

    if (!sessionStorage.getItem('popBrandData')) {
      brandData = await fetch(`https://prodreplica.mypopcoins.com/api/get-brand?shop=${Shopify.shop}`).then(response => response.json());
      sessionStorage.setItem('popBrandData', JSON.stringify(brandData));
    } else {
      brandData = JSON.parse(sessionStorage.getItem('popBrandData'));
    }

    if (brandData.excluded_products !== null) {
      storeExcludedProducts(brandData.excluded_products);
    }

    // Updating the PDP Earn Callout
    const isBundlePage = document.querySelector('[name="properties[_bundle_productX]"]');
    if (window.location.href.includes('/products') && !isBundlePage) {
      updatePDPEarn(brandData);
    }

    let popUserData;
    if (useLocal === false) {
      popUserData = await fetch(`https://prodreplica.mypopcoins.com/api/get-available-coins${parameters}`).then(response => response.json());
      sessionStorage.setItem('popUserData', JSON.stringify(popUserData));
    }
    else {
      popUserData = JSON.parse(sessionStorage.getItem('popUserData'));
      if (!popUserData) {
        popUserData = await fetch(`https://prodreplica.mypopcoins.com/api/get-available-coins${parameters}`).then(response => response.json());
        sessionStorage.setItem('popUserData', JSON.stringify(popUserData));
      }
    }

    // Updating Bottom Bar
    updateBottomBar(brandData, popUserData);

    // Updating all the Product Cards
    if (popUserData.success === true) {
      updateProductCards();
    }

    const cartData = await fetch('/cart.js').then(response => response.json());
    // if (!sessionStorage.getItem('popCartData')) {
    //   cartData = await fetch('/cart.js').then(response => response.json());
    //   sessionStorage.setItem('popCartData', JSON.stringify(cartData));
    // }
    // else {
    //   cartData = JSON.parse(sessionStorage.getItem('popCartData'));
    // }

    sessionStorage.setItem('popUserData', JSON.stringify(popUserData));

    // Updating Earn Callout on Cart Drawer and Cart Page
    updateEarnCallout(cartData, brandData, popUserData);

    // Updating the Checkbox Elements
    updatePopClub(cartData, brandData, popUserData);


  } catch (error) {
    console.error('Error in load_renderPopPrices:', error);
    // Handle any errors that occur during data fetching or UI updates
  }
}

async function updateEarnCallout(cartData, brandData, popUserData) {
  try {

    const popIconAPI = brandData.popcoins_icon;

    // Function to calculate issue coins
    function calculateIssueCoins(price, quantity, issuance) {

      const priceValue = Math.floor(price);
      let roundedPrice = 0;
      if (priceValue > 19) {
        const modulePrice = priceValue % 20;
        roundedPrice = priceValue - modulePrice;
      }

      return Math.round((brandData.issuance / 100) * roundedPrice) * quantity;

    }

    function insertAfter(newNode, existingNode) {
      return new Promise((res, rej) => {
        res(existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling));
      })
    }

    // Function to create HTML for issue coins
    function createIssueCoinsHTML(issueCoins) {
      return `<p id='product-issuance-msg'> Earn <span class='pop-img'> <img src='${popIconAPI}' width='20' height='21'> </span> ${issueCoins} </p>`;
    }

    // Update Cart Drawer
    setTimeout(() => {
      document.querySelector("cart-drawer")?.querySelectorAll(".cart-item").forEach((item, i) => {
        const price_len = (cartData['items'][i].final_price.toString().length) - 2;
        const quantity = cartData['items'][i].quantity;
        const price = parseInt(cartData['items'][i].final_price.toString().slice(0, price_len) + "." + cartData['items'][i].final_price.toString().slice(price_len));
        const issueCoins = calculateIssueCoins(price, quantity, brandData.issuance);
        const newstring = createIssueCoinsHTML(issueCoins);

        const oldItems = item.querySelectorAll(".manual_class_cart__price_down");
        oldItems.forEach((old_item) => old_item.remove());

        if (issueCoins > 0) {
          insertAfter(create("div"), item.querySelector(".product-option")).then(() => {
            item.querySelector(".manual_class_cart__price_down").innerHTML = '';
            item.querySelector(".manual_class_cart__price_down").innerHTML = newstring;
          });
        }
      });
    }, 500);

    // Update Cart Page
    document.querySelectorAll("form#cart .cart-items .cart-item").forEach((item, j) => {
      const price_len = (cartData['items'][j].price.toString().length) - 2;
      const quantity = cartData['items'][j].quantity;
      const price = parseInt(cartData['items'][j].price.toString().slice(0, price_len) + "." + cartData['items'][j].price.toString().slice(price_len));
      const issueCoins = calculateIssueCoins(price, quantity, brandData.issuance);
      const newstring = createIssueCoinsHTML(issueCoins);

      const oldItems = item.querySelectorAll(".manual_class_cart__price_down");
      oldItems.forEach((old_item) => old_item.remove());

      if (issueCoins > 0) {
        insertAfter(create("div"), item.querySelector(".product-option")).then(() => {
          item.querySelector(".manual_class_cart__price_down").innerHTML = '';
          item.querySelector(".manual_class_cart__price_down").innerHTML = newstring;
        });
      }
    });

  } catch (error) {
    console.error('Error in cartDatas:', error);
  }
}

function updateBottomBar(brandData, popUserData) {
  const popIconAPI = brandData.popcoins_icon;
  const bottomBarEl = document.querySelector('#pop-club-quick-buy-span-stripe');
  let bottomBarStr;
  if (popUserData.success === false) {
    bottomBarStr = `<span class="reward_name">${brandData.loyalty_program_name}</span> <img width="30" height="30" loading="eager" src="${popIconAPI}">Get upto ${brandData.redeem}% Off using POPcoins ${popArrowSvg}`;
  }
  else {
    if (popUserData.coins === 0) {
      bottomBarStr = `<div class="popcoin_sec1"><img width="30" height="30" src="${popIconAPI}">${popUserData.coins}</div>Shop and Earn POPcoins ${popArrowSvg}`;
    }
    else {
      bottomBarStr = `<span id="pop-club-quick-buy-span-stripe"><span class="reward_name">${brandData.loyalty_program_name}</span>Get upto ${brandData.redeem}% Off using <div class="popcoin_sec"><img width="30" height="30" src="${popIconAPI}">${popUserData.coins}</div></span> ${popArrowSvg}`;
    }
  }
  bottomBarEl.innerHTML = bottomBarStr;
  document.querySelector('#pop-club-quick-buy3')?.removeAttribute('disabled');
}

function updatePDPEarn(brandData = null) {

  if (!brandData) {
    brandData = JSON.parse(sessionStorage.getItem('popBrandData'));
  }

  const popIconAPI = brandData.popcoins_icon;

  const popClubProductDiv = document.querySelector("#pop-club-product-detail");
  const productID = popClubProductDiv.getAttribute('prodId');

  if (excludedProduct_mp.has(productID) === true) {
    return;
  }

  if (window.location.href.includes('/products')) {
    const price = parseFloat(popClubProductDiv.getAttribute("price"));

    const priceValue = Math.floor(price);
    let roundedPrice = 0;
    if (priceValue > 19) {
      const modulePrice = priceValue % 20;
      roundedPrice = priceValue - modulePrice;
    }
    const issueCoins = Math.round((brandData.issuance / 100) * roundedPrice);

    if (issueCoins <= 0) {
      popClubProductDiv.classList.add('hidden');
      return;
    }
    else {
      popClubProductDiv.classList.remove('hidden');
    }

    let pdpQty = 1;
    const qtyInput = document.querySelector('.product-form__input .quantity__input');

    if (qtyInput) {
      pdpQty = parseInt(qtyInput.value);
      pdpQty = Math.max(1, pdpQty);
    }

    // issueCoins *= pdpQty;

    const popHTML = `<p id='product-issuance-msg'> Earn <span class='pop-img'> <img src='${popIconAPI}' width='20' height='21'> </span> ${issueCoins} on this product</p>`;

    const productIssuanceMsg = document.querySelector("#product-issuance-msg");

    if (productIssuanceMsg) {
      popClubProductDiv.innerHTML = popHTML;
    } else {
      popClubProductDiv.insertAdjacentHTML("afterbegin", popHTML);
    }
  }
}

function renderPopCheckbox(popCartDrawerDiv, cartData, brandData, popUserData) {

  const percRedeem = brandData.redeem;
  const popMiniCartValue = parseInt((brandData.minimum_cart_value) ? brandData.minimum_cart_value : 0);

  if (popCartDrawerDiv != null) {
    popCartDrawerDiv.classList.add('loader');
    if (popUserData.success == true) {
      if (popUserData.coins == 0) {
        popCartDrawerDiv.querySelector('#buy-with-pop-coins').style.display = "none";
        popCartDrawerDiv.querySelector('#buy-with-pop-coins-label').innerHTML = 'You have 0 POPcoins. Shop now & earn coins.';
        popCartDrawerDiv.classList.add('zero-user');
      }
      else {

        let cartTotal = POPClubCartTotalValue(cartData);
        let popCartDisc = Math.min(Math.round((percRedeem / 100) * cartTotal), popUserData.coins);

        if (popCartDisc <= 0 || popMiniCartValue > cartTotal) {
          popCartDrawerDiv.querySelector('#buy-with-pop-coins').style.display = 'none';
          popCartDrawerDiv.querySelector('#buy-with-pop-coins-label').innerHTML = '';
          popCartDrawerDiv.classList.add('pop-club-hide');
        }
        else {
          popCartDrawerDiv.querySelector('#buy-with-pop-coins').style.display = "block";
          popCartDrawerDiv.querySelector('#buy-with-pop-coins-label').innerHTML = `Save ₹ ${popCartDisc} Using <img src="${brandData.popcoins_icon}" width="20" height="20">coins`;

          popCartDrawerDiv.querySelector('#buy-with-pop-coins').checked = false;
          popCartDrawerDiv.classList.remove('pop-club-hide');

          let cartIsOpened = document.querySelector('cart-drawer.active');

          if (cartIsOpened && popCartDrawerDiv.querySelector('#buy-with-pop-coins').checked === false && popCartDisc > 0) {
            popCartDrawerDiv.querySelector('#buy-with-pop-coins').checked = true;
            const popclub_cart_div = document.querySelector('.pop_club_cart');
            // Function to add a loading indicator
            function addLoader() {
              // const checkoutButton = document.querySelector('cart-drawer #checkout2');
              // if (checkoutButton) {
              //   checkoutButton.setAttribute('disabled', '');
              // }
              popclub_cart_div.classList.add('pop-disc-apply');
            }
            // Function to remove the loading indicator
            function removeLoader() {
              // const checkoutButton = document.querySelector('cart-drawer #checkout2');
              // if (checkoutButton) {
              //   checkoutButton.removeAttribute('disabled');
              // }
              popclub_cart_div.classList.remove('pop-disc-apply');
            }
            createPopDiscountCart(cartData, addLoader, removeLoader, popCartDrawerDiv);
          }

        }
      }
      popCartDrawerDiv.classList.remove('not-logged-in');
      popCartDrawerDiv.classList.remove('popclub-hide');
      popCartDrawerDiv.classList.remove('zero-user');

    }
    else {
      popCartDrawerDiv.querySelector('#buy-with-pop-coins').style.display = "none";
      popCartDrawerDiv.querySelector('#buy-with-pop-coins-label').innerHTML = `<span onclick="cartDrawerIframeOpen()"><span class="underline">Click</span> & get upto ${brandData.redeem}% off using <img src="${brandData.popcoins_icon}" width="20" height="20">coins</span>`;
      popCartDrawerDiv.classList.add('not-logged-in');
      // popCartDrawerDiv.classList.add('popclub-hide');
      popCartDrawerDiv.classList.remove('zero-user');
    }
    popCartDrawerDiv.classList.remove('loader');
    popCartDrawerDiv.classList.remove('hidden');
  }
}

/**
 * Update Details on the Brand
 * @param cartData - Cart Details
 * @param brandData - Cart Details
 * @param popUserData - POPClub User Info
 * @returns - Void
*/

// To Update POPClub
function updatePopClub(cartData, brandData, popUserData) {
  const popCartDrawerDiv = document.querySelector('.pop_club_cart');
  const percRedeem = brandData.redeem;
  const popMiniCartValue = parseInt((brandData.minimum_cart_value) ? brandData.minimum_cart_value : 0);

  renderPopCheckbox(popCartDrawerDiv, cartData, brandData, popUserData);

  const atcDiv = document.querySelector('.atc_popclub');
  renderPopCheckbox(atcDiv, cartData, brandData, popUserData);

  const isQuickViewOpened = document.querySelector('quick-add-modal[open]');
  if (isQuickViewOpened) {
    updateQuickView(isQuickViewOpened);
  }

  const isBundlePage = document.querySelector('[name="properties[_bundle_productX]"]');
  if (window.location.href.includes('/products') === true && !isBundlePage) {
    // PDP Discount Handle
    const atcWrapper = document.querySelector('#popAtcWrapper');
    const pdpPopDiv = document.querySelector('.pdp_popcoin');
    const productId = document.querySelector('#pop-club-product-detail').getAttribute('prodId');

    if (atcWrapper) {
      let atcWrapperStr;
      if (popUserData.success === false) {
        atcWrapperStr = `<span onclick="openLoadedIframe()"><span class="underline">Click</span> & get upto ${brandData.redeem}% off using POPcoins</span>`;
      }
      else {
        atcWrapperStr = `<span onclick="openLoadedIframe()">POPCoins Discount will be applied at Checkout</span>`;
      }
      atcWrapper.innerHTML = atcWrapperStr;
    }

    // let atc_pop_div = document.querySelector('.atc_popclub');
    if (pdpPopDiv && excludedProduct_mp.has(productId) === false) {
      if (popUserData.success === true) {
        if (popUserData.coins == 0) {
          // pdpPopDiv.querySelector('#buy-with-pop-coins').style.display = "none";
          // pdpPopDiv.querySelector('#buy-with-pop-coins-label').innerHTML = 'You have 0 POPcoins. Shop now & earn coins.';

          // atc_pop_div.querySelector('#buy-with-pop-coins').style.display = "none";
          // atc_pop_div.querySelector('#buy-with-pop-coins-label').innerHTML = 'You have 0 POPcoins. Shop now & earn coins.';
          pdpPopDiv.classList.add('hidden');
        }
        else {
          pdpPopDiv.querySelector('#buy-with-pop-coins').style.display = "block";
          // atc_pop_div.querySelector('#buy-with-pop-coins').style.display = "block";
        }

        let pdpQty = 1;
        if (document.querySelector('.product-form__input .quantity__input') != null) {
          pdpQty = parseInt(document.querySelector('.product-form__input .quantity__input').value);
          pdpQty = Math.max(1, pdpQty);
        }

        let price = parseInt(document.querySelector('#pop-club-product-detail').getAttribute('price'));
        let pdp_max_coin = Math.min(Math.round(pdpQty * parseInt(price) * (percRedeem / 100)), popUserData.coins);
        removeDiscount();
        pdpPopDiv.querySelector('#buy-with-pop-coins').checked = false;
        // atc_pop_div.querySelector('#buy-with-pop-coins').checked = false;

        if (pdp_max_coin > 0 && (price * pdpQty) > popMiniCartValue) {
          pdpPopDiv.querySelector('#buy-with-pop-coins').style.display = "block";
          pdpPopDiv.querySelector('#buy-with-pop-coins-label').innerHTML = `Save ₹ ${pdp_max_coin} Using POPcoins`;
          pdpPopDiv.classList.remove('hidden');
        }

      }
      else {
        // pdpPopDiv.querySelector('#buy-with-pop-coins').style.display = "none";
        // pdpPopDiv.querySelector('#buy-with-pop-coins-label').innerHTML = '<span onclick="cartDrawerIframeOpen()"><span class="underline">Click</span> & get upto 10% off using POPcoins</span>';

        // atc_pop_div.querySelector('#buy-with-pop-coins').style.display = "none";
        // atc_pop_div.querySelector('#buy-with-pop-coins-label').innerHTML = '<span onclick="cartDrawerIframeOpen()"><span class="underline">Click</span> & get upto 10% off using POPcoins</span>';
        pdpPopDiv.classList.add('hidden');
      }
    }
    // pdpPopDiv.classList.remove('hidden');
    // atc_pop_div.classList.remove('hidden');
  }
  else if (window.location.href.includes('/cart') === true) {
    // Cart Discount Handle
    let popCartPageDiv = document.querySelector('.cart_page_popcoin');
    if (popCartPageDiv != null) {
      if (popUserData.success == true) {
        if (popUserData.coins == 0) {
          popCartPageDiv.querySelector('#buy-with-pop-coins').style.display = "none";
          popCartPageDiv.querySelector('#buy-with-pop-coins-label').innerHTML = 'You have 0 POPcoins. Shop now & earn coins.';
        }
        else {

          let cartTotal = POPClubCartTotalValue(cartData);
          let popCartDisc = Math.min(Math.round((percRedeem / 100) * cartTotal), popUserData.coins);

          if (popCartDisc <= 0 || popMiniCartValue > cartTotal) {
            popCartPageDiv.querySelector('#buy-with-pop-coins').style.display = "none";
            popCartPageDiv.querySelector('#buy-with-pop-coins-label').innerHTML = '';
          }
          else {
            popCartPageDiv.querySelector('#buy-with-pop-coins').style.display = "block";
            popCartPageDiv.querySelector('#buy-with-pop-coins-label').innerHTML = `Save ₹ ${popCartDisc} Using <img src="${brandData.popcoins_icon}" width="20" height="20">coins`;
            popCartPageDiv.querySelector('#buy-with-pop-coins').checked = false;

            if (popCartPageDiv.querySelector('#buy-with-pop-coins').checked == false && popCartDisc > 0) {
              popCartPageDiv.querySelector('#buy-with-pop-coins').checked = true;
              const popclub_cart_div = document.querySelector('.cart_page_popcoin');
              // Function to add a loading indicator
              function addLoader() {
                // const checkoutButton = document.querySelector('#main-cart-footer #checkout2');
                // if (checkoutButton) {
                //   checkoutButton.setAttribute('disabled', '');
                // }
                popclub_cart_div.classList.add('pop-disc-apply');
              }

              // Function to remove the loading indicator
              function removeLoader() {
                // const checkoutButton = document.querySelector('#main-cart-footer #checkout2');
                // if (checkoutButton) {
                //   checkoutButton.removeAttribute('disabled');
                // }
                popclub_cart_div.classList.remove('pop-disc-apply');
              }
              createPopDiscountCart(cartData, addLoader, removeLoader, popCartPageDiv);
            }
          }

        }
        popCartPageDiv.classList.remove('not-logged-in');
      }
      else {
        popCartPageDiv.querySelector('#buy-with-pop-coins').style.display = "none";
        popCartPageDiv.querySelector('#buy-with-pop-coins-label').innerHTML = `<span onclick="openLoadedIframe()"><span class="underline">Click</span> & get upto ${brandData.redeem}% off using <img src="${brandData.popcoins_icon}" width="20" height="20">coins</span>`;
        popCartPageDiv.classList.add('not-logged-in');
      }
      popCartPageDiv.classList.remove('hidden');

    }
  }

  document.querySelector('.popclub-modal').classList.remove('hidden');

}


async function popCartDisc() {

  const cartData = (await fetch('/cart.js')).json();

  let popCartDrawerDiv = document.querySelector('.pop_club_cart');
  popCartDrawerDiv.querySelector('#buy-with-pop-coins').setAttribute('disabled', '');
  popCartDrawerDiv.classList.add('loader');
  let total_value = POPClubCartTotalValue(cartData);

  let issuance_popclub = parseInt(document.querySelector('#pop-club-data-redeem').value) / 100;

  let pop_disc = parseInt(document.querySelector('#pop-club-data-coins').value);
  pop_disc = Math.min(Math.round(issuance_popclub * total_value), pop_disc);

  let pop_checkout_checked = popCartDrawerDiv.querySelector('#buy-with-pop-coins').checked;
  let price_pop_val, cart_pop_last_str;

  let popCartDrawerDiv_msg = '';
  if (pop_checkout_checked == true) {
    cart_pop_last_str = "Saved Using POPcoins";
    price_pop_val = '₹ ' + numberWithCommas(total_value - pop_disc) + '.00';
    popCartDrawerDiv_msg = '₹ ' + pop_disc + ' | ' + cart_pop_last_str;
  }
  else {
    price_pop_val = '₹ ' + numberWithCommas(total_value) + '.00';
    popCartDrawerDiv_msg = 'Save ₹ ' + pop_disc + ' Using POPcoins';
  }

  if (isNaN(total_value) == false && isNaN(pop_disc) == false) {
    document.querySelector('.cart-totals .price[cart_val] .money').innerHTML = price_pop_val;
  }
  popCartDrawerDiv.querySelector('#buy-with-pop-coins-label').innerHTML = popCartDrawerDiv_msg;
  popCartDrawerDiv.querySelector('#buy-with-pop-coins').removeAttribute('disabled');

  function addLoader() {
    document.querySelector("#checkout2").setAttribute('disabled', '');
  }

  function removeLoader() {
    document.querySelector("#checkout2").removeAttribute('disabled');
    document.querySelector('.pop_club_cart').classList.remove('loader');
  }

  createPopDiscounttCart(cartData, addLoader, removeLoader);

}

function create(el) {
  var d = document;
  var element = d.createElement(el);
  element.classList.add("manual_class_cart__price_down");
  return element;
}

function cartDrawerIframeOpen() {
  const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));
  const isPopLogin = popUserData.success;
  if (isPopLogin === false) {
    if (document.querySelector("#popclub_iframe").src.toString().includes('-cart') == true) {
      openLoadedIframe();
    }
    else {
      loadIframe('-cart');
      openLoadedIframe();
    }
  }
  else {
    openLoadedIframe();
  }
  document.querySelector('.pop-star').classList.remove('hidden');
}

function cartSessionUpdate(popClubSessionKey) {
  let shopifyToken = {
    'attributes': {
      'pop_token': `${popClubSessionKey}`
    }
  };

  fetch(window.Shopify.routes.root + 'cart/update.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(shopifyToken)
  })
    .then(response => {
      return response.json();
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

function nonCartIframeOpen() {
  const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));
  const isPopLogin = popUserData.success;
  if (isPopLogin === false) {
    if (document.querySelector("#popclub_iframe").src.toString().includes('-cart') == false) {
      openLoadedIframe();
    }
    else {
      loadIframe();
      openLoadedIframe();
    }
  }
  else {
    openLoadedIframe();
  }
}

async function popPdpDisc() {
  const pdpPopDiv = document.querySelector('.pdp_popcoin');
  const pdpBuyNowBtn = document.querySelector('.shopify-payment-button button');

  // Enable PDP Loader
  pdpBuyNowBtn.setAttribute('disabled', '');

  // const key = document.cookie.split('; ').find((row) => row.startsWith('_shopify_s='))?.split('=')[1];
  const key = sessionStorage.getItem('popClubSession');
  const parameters = `?shop=${Shopify.shop}&key=${key}`;

  try {
    const popUserData = await fetch(`https://prodreplica.mypopcoins.com/api/get-available-coins${parameters}`).then(response => response.json());
    const brandData = JSON.parse(sessionStorage.getItem('popBrandData'));

    if (!popUserData.success) {
      pdpPopDiv.classList.add('hidden');
    } else {
      pdpPopDiv.classList.remove('hidden');

      const coinVal = parseInt(popUserData.coins);
      let pdpPrice = parseInt(document.querySelector('#pop-club-product-detail').getAttribute('price'));
      pdpPrice = isNaN(pdpPrice) ? 0 : pdpPrice;

      let pdpQty = 1;
      const quantityInput = document.querySelector('.product-form__quantity .quantity__input');
      if (quantityInput !== null) {
        pdpQty = parseInt(quantityInput.value);
        pdpQty = Math.max(1, pdpQty);
      }

      const percRedeem = brandData.redeem;
      const pdpCurrPopPrice = Math.min(Math.round(pdpPrice * pdpQty * (percRedeem / 100)), coinVal);

      if (pdpCurrPopPrice === 0) {
        pdpPopDiv.classList.add('hidden');
      } else {
        pdpPopDiv.classList.remove('hidden');
      }

      const pdpInputChecked = pdpPopDiv.querySelector('#buy-with-pop-coins').checked;

      let pdpPopclubMsg = '';
      if (pdpInputChecked && pdpPrice * pdpQty > 0) {
        const pdpVarId = pdpPopDiv.querySelector('#buy-with-pop-coins').getAttribute('variant_id');
        const discountCode = await getDiscountCode(pdpPrice * pdpQty, Shopify.shop, key, pdpVarId);
        pdpPopclubMsg = `₹ ${pdpCurrPopPrice} | Saved Using POPcoins`;

        if (discountCode) {
          setDiscountCookie(discountCode);
        }
      } else {
        removeDiscount();
        pdpPopclubMsg = `Save ₹ ${pdpCurrPopPrice} Using POPcoins`;

        // Remove PDP Loader
        // const loadingOverlay = pdpBuyNowBtn.querySelector('.loading-overlay');
        // loadingOverlay.classList.add('hidden');
      }

      pdpBuyNowBtn.removeAttribute('disabled');
      pdpPopDiv.querySelector('#buy-with-pop-coins-label').innerHTML = pdpPopclubMsg;
    }
  } catch (error) {
    console.error('Error in popPdpDisc:', error);
  }
}

async function getDiscountCode(cartPrice, shop, key, variantId) {
  const parameters = `?cart=${cartPrice}&shop=${shop}&key=${key}&variants=${variantId}`;
  try {
    const response = await fetch(`https://prodreplica.mypopcoins.com/api/get-coins-cart-discount${parameters}`);
    if (response.ok) {
      const data = await response.json();
      return data.code;
    } else {
      console.error('Failed to fetch discount code:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error while fetching discount code:', error);
  }
  return null;
}

function setDiscountCookie(discountCode) {
  const date = new Date();
  date.setTime(date.getTime() + (60 * 60 * 1000)); // Expires in 1 hour
  const expires = '; expires=' + date.toUTCString();
  document.cookie = `discount_code=${discountCode}${expires}; path=/`;
}


// Cart and PDP Cookie Manage
async function cartPdpDiscManage() {
  if (window.location.href.includes('/cart')) {
    removeDiscount();
    await managePdpPopCheckbox();
  } else {
    try {
      const cartData = await fetch('/cart.js').then(response => response.json());
      const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));

      const isPopLogin = popUserData.success;
      const coinBal = parseInt(popUserData.coins);

      const currCost = POPClubCartTotalValue(cartData);
      const isCartOpened = document.querySelector('cart-drawer.active');
      const cartDrawerDiv = document.querySelector('.pop_club_cart');
      const isBundlePage = document.querySelector('[name="properties[_bundle_productX]"]');
      const isAtcPdp = sessionStorage.getItem('popPdpAtc');

      if (isPopLogin === true && coinBal > 0 && isCartOpened && cartData.items.length > 0 && currCost > 0 && cartDrawerDiv.querySelector('input#buy-with-pop-coins').checked === false && !isAtcPdp) {
        cartDrawerDiv.querySelector('input#buy-with-pop-coins').checked = true;
        const popclub_cart_div = document.querySelector('.pop_club_cart');
        // Function to add a loading indicator
        function addLoader() {
          // const checkoutButton = document.querySelector('cart-drawer #checkout2');
          // if (checkoutButton) {
          //   checkoutButton.setAttribute('disabled', '');
          // }
          popclub_cart_div.classList.add('pop-disc-apply');
        }
        // Function to remove the loading indicator
        function removeLoader() {
          // const checkoutButton = document.querySelector('cart-drawer #checkout2');
          // if (checkoutButton) {
          //   checkoutButton.removeAttribute('disabled');
          // }
          popclub_cart_div.classList.remove('pop-disc-apply');
        }
        createPopDiscountCart(cartData, addLoader, removeLoader, cartDrawerDiv);
        // await manageCartPopCheckbox();
      }
    } catch (error) {
      console.error('Error in cartPdpDiscManage:', error);
    }
    finally {
      if (sessionStorage.getItem('popPdpAtc')) {
        sessionStorage.removeItem('popPdpAtc')
      }
    }
  }
}

async function managePdpPopCheckbox() {
  const pdpPop = document.querySelector('.pdp_popcoin #buy-with-pop-coins');
  if (pdpPop && pdpPop.checked) {
    pdpPop.click();
  }
}

async function manageCartPopCheckbox() {
  const cartPopChecked = document.querySelector('.pop_club_cart #buy-with-pop-coins');
  if (cartPopChecked && !cartPopChecked.checked) {
    cartPopChecked.click();
  }
}

// PDP Qty Change Function
function pdpQty_change(el) {
  el.addEventListener('change', function (el) {

    const brandData = JSON.parse(sessionStorage.getItem('popBrandData'));
    const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));

    const popPdpDiv = document.querySelector('.pdp_popcoin');

    const isLogin = popUserData.success;
    const percRedeem = brandData.redeem;
    const coinBal = parseInt(popUserData.coins);
    const currQty = parseInt(el.target.value);

    const productPrice = parseInt(document.querySelector('#pop-club-product-detail').getAttribute('price'));
    const currProdPrice = Math.min(Math.round((percRedeem / 100) * productPrice * currQty), coinBal);

    const prodId = document.querySelector('#pop-club-product-detail').getAttribute('prodId');

    if (excludedProduct_mp.has(prodId) === true) {
      return;
    }

    if (currProdPrice > 0 && isNaN(currProdPrice) === false) {
      popPdpDiv.querySelector('#buy-with-pop-coins-label').innerHTML = `Save ₹ ${currProdPrice} Using POPcoins`;
      popPdpDiv.querySelector('#buy-with-pop-coins').checked = false;
    }

  });
}

// PDP Quantity Change
function pdpQty_fix() {
  if (window.location.href.includes('/products') === true) {
    document.querySelectorAll('.product-form__quantity .quantity__input').forEach((el) => pdpQty_change(el));
    // document.querySelectorAll('.sticky-item .quantity a').forEach((el) => pdpQty_change(el));
  }
}

function loadIframe(cartParams = null) {

  const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));

  let popIframeSrc;
  // const key = document.cookie.split('; ').find((row) => row.startsWith('_shopify_s='))?.split('=')[1];
  const key = sessionStorage.getItem('popClubSession');
  const iframeURL = document.querySelector('#pop-club-iframe-url').value;

  if (window.location.href.indexOf('/products/') != -1) {
    const redeemPrices = popUserData.coins;
    let redeemCoins = redeemPrices;
    popIframeSrc = iframeURL + '&key=' + key + '&page=pdp&discount=' + redeemCoins;
  }
  else {
    let cartPage = '';
    if (window.location.href.indexOf('/cart') != -1) {
      cartPage = '&page=cart';
    }
    popIframeSrc = iframeURL + '&key=' + key + cartPage;
  }

  let refUrl = new URLSearchParams(document.location.search);
  refUrl = refUrl.get('ref');

  if (refUrl === null) {
    if (sessionStorage.getItem('lastPopReferred') !== null) {
      refUrl = sessionStorage.getItem('lastPopReferred');
    }
  }
  else {
    sessionStorage.setItem('lastPopReferred', refUrl);
  }

  document.querySelector('#popclub_iframe').src = popIframeSrc + '&url=' + window.location.href + ((cartParams != null) ? '-cart' : '') + ((refUrl !== null) ? '&ref=' + refUrl : '') + (typeof (popTemplateName) ? '&source=' + popTemplateName : '');
}

function openLoadedIframe() {
  let modal = document.querySelector('#popModal');
  modal.style.display = 'block';
  document.body.classList.add('popcoinShow');
}

function updateProductCards() {
  const brandData = JSON.parse(sessionStorage.getItem('popBrandData'));
  const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));

  const popIconAPI = brandData.popcoins_icon;
  let popClubDiv = document.querySelectorAll(".pop-club-listing");
  if (popUserData.success === true) {
    for (const popPriceDiv of popClubDiv) {
      const prodId = popPriceDiv.getAttribute('prodId');
      if (excludedProduct_mp.has(prodId) === false) {
        let price = parseInt(popPriceDiv.getAttribute("price"));

        let redeemCoins = Math.round((brandData.redeem / 100) * price);
        if (redeemCoins > popUserData.coins && popUserData.success == true) {
          redeemCoins = popUserData.coins;
        }

        let redeemPrice = Math.round(price - redeemCoins);
        let popHTML = "";
        if (redeemCoins == 0) {
          popHTML = "";
        }
        else if (isNaN(redeemPrice) === false && isNaN(redeemCoins) === false) {
          popHTML = `<p><span class="popcoin_msg">or<span> <span style="display: flex;">₹ ${redeemPrice} + <span class='pop-img'><img src='${popIconAPI}'></span> ${redeemCoins} </span></p>`;
        }
        popPriceDiv.innerHTML = popHTML;
      }
    }
  }
}

function cart_bottom_menu_handle() {
  const element = document.querySelector(".icon-nav");

  if (element != null) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          if (element.classList.contains('menu-open') == true) {
            document.querySelector('#pop-club-quick-buy3').classList.add('hidden');
          }
          else {
            document.querySelector('#pop-club-quick-buy3').classList.remove('hidden');
          }
          // cartPdpDiscManage();
        }
      }
    });

    observer.observe(element, { attributes: true });
  }

}

function removeDiscount() {
  document.cookie = "discount_code=; expires=Thu, 18 Dec 2000 12:00:00 UTC; path=/";
}

/**
 *  Add the functionality in Quick View, Update Bottom Bar and Earn Callout
 * @param el - Div of Quick View to add Functionality
 * @returns - Void
*/

function updateQuickView(el) {
  // Update Earn Callout
  console.log('Quick View Opened');
  const popClubProductDiv = el.querySelector("#pop-club-product-detail");
  const productPrice = parseInt(popClubProductDiv.getAttribute('price'));

  const brandData = JSON.parse(sessionStorage.getItem('popBrandData'));
  const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));

  const productId = parseInt(popClubProductDiv.getAttribute('prodId'));
  const productID = popClubProductDiv.getAttribute('prodId');

  const popIconAPI = brandData.popcoins_icon;

  const priceValue = Math.floor(productPrice);
  let roundedPrice = 0;
  if (priceValue > 19) {
    const modulePrice = priceValue % 20;
    roundedPrice = priceValue - modulePrice;
  }
  const issueCoins = Math.round((brandData.issuance / 100) * roundedPrice);

  const popHTML = `<p id='product-issuance-msg'> Earn <span class='pop-img'> <img src='${popIconAPI}' width='20' height='21'> </span> ${issueCoins} on this product</p>`;

  const productIssuanceMsg = el.querySelector("#product-issuance-msg");

  if (productIssuanceMsg) {
    popClubProductDiv.innerHTML = popHTML;
  }
  else {
    popClubProductDiv.insertAdjacentHTML("afterbegin", popHTML);
  }

  if (excludedProduct_mp.has(productId)) {
    return;
  }

  const quickViewPopDiv = el.querySelector('.pdp_popcoin');
  const coinBal = parseInt(popUserData.coins);
  const percRedeem = parseInt(brandData.redeem);
  const currPrice = Math.min(Math.round((percRedeem / 100) * productPrice), coinBal);

  if (coinBal > 0) {
    quickViewPopDiv.querySelector('#buy-with-pop-coins').checked = false;
    quickViewPopDiv.querySelector('#buy-with-pop-coins').style.display = "block";
    quickViewPopDiv.querySelector('#buy-with-pop-coins-label').innerHTML = `Save ₹ ${currPrice} Using POPcoins`;
    quickViewPopDiv.classList.remove('hidden');
  }
  else {
    quickViewPopDiv.classList.add('hidden');
  }

  // Qty Update
  el.querySelectorAll('.product-form__quantity .quantity__input').forEach((qty_btn) => pdpQty_change(qty_btn));

}

function popInit() {
  if (window.popinit == true) return;
  loadIframe();
  cartSession();
  popPageLoadEvent();
  pdpQty_fix();
  window.popinit = true;
}

window.popinit = false;

async function cartTokenGenerate() {
  try {
    let cartData = await fetch('/cart.js');
    cartData = await cartData.json();

    if (cartData.items.length === 0) {
      await fetch('/cart/clear');
      let cartToken = await fetch('/cart.js');
      cartToken = await cartToken.json();
      sessionStorage.setItem('cartTokenGenerated', 'true');
      sessionStorage.setItem('popClubSession', cartToken.token);
    }
    else if (sessionStorage.getItem('popClubSession') === null) {
      sessionStorage.setItem('cartTokenGenerated', 'true');
      sessionStorage.setItem('popClubSession', cartData.token);
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

function menuIframeOpen() {
  let queryString = window.location.search;
  if (queryString.includes('coins=true') || queryString.includes('coins=TRUE') || window.location.hash === '#popcoins') {
    loadIframe();
    openLoadedIframe();
    document.querySelector('.popclub-modal')?.classList.remove('hidden');
  }
}

function menuHashIframe() {
  window.addEventListener("hashchange", () => {
    if (location.hash === '#popcoins') {
      openLoadedIframe();
    }
  });
}

function removePopHash() {
  if (location.hash === '#popcoins') {
    location.hash = '';
  }
}

window.addEventListener('message', function (event) {
  if (event.origin === 'https://floater30.mypopcoins.com') {
    let data = JSON.parse(event.data);
    if (data.creds) {
      let creds = atob(data.creds);
      creds = creds.split(':');

      let formData = new FormData();
      formData.append('form_type', 'customer_login');
      formData.append('utf8', '✓');
      formData.append('customer[email]', creds[0]);
      formData.append('customer[password]', creds[1]);

      fetch("/account/login", {
        body: formData,
        method: "post"
      }).then(response => {
        if (response.ok) {

          document.addEventListener('click', function (event) {
            const target = event.target;
            if (target === document.querySelector('#popModal')) {
              sessionStorage.removeItem('popUserData');
              window.location.reload();
            }
            else if (target.closest('.pop_modal_close')) {
              sessionStorage.removeItem('popUserData');
              window.location.reload();
            }
          });

        }
        else {
          console.error('Login failed');
        }
      });
    }
  }
}, false);


document.addEventListener("DOMContentLoaded", async function () {

  if (sessionStorage.getItem('cartTokenGenerated') != 'true' || sessionStorage.getItem('popClubSession') === null) {
    await cartTokenGenerate();
  }

  menuHashIframe();
  document.addEventListener('touchstart', popInit, { once: true });
  document.addEventListener('mousemove', popInit, { once: true });

  setTimeout(function () {
    renderPopPrices();
    menuIframeOpen();
  }, 500);
  cart_bottom_menu_handle();
  document.querySelector('#popModal').classList.remove('hidden');
  sessionStorage.removeItem('popPdpAtc');

});

function popPageLoadEvent() {
  if (typeof (popTemplateName) && popTemplateName) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const brandData = JSON.parse(sessionStorage.getItem('popBrandData'));
    const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));
    const popKeySession = sessionStorage.getItem('popClubSession');

    if (popUserData && popUserData && popKeySession) {

      const raw = JSON.stringify({
        "event": popTemplateName,
        "sub_event": 'Page Loaded',
        "mid": brandData.mid,
        "is_logged_in_user": popUserData.success,
        "message": event,
        "mobile": null,
        "email": "",
        "session_id": popKeySession
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
      };

      fetch("https://loyaltydataevent.popclub.co.in/shopify/v2/track/event", requestOptions)
        .then((response) => response.text())
        .then((result) => {
          console.log()
        })
        .catch((error) => {
          console.error(error)
        });
    }

  }
}

function popEventsDebounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    if (!timer) {
      func.apply(this, args);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
    }, timeout);
  };
}

document.addEventListener("click", popEventsDebounce((e) => {
  const target = e.target;

  let event, sub_event;
  if (target.closest('.pop_club_cart label#buy-with-pop-coins-label')) {
    event = 'Cart Drawer Floater Opened';
  } else if (target.closest('.pdp_popcoin label#buy-with-pop-coins-label')) {
    event = 'PDP Page Floater Opened';
  }
  else if (target.closest('.cart_page_popcoin label#buy-with-pop-coins-label')) {
    event = 'Cart Page Floater Opened';
  }
  else if (target.closest('#pop-club-quick-buy3')) {
    event = 'Bottom Bar Floater Opened';
  }

  // debugger;

  if (event && typeof (popTemplateName) && popTemplateName) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const brandData = JSON.parse(sessionStorage.getItem('popBrandData'));
    const popUserData = JSON.parse(sessionStorage.getItem('popUserData'));
    const popKeySession = sessionStorage.getItem('popClubSession');

    if (brandData && popUserData && popKeySession) {
      const raw = JSON.stringify({
        "event": event,
        "sub_event": popTemplateName,
        "mid": brandData.mid,
        "is_logged_in_user": popUserData.success,
        "message": event,
        "mobile": null,
        "email": "",
        "session_id": popKeySession
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
      };

      const cond1 = Boolean(popUserData.success === false && event !== 'Bottom Bar Floater Opened');
      const cond2 = Boolean(event === 'Bottom Bar Floater Opened');

      if (cond1 || cond2) {
        fetch("https://loyaltydataevent.popclub.co.in/shopify/v2/track/event", requestOptions)
          .then((response) => response.text())
          .then((result) => {
            console.log()
          })
          .catch((error) => {
            console.error(error)
          });
      }
    }

  }

}))