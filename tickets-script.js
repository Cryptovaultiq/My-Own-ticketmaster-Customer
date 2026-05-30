// ==================== GLOBAL STATE ====================
let allEvents = [];
let filteredEvents = [];
let currentEvent = null;
let currentTourDate = null;
let currentTicketType = null;
let currentSection = null;
let currentQuantity = 1;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Track visitor
  await trackVisitor();
  
  // Load events from admin API
  await loadEvents();
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
function changeLanguage(lang) {
  console.log('Language selected:', lang);
  // Future implementation for actual translation support
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

  events.forEach(event => {
    const card = createEventCard(event);
    container.appendChild(card);
  });
}

function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.innerHTML = `
    <img src="${event.imageUrl}" alt="${event.title}" class="event-image" onerror="this.src='https://via.placeholder.com/250x250?text=${encodeURIComponent(event.artist)}'">
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
    imageElement.src = `https://via.placeholder.com/600x250?text=${encodeURIComponent(currentEvent.artist)}`;
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

  // Set location info
  locationInfo.innerHTML = `
    <p><strong>${currentTourDate.venue}</strong></p>
    <p>${currentTourDate.location}</p>
    <p>${currentTourDate.date} - ${currentTourDate.time}</p>
  `;

  // Calculate minimum section price
  let minSectionPrice = null;
  if (currentTourDate.sections && currentTourDate.sections.length > 0) {
    minSectionPrice = Math.min(...currentTourDate.sections.map(s => s.price));
  }

  // Render ticket types
  grid.innerHTML = '';
  currentEvent.ticketTypes.forEach(ticketType => {
    const card = document.createElement('div');
    card.className = 'ticket-type-card';
    
    // Determine price to display
    let priceDisplay = '';
    if (ticketType.id === 'general') {
      // General Admission shows the basePrice
      priceDisplay = `£${ticketType.basePrice.toFixed(2)}`;
    } else {
      // VIP and Seated show minimum from sections
      if (minSectionPrice !== null) {
        priceDisplay = `from £${minSectionPrice.toFixed(2)}`;
      } else {
        priceDisplay = `£${ticketType.basePrice.toFixed(2)}`;
      }
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
    currentTourDate.sections.forEach(section => {
      const card = document.createElement('div');
      card.className = 'section-card';
      card.innerHTML = `
        <div class="section-label">Section</div>
        <div class="section-value">${section.section}</div>
        <div class="section-label">Row</div>
        <div class="section-value" style="font-size: 1rem;">${section.row}</div>
        <div class="section-price">£${section.price.toFixed(2)}</div>
      `;

      card.addEventListener('click', () => {
        currentSection = section;
        updateSectionSelection();
        updatePriceBreakdown();
      });

      grid.appendChild(card);
    });

    // Select first section by default
    if (currentTourDate.sections.length > 0) {
      currentSection = currentTourDate.sections[0];
      updateSectionSelection();
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

  const unitPrice = currentSection.price;
  const subtotal = unitPrice * currentQuantity;
  const bookingFee = subtotal * 0.02;
  const total = subtotal + bookingFee;

  document.getElementById('unitPrice').textContent = `£${unitPrice.toFixed(2)}`;
  document.getElementById('displayQuantity').textContent = currentQuantity;
  document.getElementById('subtotal').textContent = `£${subtotal.toFixed(2)}`;
  document.getElementById('bookingFee').textContent = `£${bookingFee.toFixed(2)}`;
  document.getElementById('totalPrice').textContent = `£${total.toFixed(2)}`;
}

// ==================== CHECKOUT ====================
function proceedToCheckout() {
  const orderSummary = {
    event: currentEvent.title,
    location: currentTourDate.location,
    venue: currentTourDate.venue,
    date: currentTourDate.date,
    time: currentTourDate.time,
    ticketType: currentTicketType.name,
    section: currentSection.section,
    row: currentSection.row,
    quantity: currentQuantity,
    unitPrice: currentSection.price,
    total: parseFloat(document.getElementById('totalPrice').textContent.replace('£', ''))
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
