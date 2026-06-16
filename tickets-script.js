// ==================== GLOBAL STATE ====================
let allEvents = [];
let filteredEvents = [];
let currentEvent = null;
let currentTourDate = null;
let currentTicketType = null;
let currentSection = null;
let currentQuantity = 1;

// ==================== CURRENCY MAPPING ====================
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'CHF',
  'CNY': '¥',
  'SEK': 'kr',
  'NZD': 'NZ$',
  'MXN': '$',
  'SGD': 'S$',
  'HKD': 'HK$',
  'NOK': 'kr',
  'KRW': '₩',
  'INR': '₹',
  'RUB': '₽',
  'BRL': 'R$',
  'ZAR': 'R'
};

function getCurrencySymbol(currency = 'USD') {
  return CURRENCY_SYMBOLS[currency] || currency;
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Load events from admin API
  await loadEvents();
  populateCategoryFilter();
  renderEvents(allEvents);
  
  // Add search on Enter key
  document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applySearch();
    }
  });
});

// ==================== VISITOR TRACKING ====================
async function trackVisitor() {
  try {
    const visitor = {
      timestamp: new Date().toISOString(),
      referrer: document.referrer || 'Direct',
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Save locally
    let visitors = [];
    const stored = localStorage.getItem('siteVisitors');
    if (stored) {
      try {
        visitors = JSON.parse(stored);
      } catch {
        visitors = [];
      }
    }
    visitors.push(visitor);
    localStorage.setItem('siteVisitors', JSON.stringify(visitors));

    // Try to send to admin API (non-blocking)
    fetch('https://admin-tmaster.vercel.app/api/visitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': 'tmaster-admin-secure-key-2024'
      },
      body: JSON.stringify(visitor)
    }).catch(() => {
      // Silent fail - don't impact user experience
    });
  } catch (error) {
    console.log('Visitor tracking:', error.message);
  }
}

// ==================== LOAD EVENTS ====================
async function loadEvents() {
  try {
    // Try Admin API first (reads from GitHub via Vercel)
    const response = await fetch('https://admin-tmaster.vercel.app/api/events', {
      method: 'GET',
      headers: { 'X-API-Token': 'tmaster-admin-secure-key-2024' }
    });

    if (response.ok) {
      const data = await response.json();
      const apiEvents = data.events || [];
      // Transform API events to match expected format and normalize
      allEvents = (apiEvents || []).map(normalizeEventStructure);
      localStorage.setItem('cachedEvents', JSON.stringify(allEvents));
      filteredEvents = [...allEvents];
      return;
    }
  } catch (error) {
    console.warn('API events failed, trying local JSON:', error.message);
  }

  // Fallback 1: Try cached events
  try {
    const cached = localStorage.getItem('cachedEvents');
    if (cached) {
      allEvents = JSON.parse(cached);
      // Ensure cached events are normalized
      allEvents = allEvents.map(normalizeEventStructure);
      filteredEvents = [...allEvents];
      return;
    }
  } catch (error) {
    console.warn('Cache load failed:', error.message);
  }

  // Fallback 2: Try local JSON
  try {
    const response = await fetch('tickets-data.json');
    const data = await response.json();
    // Normalize events from local JSON
    allEvents = (data.events || []).map(normalizeEventStructure);
    filteredEvents = [...allEvents];
    localStorage.setItem('cachedEvents', JSON.stringify(allEvents));
  } catch (error) {
    console.error('Error loading events:', error);
    allEvents = [];
    filteredEvents = [];
  }
}

// Normalize event structure: ensure ticketTypes are at tourDate level
function normalizeEventStructure(event) {
  // If event has ticketTypes at top level, copy to each tourDate
  if (event.ticketTypes && event.tourDates) {
    event.tourDates = event.tourDates.map(tourDate => {
      if (!tourDate.ticketTypes) {
        tourDate.ticketTypes = event.ticketTypes;
      }
      return tourDate;
    });
  }
  return event;
}

// ==================== LANGUAGE SELECTION ====================
// Simple placeholder function for language selection
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

// Google Translate integration (matches checkout flow)
function ensureGoogleTranslateLoaded(callback) {
  if (window.google && window.google.translate) {
    callback();
    return;
  }

  if (!document.getElementById('google_translate_element')) {
    const container = document.createElement('div');
    container.id = 'google_translate_element';
    // Use visibility:hidden instead of display:none so Google Translate can initialize properly
    container.style.visibility = 'hidden';
    container.style.position = 'absolute';
    container.style.pointerEvents = 'none';
    container.style.height = '0';
    container.style.width = '0';
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

  // Retry multiple times to wait for .goog-te-combo to be created
  let attempts = 0;
  const maxAttempts = 15; // Try for up to 7.5 seconds (500ms * 15)
  
  const trySetLanguage = () => {
    attempts++;
    const combo = document.querySelector('.goog-te-combo');
    
    if (combo) {
      combo.value = targetLang;
      combo.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ Language set to:', targetLang);
      return;
    }
    
    if (attempts < maxAttempts) {
      setTimeout(trySetLanguage, 500);
    } else {
      console.warn('Could not find .goog-te-combo after retries');
    }
  };
  
  // Start immediately
  trySetLanguage();
}
// ==================== RENDER EVENTS ====================
function renderEvents(events) {
  const container = document.getElementById('eventsContainer');
  const noResults = document.getElementById('noResults');

  container.innerHTML = '';

  if (events.length === 0) {
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';

  events.forEach((event, index) => {
    const card = createEventCard(event, index);
    container.appendChild(card);
  });

  // Handle hash-based navigation after rendering
  setTimeout(() => handleHashNavigation(), 100);
}

function createEventCard(event, eventIndex) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.id = `event-${eventIndex}`;
  event.eventIndex = eventIndex;
  
  card.innerHTML = `
    <img src="${event.imageUrl}" alt="${event.title}" class="event-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22250%22 height=%22250%22%3E%3Crect fill=%22%23666%22 width=%22250%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22white%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${event.artist}%3C/text%3E%3C/svg%3E'">
    <div class="event-info">
      <div class="event-name">${event.title}</div>
      <div class="event-artist">${event.artist}</div>
      <button class="see-tickets-btn" onclick="openEventDetails(this)">See Tickets</button>
    </div>
  `;

  card.querySelector('.see-tickets-btn').addEventListener('click', () => {
    openEventDetails(event);
  });

  return card;
}

// ==================== HASH-BASED NAVIGATION ====================
function handleHashNavigation() {
  const hash = window.location.hash.slice(1);
  if (hash && /^\d+$/.test(hash)) {
    const eventIndex = parseInt(hash);
    const eventCard = document.getElementById(`event-${eventIndex}`);
    if (eventCard) {
      eventCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

window.addEventListener('hashchange', handleHashNavigation);

// ==================== EVENT DETAILS FLOW ====================
function openEventDetails(event) {
  currentEvent = event;
  showLoadingModal();
}

function showLoadingModal() {
  const modal = document.getElementById('loadingModal');
  const content = modal.querySelector('.loading-modal');
  
  // Clear any existing timeouts
  if (modal.dataset.timeoutId) {
    clearTimeout(parseInt(modal.dataset.timeoutId));
  }
  
  // Replace with GIF instead of SVG
  content.innerHTML = `
    <img src="ticket.gif" alt="Loading" class="loading-gif">
    <p class="loading-text">Loading your event details...</p>
  `;
  
  modal.style.display = 'flex';
  
  // After 5 seconds, show tour dates modal
  const timeoutId = setTimeout(() => {
    closeLoadingModal();
    showTourDatesModal();
  }, 5000);
  
  modal.dataset.timeoutId = timeoutId;
}

function closeLoadingModal() {
  const modal = document.getElementById('loadingModal');
  modal.style.display = 'none';
  // Clear any pending timeouts
  modal.dataset.timeoutId = null;
}

function showLoadingModalBeforeTickets() {
  const modal = document.getElementById('loadingModal');
  const content = modal.querySelector('.loading-modal');
  
  // Clear any existing timeouts
  if (modal.dataset.timeoutId) {
    clearTimeout(parseInt(modal.dataset.timeoutId));
  }
  
  // Replace with GIF
  content.innerHTML = `
    <img src="ticket.gif" alt="Loading" class="loading-gif">
    <p class="loading-text">Loading ticket types...</p>
  `;
  
  modal.style.display = 'flex';
  
  const timeoutId = setTimeout(() => {
    closeLoadingModal();
    showTicketTypesModal();
  }, 5000);
  
  modal.dataset.timeoutId = timeoutId;
}

function showLoadingModalBeforeSections() {
  const modal = document.getElementById('loadingModal');
  const content = modal.querySelector('.loading-modal');
  
  // Clear any existing timeouts
  if (modal.dataset.timeoutId) {
    clearTimeout(parseInt(modal.dataset.timeoutId));
  }
  
  // Replace with GIF
  content.innerHTML = `
    <img src="ticket.gif" alt="Loading" class="loading-gif">
    <p class="loading-text">Loading seats...</p>
  `;
  
  modal.style.display = 'flex';
  
  const timeoutId = setTimeout(() => {
    closeLoadingModal();
    showSectionSelectionModal();
  }, 5000);
  
  modal.dataset.timeoutId = timeoutId;
}

function showTourDatesModal() {
  const modal = document.getElementById('tourDatesModal');
  const imageElement = document.getElementById('modalEventImage');
  const titleElement = document.getElementById('modalEventTitle');
  const datesList = document.getElementById('tourDatesList');

  // Set event image and title
  imageElement.src = currentEvent.imageUrl;
  imageElement.onerror = () => {
    imageElement.src = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22250%22%3E%3Crect fill=%22%23666%22 width=%22600%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22white%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${currentEvent.artist}%3C/text%3E%3C/svg%3E`;
  };
  titleElement.textContent = currentEvent.title;

  // Render tour dates
  datesList.innerHTML = '';
  currentEvent.tourDates.forEach(tourDate => {
    const dateCard = document.createElement('div');
    dateCard.className = 'tour-date-card';
    
    const dateObj = new Date(tourDate.date);
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = dateObj.getDate();
    const dow = tourDate.dayOfWeek.substring(0, 3).toUpperCase();
    const time = tourDate.time;

    dateCard.innerHTML = `
      <div class="date-box">
        <div class="month">${month}</div>
        <div class="day">${day}</div>
        <div class="dow">${dow}</div>
      </div>
      <div class="date-details">
        <h4>${time}</h4>
        <div class="date-meta">
          <strong>${tourDate.venue}</strong><br>
          ${tourDate.location}
        </div>
        <div class="tickets-available" style="margin-top: 8px; color: #00d4ff; font-weight: 600; font-size: 0.9rem;">${tourDate.ticketsAvailable.toLocaleString()} tickets available</div>
      </div>
      <button class="tour-date-btn" onclick="selectTourDate(event)">Find Tickets</button>
    `;

    datesList.appendChild(dateCard);
  });

  modal.style.display = 'flex';
}

function selectTourDate(event) {
  event.stopPropagation();
  const btn = event.target;
  const dateCard = btn.closest('.tour-date-card');
  const dateBoxMonth = dateCard.querySelector('.date-box .month').textContent;
  const dateBoxDay = dateCard.querySelector('.date-box .day').textContent;
  
  // Find the corresponding tour date
  const dateObj = new Date(currentEvent.tourDates[0].date);
  currentTourDate = currentEvent.tourDates.find(d => {
    const dDate = new Date(d.date);
    return dDate.getDate() == dateBoxDay && 
           dDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() === dateBoxMonth;
  });

  closeTourDatesModal();
  showLoadingModalBeforeTickets();
}

function closeTourDatesModal() {
  const modal = document.getElementById('tourDatesModal');
  modal.style.display = 'none';
}

function showTicketTypesModal() {
  const modal = document.getElementById('ticketTypesModal');
  const locationInfo = document.getElementById('locationInfo');
  const grid = document.getElementById('ticketTypesGrid');

  // Get currency from tour date (default to USD)
  const currency = currentTourDate.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  // Set location info
  locationInfo.innerHTML = `
    <p><strong>${currentTourDate.venue}</strong></p>
    <p>${currentTourDate.location}</p>
    <p>${currentTourDate.date} - ${currentTourDate.time}</p>
  `;

  // Helper function to calculate minimum price for each ticket type
  function getMinPriceForType(ticketTypeId) {
    if (!currentTourDate.sections || currentTourDate.sections.length === 0) {
      return null;
    }
    
    // Filter sections by type to get only sections for this ticket type
    const typeSections = currentTourDate.sections.filter(s => s.type === ticketTypeId);
    
    if (typeSections.length === 0) {
      return null;
    }
    
    return Math.min(...typeSections.map(s => s.price));
  }

  // Render ticket types
  grid.innerHTML = '';
  currentEvent.ticketTypes.forEach(ticketType => {
    const card = document.createElement('div');
    card.className = 'ticket-type-card';
    
    // Calculate minimum price for this ticket type
    const minTypePrice = getMinPriceForType(ticketType.id);
    
    // Determine price to display
    let priceDisplay = '';
    if (minTypePrice !== null) {
      // Show "from" price if we found sections with this type
      priceDisplay = `from ${currencySymbol}${minTypePrice.toFixed(2)}`;
    } else {
      // Fallback to basePrice if no sections found for this type
      priceDisplay = `${currencySymbol}${ticketType.basePrice.toFixed(2)}`;
    }
    
    card.innerHTML = `
      <div class="ticket-type-info">
        <h3>${ticketType.name}</h3>
        <p>${ticketType.description}</p>
      </div>
      <div class="ticket-type-price">${priceDisplay}</div>
    `;

    card.addEventListener('click', () => {
      selectTicketType(ticketType);
    });

    grid.appendChild(card);
  });

  modal.style.display = 'flex';
}

function selectTicketType(ticketType) {
  currentTicketType = ticketType;
  closeTicketTypesModal();
  showLoadingModalBeforeSections();
}

function closeTicketTypesModal() {
  const modal = document.getElementById('ticketTypesModal');
  modal.style.display = 'none';
}

function showSectionSelectionModal() {
  const modal = document.getElementById('sectionSelectionModal');
  const locationInfo = document.getElementById('sectionLocationInfo');
  const grid = document.getElementById('sectionsGrid');
  const quantityInput = document.getElementById('quantityInput');

  // Get currency from tour date (default to USD)
  const currency = currentTourDate.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  // Reset quantity
  currentQuantity = 1;
  quantityInput.value = 1;
  quantityInput.max = 6;

  // Set location info
  locationInfo.innerHTML = `
    <p><strong>${currentTourDate.venue}</strong> - ${currentTourDate.location}</p>
    <p><strong>Ticket Type:</strong> ${currentTicketType.name}</p>
  `;

  // Check if this is General Admission
  if (currentTicketType.id === 'general') {
    // General Admission - No front/center/back options (standing room only)
    grid.innerHTML = `
      <div style="padding: 2rem 0;">
        <h3 style="color: var(--text-dark); margin-bottom: 0.5rem; font-size: 1.1rem;">General Admission (Standing)</h3>
        <p style="margin-top: 0.5rem; font-size: 0.95rem; color: var(--text-light);">This is a General Admission ticket. There are no selectable sections or seat positions — tickets are standing room only. You'll be assigned entry in the standing area.</p>
      </div>
    `;

    // Create a default GA section
    currentSection = {
      section: 'Standing',
      row: 'General Admission',
      price: currentTicketType.basePrice
    };
  } else {
    // Reserved seating - Show section grid
    grid.innerHTML = '';
    
    // 🔧 FIX: Filter sections by ticket type
    // First, try to use type field if available; otherwise infer from prices
    let allSections = (currentTourDate.sections || []).filter(s => s);
    let filteredSections = [];
    
    if (allSections.length > 0 && allSections[0].type) {
      // Has type field - filter by ticket type ID
      filteredSections = allSections.filter(s => s.type === currentTicketType.id);
    } else if (currentEvent.ticketTypes && allSections.length > 0) {
      // No type field - infer by price matching based on ticket type index
      const ticketTypeIndex = currentEvent.ticketTypes.findIndex(t => t.id === currentTicketType.id);
      
      // Sort all sections by price to identify low/mid/high groups
      const sortedSections = [...allSections].sort((a, b) => a.price - b.price);
      const uniquePrices = [...new Set(sortedSections.map(s => s.price))].sort((a, b) => a - b);
      
      if (ticketTypeIndex === 0 && uniquePrices.length > 0) {
        // General Admission - lowest price tier
        const targetPrice = uniquePrices[0];
        filteredSections = allSections.filter(s => s.price === targetPrice);
      } else if (ticketTypeIndex === 1 && uniquePrices.length >= 2) {
        // VIP - middle price tier
        const targetPrice = uniquePrices[Math.floor(uniquePrices.length / 2)];
        filteredSections = allSections.filter(s => s.price === targetPrice);
      } else if (ticketTypeIndex === 2 && uniquePrices.length >= 2) {
        // Seated - highest price tier
        const targetPrice = uniquePrices[uniquePrices.length - 1];
        filteredSections = allSections.filter(s => s.price === targetPrice);
      } else {
        // Fallback: show all sections
        filteredSections = allSections;
      }
    } else {
      filteredSections = allSections;
    }
    
    if (filteredSections.length === 0) {
      grid.innerHTML = `
        <div style="padding: 2rem 0; text-align: center;">
          <p style="color: var(--text-light);">No sections available for this ticket type.</p>
        </div>
      `;
    } else {
      filteredSections.forEach(section => {
        const card = document.createElement('div');
        card.className = 'section-card';
        card.innerHTML = `
          <div class="section-label">Section</div>
          <div class="section-value">${section.section}</div>
          <div class="section-label">Row</div>
          <div class="section-value" style="font-size: 1rem;">${section.row}</div>
          <div class="section-price">${currencySymbol}${section.price.toFixed(2)}</div>
        `;

        card.addEventListener('click', () => {
          currentSection = section;
          updateSectionSelection();
          updatePriceBreakdown();
        });

        grid.appendChild(card);
      });

      // Select first filtered section by default
      if (filteredSections.length > 0) {
        currentSection = filteredSections[0];
        updateSectionSelection();
      }
    }
  }

  updatePriceBreakdown();
  modal.style.display = 'flex';
}

function updateSectionSelection() {
  // Remove selected class from all section cards
  document.querySelectorAll('.section-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  // Add selected class to the card that matches current section
  if (currentSection && currentTourDate.sections) {
    const selectedCard = Array.from(document.querySelectorAll('.section-card')).find(card => {
      const sectionValue = card.querySelector('.section-value').textContent.trim();
      return sectionValue === currentSection.section;
    });
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }
  }
}

function selectGAArea(area) {
  // Update the current section with the selected GA area
  currentSection = {
    section: 'Standing',
    row: area.charAt(0).toUpperCase() + area.slice(1),
    price: currentTicketType.basePrice
  };
  updatePriceBreakdown();
  
  // Visual feedback - highlight the selected area
  document.querySelectorAll('.ga-area-card').forEach(card => {
    card.classList.remove('selected');
  });
  const selectedCard = event.target.closest('.ga-area-card');
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
}

function closeSectionModal() {
  const modal = document.getElementById('sectionSelectionModal');
  modal.style.display = 'none';
}

// ==================== QUANTITY MANAGEMENT ====================
function decreaseQuantity() {
  if (currentQuantity > 1) {
    currentQuantity--;
    document.getElementById('quantityInput').value = currentQuantity;
    updatePriceBreakdown();
  }
}

function increaseQuantity() {
  const max = parseInt(document.getElementById('quantityInput').max);
  if (currentQuantity < max) {
    currentQuantity++;
    document.getElementById('quantityInput').value = currentQuantity;
    updatePriceBreakdown();
  }
}

// ==================== PRICE CALCULATIONS ====================
function updatePriceBreakdown() {
  if (!currentSection || !currentQuantity) return;

  // Get currency from tour date (default to USD)
  const currency = currentTourDate.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  const unitPrice = currentSection.price;
  const subtotal = unitPrice * currentQuantity;
  const bookingFee = subtotal * 0.02;
  const total = subtotal + bookingFee;

  document.getElementById('unitPrice').textContent = `${currencySymbol}${unitPrice.toFixed(2)}`;
  document.getElementById('displayQuantity').textContent = currentQuantity;
  document.getElementById('subtotal').textContent = `${currencySymbol}${subtotal.toFixed(2)}`;
  document.getElementById('bookingFee').textContent = `${currencySymbol}${bookingFee.toFixed(2)}`;
  document.getElementById('totalPrice').textContent = `${currencySymbol}${total.toFixed(2)}`;
}

// ==================== CHECKOUT ====================
function proceedToCheckout() {
  const currency = currentTourDate.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);
  
  const unitPrice = currentSection.price;
  const subtotal = unitPrice * currentQuantity;
  const bookingFee = subtotal * 0.02; // 2% booking fee
  const total = subtotal + bookingFee;
  
  const orderSummary = {
    event: currentEvent.title,
    location: currentTourDate.location,
    venue: currentTourDate.venue,
    date: currentTourDate.date,
    time: currentTourDate.time,
    dateTime: `${currentTourDate.date} - ${currentTourDate.time}`,
    currency: currency,
    currencySymbol: currencySymbol,
    ticketType: currentTicketType.name,
    section: currentSection.section,
    row: currentSection.row,
    quantity: currentQuantity,
    unitPrice: unitPrice,
    subtotal: subtotal,
    bookingFee: bookingFee,
    total: total
  };

  // Store order summary in sessionStorage
  sessionStorage.setItem('orderSummary', JSON.stringify(orderSummary));

  // Close modal and redirect to checkout page
  closeSectionModal();
  window.location.href = 'checkout.html';
}

// ==================== SEARCH & FILTERS ====================
function applySearch() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  filteredEvents = allEvents.filter(event => {
    return event.title.toLowerCase().includes(searchTerm) ||
           event.artist.toLowerCase().includes(searchTerm) ||
           event.category.toLowerCase().includes(searchTerm) ||
           event.tourDates.some(date =>
             date.venue.toLowerCase().includes(searchTerm) ||
             date.location.toLowerCase().includes(searchTerm)
           );
  });

  applyFilters();
}

// ==================== POPULATE CATEGORY FILTER ====================
function populateCategoryFilter() {
  try {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    // Extract unique categories from all events
    const categories = new Set();
    allEvents.forEach(event => {
      if (event.category) {
        categories.add(event.category);
      }
    });

    // Sort categories alphabetically
    const sortedCategories = Array.from(categories).sort();

    // Add categories to dropdown (keep "All Categories" option)
    // Clear existing options except the first one (All Categories)
    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }

    // Add category options
    sortedCategories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error populating category filter:', error);
  }
}

function applyFilters() {
  const categoryFilter = document.getElementById('categoryFilter').value;

  let filtered = filteredEvents;

  if (categoryFilter) {
    filtered = filtered.filter(event => event.category === categoryFilter);
  }

  renderEvents(filtered);
}

// ==================== MOBILE MENU ====================
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  mobileMenu.classList.toggle('active');
}

// Close mobile menu when clicking on a link
document.addEventListener('click', (e) => {
  const mobileMenu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburgerBtn');
  
  if (mobileMenu?.classList.contains('active') && !hamburger?.contains(e.target) && !mobileMenu?.contains(e.target)) {
    mobileMenu.classList.remove('active');
  }
});
