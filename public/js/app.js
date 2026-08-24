/**
 * AA SHOP CLIENT APPLICATION (MEGA UPGRADE: 2-STEP WIZARD, SINGLE-ITEM DIRECT BUY & REAL PHOTO RECEIPT)
 * Features:
 * - Single Item Buy vs Cart Checkout: Direct Buy on any product only buys that single item!
 * - 2-Step Checkout Wizard: Step 1 (Delivery Info) ➔ Step 2 (Dynamic Payment: COD, Easypaisa/JazzCash with TID, Visa/Mastercard)
 * - Dedicated Real Photo Receipt Screen (#receipt) in PENDING state with Order #, product photos, customer info, and barcode.
 * - Dedicated Pages: Home (#home), Product Detail (#product-detail), Wishlist (#wishlist), Cart (#cart), Account (#account), Checkout (#checkout), Receipt (#receipt), Auth (#auth)
 * - Full Screen Width Search Bar with AI Camera Lens
 * - Multi-Currency Live Switcher (PKR Rs., USD $, EUR €)
 */

// Currency Configuration
const CURRENCIES = {
  'PKR': { symbol: 'Rs. ', rate: 278, flag: '🇵🇰', name: 'Pakistani Rupee' },
  'USD': { symbol: '$', rate: 1, flag: '🇺🇸', name: 'US Dollar' },
  'EUR': { symbol: '€', rate: 0.92, flag: '🇪🇺', name: 'Euro' }
};

// Application State
const state = {
  currentPage: 'home',
  currentProductId: null,
  products: [],
  cart: JSON.parse(localStorage.getItem('aashop_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('aashop_wishlist')) || [],
  checkoutItems: [], // The specific items currently being checked out (single item or whole cart)
  checkoutDeliveryInfo: {}, // Stored from Step 1
  currentUser: JSON.parse(localStorage.getItem('aashop_user')) || null,
  token: localStorage.getItem('aashop_token') || null,
  currency: localStorage.getItem('aashop_currency') || 'PKR',
  activeCategory: 'All',
  activeSort: 'featured',
  searchQuery: '',
  appliedPromo: null,
  pendingAuth: null,
  resendCountdown: 0,
  resendInterval: null,
  cameraStream: null
};

// Helper: Format USD amount to selected Currency
function formatMoney(usdAmount) {
  if (usdAmount === undefined || usdAmount === null) return '';
  const curr = CURRENCIES[state.currency] || CURRENCIES['PKR'];
  const converted = usdAmount * curr.rate;
  if (state.currency === 'PKR') {
    return `${curr.symbol}${Math.round(converted).toLocaleString('en-PK')}`;
  }
  return `${curr.symbol}${converted.toFixed(2)}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// DOM Elements Registry
const elements = {
  // Page Containers
  pages: {
    home: document.getElementById('page-home'),
    'product-detail': document.getElementById('page-product-detail'),
    wishlist: document.getElementById('page-wishlist'),
    cart: document.getElementById('page-cart'),
    account: document.getElementById('page-account'),
    'account-profile': document.getElementById('page-account-profile'),
    'account-password': document.getElementById('page-account-password'),
    'account-orders': document.getElementById('page-account-orders'),
    'account-faqs': document.getElementById('page-account-faqs'),
    'ai-chat': document.getElementById('page-ai-chat'),
    checkout: document.getElementById('page-checkout'),
    receipt: document.getElementById('page-receipt'),
    auth: document.getElementById('page-auth'),
    admin: document.getElementById('page-admin'),
    'admin-product-edit': document.getElementById('page-admin-product-edit')
  },

  // Navbar
  navBrandLink: document.getElementById('nav-brand-link'),
  navAccountBtn: document.getElementById('nav-account-btn'),
  headerUserAvatar: document.getElementById('header-user-avatar'),
  authBtnText: document.getElementById('auth-btn-text'),
  wishlistBadge: document.getElementById('wishlist-badge'),
  cartBadge: document.getElementById('cart-badge'),

  // Currency
  currencyPickerBtn: document.getElementById('currency-picker-btn'),
  currencyDropdown: document.getElementById('currency-dropdown'),
  currentCurrencyFlag: document.getElementById('current-currency-flag'),
  currentCurrencyCode: document.getElementById('current-currency-code'),

  // Search & Catalog
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  searchSubmitBtn: document.getElementById('search-submit-btn'),
  categoryPills: document.getElementById('category-pills'),
  sortSelect: document.getElementById('sort-select'),
  productsGrid: document.getElementById('products-grid'),
  catalogCountText: document.getElementById('catalog-count-text'),
  emptyState: document.getElementById('empty-products-state'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),
  heroFeaturedBtn: document.getElementById('hero-featured-btn'),

  // Dedicated Product Detail Page
  productDetailPageContent: document.getElementById('product-detail-page-content'),
  detailPageBreadcrumbCategory: document.getElementById('detail-page-breadcrumb-category'),

  // Dedicated Wishlist Page
  wishlistPageGrid: document.getElementById('wishlist-page-grid'),
  wishlistEmptyState: document.getElementById('wishlist-empty-state'),

  // Dedicated Cart Page
  cartPageItemsContainer: document.getElementById('cart-page-items-container'),
  cartPageLayout: document.getElementById('cart-page-layout'),
  cartEmptyState: document.getElementById('cart-empty-state'),
  pageCartGrandTotal: document.getElementById('page-cart-grand-total'),
  pageCheckoutBtn: document.getElementById('page-checkout-btn'),

  // Dedicated 2-Step Checkout Wizard
  wizardStepInd1: document.getElementById('wizard-step-ind-1'),
  wizardStepInd2: document.getElementById('wizard-step-ind-2'),
  checkoutStep1Info: document.getElementById('checkout-step-1-info'),
  checkoutStep2Payment: document.getElementById('checkout-step-2-payment'),
  checkoutStep1Form: document.getElementById('checkout-step-1-form'),
  checkoutStep2Form: document.getElementById('checkout-step-2-form'),
  chkStep1Name: document.getElementById('chk-step1-name'),
  chkStep1Email: document.getElementById('chk-step1-email'),
  chkStep1Phone: document.getElementById('chk-step1-phone'),
  chkStep1City: document.getElementById('chk-step1-city'),
  chkStep1Address: document.getElementById('chk-step1-address'),
  chkStep1Zip: document.getElementById('chk-step1-zip'),
  step1ItemsPreview: document.getElementById('step1-items-preview'),
  step1ErrorFeedback: document.getElementById('step1-error-feedback'),
  step2ItemsPreview: document.getElementById('step2-items-preview'),
  step2ErrorFeedback: document.getElementById('step2-error-feedback'),
  btnBackToStep1: document.getElementById('btn-back-to-step-1'),
  pagePlaceOrderBtn: document.getElementById('page-place-order-btn'),

  // Dynamic Payment Containers
  boxPayEasypaisa: document.getElementById('box-pay-easypaisa'),
  boxPayCard: document.getElementById('box-pay-card'),
  paySenderNumber: document.getElementById('pay-sender-number'),
  payTrxId: document.getElementById('pay-trx-id'),
  payCardName: document.getElementById('pay-card-name'),
  payCardNumber: document.getElementById('pay-card-number'),
  payCardExpiry: document.getElementById('pay-card-expiry'),
  payCardCvv: document.getElementById('pay-card-cvv'),
  pageChkSubtotal: document.getElementById('page-chk-subtotal'),
  pageChkDiscountRow: document.getElementById('page-chk-discount-row'),
  pageChkDiscount: document.getElementById('page-chk-discount'),
  pageChkShipping: document.getElementById('page-chk-shipping'),
  pageChkTax: document.getElementById('page-chk-tax'),
  pageChkTotal: document.getElementById('page-chk-total'),

  // Photorealistic Real Receipt Page (#receipt)
  receiptOrderNumber: document.getElementById('receipt-order-number'),
  receiptOrderDate: document.getElementById('receipt-order-date'),
  receiptCustomerName: document.getElementById('receipt-customer-name'),
  receiptCustomerPhone: document.getElementById('receipt-customer-phone'),
  receiptCustomerEmail: document.getElementById('receipt-customer-email'),
  receiptPaymentMethod: document.getElementById('receipt-payment-method'),
  receiptCustomerAddress: document.getElementById('receipt-customer-address'),
  receiptItemsList: document.getElementById('receipt-items-list'),
  receiptSubtotal: document.getElementById('receipt-subtotal'),
  receiptShipping: document.getElementById('receipt-shipping'),
  receiptTax: document.getElementById('receipt-tax'),
  receiptTotalAmount: document.getElementById('receipt-total-amount'),
  receiptBarcodeText: document.getElementById('receipt-barcode-text'),

  // Dedicated Account Page
  accountPageAvatar: document.getElementById('account-page-avatar'),
  accountPageUsername: document.getElementById('account-page-username'),
  accountPageUseremail: document.getElementById('account-page-useremail'),
  accountPageLogoutBtn: document.getElementById('account-page-logout-btn'),
  metricOrdersCount: document.getElementById('metric-orders-count'),
  metricWishlistCount: document.getElementById('metric-wishlist-count'),
  metricCartCount: document.getElementById('metric-cart-count'),
  accountTabBtns: document.querySelectorAll('.account-tab-nav'),
  accountPanes: {
    profile: document.getElementById('pane-page-profile'),
    password: document.getElementById('pane-page-password'),
    forgot: document.getElementById('pane-page-forgot'),
    orders: document.getElementById('pane-page-orders'),
    faqs: document.getElementById('pane-page-faqs')
  },
  pageUpdateProfileForm: document.getElementById('page-update-profile-form'),
  pageProfileNameInput: document.getElementById('page-profile-name-input'),
  pageProfileEmailReadonly: document.getElementById('page-profile-email-readonly'),
  pageProfileFeedback: document.getElementById('page-profile-feedback'),
  pageChangePasswordForm: document.getElementById('page-change-password-form'),
  pageChangePwdFeedback: document.getElementById('page-change-pwd-feedback'),
  pageForgotEmailInput: document.getElementById('page-forgot-email-input'),
  pageForgotSendOtpBtn: document.getElementById('page-forgot-send-otp-btn'),
  pageForgotReqFeedback: document.getElementById('page-forgot-req-feedback'),
  pageForgotStep1: document.getElementById('page-forgot-step-1'),
  pageForgotStep2: document.getElementById('page-forgot-step-2'),
  pageForgotTargetEmailText: document.getElementById('page-forgot-target-email-text'),
  pageForgotOtpInput: document.getElementById('page-forgot-otp-input'),
  pageForgotNewPwdInput: document.getElementById('page-forgot-new-pwd-input'),
  pageForgotSubmitResetBtn: document.getElementById('page-forgot-submit-reset-btn'),
  pageForgotResetFeedback: document.getElementById('page-forgot-reset-feedback'),
  pageOrdersListContainer: document.getElementById('page-orders-list-container'),
  pageFaqsAccordion: document.getElementById('page-faqs-accordion'),

  // Dedicated Auth Page
  pageAuthMainView: document.getElementById('page-auth-main-view'),
  pageLoginForm: document.getElementById('page-login-form'),
  pageRegisterForm: document.getElementById('page-register-form'),
  pageLoginFeedback: document.getElementById('page-login-feedback'),
  pageRegisterFeedback: document.getElementById('page-register-feedback'),
  pageSwitchToRegister: document.getElementById('page-switch-to-register'),
  pageSwitchToLogin: document.getElementById('page-switch-to-login'),
  pageSwitchToForgot: document.getElementById('page-switch-to-forgot'),
  pageOtpScreen: document.getElementById('page-otp-screen'),
  pageOtpTargetEmail: document.getElementById('page-otp-target-email'),
  pageOtpVerifyForm: document.getElementById('page-otp-verify-form'),
  pageOtpVerifyFeedback: document.getElementById('page-otp-verify-feedback'),
  pageVerifyOtpSubmitBtn: document.getElementById('page-verify-otp-submit-btn'),
  pageResendOtpBtn: document.getElementById('page-resend-otp-btn'),
  pageResendTimerText: document.getElementById('page-resend-timer-text'),
  pageBackToAuthBtn: document.getElementById('page-back-to-auth-btn'),

  // AI Camera & Visual Search Modal
  openVisualSearchBtn: document.getElementById('open-visual-search-btn'),
  visualSearchModalBackdrop: document.getElementById('visual-search-modal-backdrop'),
  closeVisualSearchBtn: document.getElementById('close-visual-search-btn'),
  tabVisualCamera: document.getElementById('tab-visual-camera'),
  tabVisualGallery: document.getElementById('tab-visual-gallery'),
  paneVisualCamera: document.getElementById('pane-visual-camera'),
  paneVisualGallery: document.getElementById('pane-visual-gallery'),
  cameraFeed: document.getElementById('camera-feed'),
  cameraCanvas: document.getElementById('camera-canvas'),
  cameraPromptOverlay: document.getElementById('camera-prompt-overlay'),
  startCameraStreamBtn: document.getElementById('start-camera-stream-btn'),
  capturePhotoBtn: document.getElementById('capture-photo-btn'),
  galleryDropzone: document.getElementById('gallery-dropzone'),
  galleryFileInput: document.getElementById('gallery-file-input'),
  triggerFileSelectBtn: document.getElementById('trigger-file-select-btn'),
  visualAnalysisContainer: document.getElementById('visual-analysis-container'),
  aiDetectedTagsRow: document.getElementById('ai-detected-tags-row'),
  visualResultsGrid: document.getElementById('visual-results-grid'),

  // Bottom Navigation Bar
  bottomNavHome: document.getElementById('bottom-nav-home'),
  bottomNavWishlist: document.getElementById('bottom-nav-wishlist'),
  bottomNavCart: document.getElementById('bottom-nav-cart'),
  bottomNavAccount: document.getElementById('bottom-nav-account'),
  bottomWishlistBadge: document.getElementById('bottom-wishlist-badge'),
  bottomCartBadge: document.getElementById('bottom-cart-badge'),

  // Toast Container
  toastContainer: document.getElementById('toast-container')
};

/* ==========================================================================
   NAVIGATION & PAGE ROUTER
   ========================================================================== */
function isUserAdmin(user) {
  if (!user) {
    try {
      const saved = JSON.parse(localStorage.getItem('aashop_user') || 'null');
      if (saved) {
        const em = (saved.email || '').toLowerCase().trim();
        return saved.is_admin === 1 || saved.is_admin === '1' || saved.is_admin === true || em === 'ubaidmehar@gmail.com';
      }
    } catch (e) {}
    return false;
  }
  const email = (user.email || '').toLowerCase().trim();
  return user.is_admin === 1 || user.is_admin === '1' || user.is_admin === true || email === 'ubaidmehar@gmail.com';
}

function getActiveRouteFromUrlOrStorage() {
  let hash = window.location.hash ? window.location.hash.replace(/^[#/?&]+/, '').trim().toLowerCase() : '';
  if (!hash && window.location.href.includes('#')) {
    const parts = window.location.href.split('#');
    if (parts[1]) hash = parts[1].replace(/^[/?&]+/, '').trim().toLowerCase();
  }
  if (hash && hash !== 'home') return hash;

  const stored = localStorage.getItem('aashop_active_route') || sessionStorage.getItem('aashop_current_page');
  if (stored && stored !== 'home') return stored.replace(/^[#/?&]+/, '').trim().toLowerCase();
  return hash || 'home';
}

function applyImmediatePageVisibility(targetPage) {
  const cleanPage = targetPage ? targetPage.replace(/^[#/?&]+/, '').toLowerCase() : 'home';
  const validPages = [
    'home', 'product-detail', 'wishlist', 'cart', 'account',
    'account-profile', 'account-password', 'account-orders',
    'account-faqs', 'ai-chat', 'checkout', 'receipt', 'auth',
    'admin', 'admin-product-edit'
  ];
  const target = validPages.includes(cleanPage) ? cleanPage : 'home';

  validPages.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) {
      el.classList.toggle('hidden', p !== target);
    }
  });

  const mainNavbar = document.getElementById('main-navbar');
  if (mainNavbar) {
    mainNavbar.style.display = target === 'home' ? 'block' : 'none';
  }
}

function navigateTo(page, subParam = null) {
  const cleanPage = page ? page.replace(/^[#/?&]+/, '').toLowerCase() : 'home';
  const pageEl = elements.pages[cleanPage] || document.getElementById('page-' + cleanPage);
  const targetPage = pageEl ? cleanPage : 'home';

  // Protect Account pages if not signed in (except faqs, ai-chat, forgot)
  if (
    (targetPage === 'account' || targetPage === 'account-profile' || targetPage === 'account-password' || targetPage === 'account-orders') &&
    !state.currentUser
  ) {
    navigateTo('auth');
    showToast('Please sign in to access your Account Center', 'info');
    return;
  }

  // Protect Admin Portal & Product Studio
  if (targetPage === 'admin' || targetPage === 'admin-product-edit') {
    if (!isUserAdmin(state.currentUser)) {
      showToast('Access Denied: Admin authorization required.', 'error');
      navigateTo('home');
      return;
    }
  }

  state.currentPage = targetPage;
  window.location.hash = targetPage;
  localStorage.setItem('aashop_active_route', targetPage);
  sessionStorage.setItem('aashop_current_page', targetPage);
  document.body.setAttribute('data-page', targetPage);

  // Show header search navbar ONLY on home screen (hidden on all sub-pages)
  const mainNavbar = document.getElementById('main-navbar');
  if (mainNavbar) {
    mainNavbar.style.display = targetPage === 'home' ? 'block' : 'none';
  }

  // Toggle page visibility
  Object.keys(elements.pages).forEach(pKey => {
    if (elements.pages[pKey]) {
      elements.pages[pKey].classList.toggle('hidden', pKey !== targetPage);
    }
  });

  // Toggle between Customer Bottom Nav and Admin Dedicated Bottom Nav
  const customerBottomNav = document.getElementById('app-bottom-nav');
  const adminBottomNav = document.getElementById('admin-bottom-nav');
  const isAdminScreen = targetPage === 'admin' || targetPage === 'admin-product-edit';

  if (customerBottomNav) {
    customerBottomNav.classList.toggle('hidden', isAdminScreen);
    customerBottomNav.style.display = isAdminScreen ? 'none' : 'flex';
  }
  if (adminBottomNav) {
    adminBottomNav.classList.toggle('hidden', !isAdminScreen);
    adminBottomNav.style.display = isAdminScreen ? 'flex' : 'none';

    // Update active states on Admin bottom nav
    const bOrders = document.getElementById('admin-bottom-orders');
    const bProducts = document.getElementById('admin-bottom-products');
    const bAccount = document.getElementById('admin-bottom-account');
    const bAdd = document.getElementById('admin-bottom-add');

    if (targetPage === 'admin-product-edit') {
      if (bOrders) bOrders.classList.remove('active');
      if (bProducts) bProducts.classList.remove('active');
      if (bAccount) bAccount.classList.remove('active');
      if (bAdd) bAdd.classList.add('active');
    } else {
      if (bOrders) bOrders.classList.toggle('active', adminState.activeTab === 'orders');
      if (bProducts) bProducts.classList.toggle('active', adminState.activeTab === 'products');
      if (bAccount) bAccount.classList.toggle('active', adminState.activeTab === 'account');
      if (bAdd) bAdd.classList.remove('active');
    }
  }

  // Update customer bottom navigation bar active state
  const isAccountTab = targetPage.startsWith('account') || targetPage === 'ai-chat';
  if (elements.bottomNavHome) elements.bottomNavHome.classList.toggle('active', targetPage === 'home');
  if (elements.bottomNavWishlist) elements.bottomNavWishlist.classList.toggle('active', targetPage === 'wishlist');
  if (elements.bottomNavCart) elements.bottomNavCart.classList.toggle('active', targetPage === 'cart');
  if (elements.bottomNavAccount) elements.bottomNavAccount.classList.toggle('active', isAccountTab);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Route specific rendering
  if (targetPage === 'home') {
    renderProducts(state.products);
  } else if (targetPage === 'product-detail') {
    if (subParam) openProductDetailPage(subParam);
  } else if (targetPage === 'wishlist') {
    renderWishlistPage();
  } else if (targetPage === 'cart') {
    renderCartPage();
  } else if (targetPage === 'account') {
    renderAccountPage();
  } else if (targetPage === 'account-profile') {
    renderAccountProfilePage();
  } else if (targetPage === 'account-password') {
    renderAccountPasswordPage();
  } else if (targetPage === 'account-orders') {
    renderAccountOrdersPage();
  } else if (targetPage === 'account-faqs') {
    renderAccountFaqsPage();
  } else if (targetPage === 'ai-chat') {
    renderAiChatPage();
  } else if (targetPage === 'admin') {
    renderAdminPortal();
  } else if (targetPage === 'admin-product-edit') {
    renderAdminProductEditorPage(subParam);
  } else if (targetPage === 'checkout') {
    renderCheckoutPage();
  } else if (targetPage === 'auth') {
    renderAuthPage('login');
  }
}

function renderAiChatPage() {
  const container = document.getElementById('ai-chat-messages');
  if (container && container.children.length === 0) {
    appendAiMessage('bot', "Hello! I am your AA Shop AI Shopping Assistant. How can I help you discover products, compare specs, or check your orders today? 🛍️✨");
  }
}

/* ==========================================================================
   PAGE 9: MASTER ADMIN PORTAL (#admin)
   ========================================================================== */
let adminState = {
  activeTab: 'orders',
  stats: null,
  orders: [],
  products: [],
  ordersFilterStatus: 'all',
  ordersSearchQuery: '',
  productsSearchQuery: ''
};

function renderAdminPortal() {
  const isAdmin = state.currentUser && (state.currentUser.is_admin === 1 || (state.currentUser.email && state.currentUser.email.toLowerCase() === 'ubaidmehar@gmail.com'));
  if (!isAdmin) {
    showToast('Access Denied: Admin authorization required.', 'error');
    navigateTo('home');
    return;
  }

  // Populate admin profile info
  const nameEl = document.getElementById('admin-profile-name');
  const emailEl = document.getElementById('admin-profile-email');
  if (nameEl) nameEl.textContent = (state.currentUser && state.currentUser.name) || 'Ubaid Mehar';
  if (emailEl) emailEl.textContent = (state.currentUser && state.currentUser.email) || 'ubaidmehar@gmail.com';

  fetchAdminStats();
  fetchAdminOrders();
  fetchAdminProducts();
  fetchAdminSettings();
}

function switchAdminTab(tab) {
  if (state.currentPage !== 'admin') {
    navigateTo('admin');
  }

  adminState.activeTab = tab;

  const paneOrders = document.getElementById('admin-pane-orders');
  const paneProducts = document.getElementById('admin-pane-products');
  const paneBroadcast = document.getElementById('admin-pane-broadcast');
  const paneAccount = document.getElementById('admin-pane-account');

  if (paneOrders) paneOrders.classList.toggle('hidden', tab !== 'orders');
  if (paneProducts) paneProducts.classList.toggle('hidden', tab !== 'products');
  if (paneBroadcast) paneBroadcast.classList.toggle('hidden', tab !== 'broadcast');
  if (paneAccount) paneAccount.classList.toggle('hidden', tab !== 'account');

  if (tab === 'account') {
    fetchAdminSettings();
  } else if (tab === 'broadcast') {
    fetchAdminBroadcasts();
  }

  // Update Admin Bottom Nav buttons
  const bOrders = document.getElementById('admin-bottom-orders');
  const bProducts = document.getElementById('admin-bottom-products');
  const bBroadcast = document.getElementById('admin-bottom-broadcast');
  const bAccount = document.getElementById('admin-bottom-account');
  const bAdd = document.getElementById('admin-bottom-add');

  if (bOrders) bOrders.classList.toggle('active', tab === 'orders');
  if (bProducts) bProducts.classList.toggle('active', tab === 'products');
  if (bBroadcast) bBroadcast.classList.toggle('active', tab === 'broadcast');
  if (bAccount) bAccount.classList.toggle('active', tab === 'account');
  if (bAdd) bAdd.classList.remove('active');
}

// Real-time broadcast compose preview
function updateBroadcastPreview() {
  const title = document.getElementById('broadcast-title')?.value.trim() || '🔥 Flash Sale 50% Off Today!';
  const msg = document.getElementById('broadcast-message')?.value.trim() || 'Use promo code FLASH50 at checkout to get instant 50% discount across all categories!';
  
  const pTitle = document.getElementById('preview-broadcast-title');
  const pMsg = document.getElementById('preview-broadcast-msg');
  if (pTitle) pTitle.textContent = title;
  if (pMsg) pMsg.textContent = msg;
}

// Send store-wide broadcast push notification
async function handleSendBroadcast(e) {
  if (e) e.preventDefault();
  const token = state.token || localStorage.getItem('aashop_token');
  if (!token) return;

  const title = document.getElementById('broadcast-title')?.value.trim();
  const message = document.getElementById('broadcast-message')?.value.trim();
  const type = document.getElementById('broadcast-type')?.value || 'announcement';
  const target = document.getElementById('broadcast-target')?.value || 'all';
  const btn = document.getElementById('btn-send-broadcast');

  if (!title || !message) {
    showToast('Please enter title and message.', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Broadcasting to All Store Customers...';
  }

  try {
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, message, type, target })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Broadcast notification sent to all customers! 📢', 'success');
      document.getElementById('broadcast-title').value = '';
      document.getElementById('broadcast-message').value = '';
      fetchAdminBroadcasts();
      fetchPublicBroadcasts();
    } else {
      showToast(data.message || 'Failed to send broadcast.', 'error');
    }
  } catch (err) {
    console.error('Error broadcasting notification:', err);
    showToast('Server error sending broadcast.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Broadcast to All Customers Now';
    }
  }
}

// Fetch sent broadcasts history
async function fetchAdminBroadcasts() {
  const token = state.token || localStorage.getItem('aashop_token');
  const container = document.getElementById('admin-broadcasts-history-list');
  if (!token || !container) return;

  try {
    const res = await fetch('/api/admin/broadcasts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.broadcasts) {
      if (data.broadcasts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center p-3" style="font-size: 0.84rem;">No broadcasts sent yet.</p>';
        return;
      }

      container.innerHTML = data.broadcasts.map(b => `
        <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 0.88rem; color: #fff;">${escapeHtml(b.title)}</strong>
            <span style="font-size: 0.72rem; color: var(--text-muted);">${new Date(b.created_at || Date.now()).toLocaleDateString()}</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">${escapeHtml(b.message)}</p>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading broadcasts:', err);
  }
}

// Customer Store Notifications Center
let notificationsOpen = false;
function toggleNotificationsDropdown() {
  notificationsOpen = !notificationsOpen;
  const menu = document.getElementById('notifications-dropdown-menu');
  if (menu) menu.classList.toggle('hidden', !notificationsOpen);
  if (notificationsOpen) fetchPublicBroadcasts();
}

async function fetchPublicBroadcasts() {
  const listEl = document.getElementById('notif-items-list');
  const badgeEl = document.getElementById('notifications-unread-badge');
  if (!listEl) return;

  try {
    const res = await fetch('/api/admin/public-broadcasts');
    const data = await res.json();
    if (data.success && data.broadcasts) {
      if (badgeEl) {
        badgeEl.textContent = data.broadcasts.length;
        badgeEl.style.display = data.broadcasts.length > 0 ? 'inline-block' : 'none';
      }

      if (data.broadcasts.length === 0) {
        listEl.innerHTML = '<p class="text-muted text-center p-3" style="font-size: 0.82rem;">No new announcements.</p>';
        return;
      }

      listEl.innerHTML = data.broadcasts.map(b => `
        <div style="border-bottom: 1px solid var(--border-subtle); padding: 8px 0;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
            <i class="fa-solid fa-bullhorn text-primary-aa" style="font-size: 0.75rem;"></i>
            <strong style="font-size: 0.84rem; color: #fff;">${escapeHtml(b.title)}</strong>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">${escapeHtml(b.message)}</p>
          <small class="text-muted" style="font-size: 0.7rem;">${new Date(b.created_at || Date.now()).toLocaleDateString()}</small>
        </div>
      `).join('');
    }
  } catch (err) {}
}

function markAllNotificationsRead() {
  const badgeEl = document.getElementById('notifications-unread-badge');
  if (badgeEl) badgeEl.style.display = 'none';
  showToast('Notifications marked as read.', 'info');
}

// AI Order Verification Simulator (YES -> Confirmed, NO -> Cancelled)
async function handleSimulateAiVerification(orderId, response) {
  try {
    const res = await fetch('/api/orders/verify-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, response })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, response === 'yes' ? 'success' : 'info');
      fetchAdminOrders();
      fetchAdminStats();
    } else {
      showToast(data.message || 'Verification failed', 'error');
    }
  } catch (err) {
    console.error('Error verifying order via AI:', err);
    showToast('Network error during AI verification.', 'error');
  }
}

// Sub-view switcher for Admin Account (Hub, Profile, Password, Payments)
function openAdminAccountSubView(subView) {
  const hubView = document.getElementById('admin-account-hub-view');
  const profileView = document.getElementById('admin-subview-profile');
  const passwordView = document.getElementById('admin-subview-password');
  const paymentsView = document.getElementById('admin-subview-payments');

  if (hubView) hubView.classList.toggle('hidden', subView !== 'hub');
  if (profileView) profileView.classList.toggle('hidden', subView !== 'profile');
  if (passwordView) passwordView.classList.toggle('hidden', subView !== 'password');
  if (paymentsView) paymentsView.classList.toggle('hidden', subView !== 'payments');

  // Scroll to top of pane
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Fetch and populate store settings and admin profile in Settings tab
async function fetchAdminSettings() {
  const token = state.token || localStorage.getItem('aashop_token');
  if (!token) return;

  try {
    const res = await fetch('/api/admin/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const s = data.settings || {};
      const admin = data.admin || {};

      // Populate profile fields
      const inputName = document.getElementById('admin-input-name');
      const inputEmail = document.getElementById('admin-input-email');
      const profileName = document.getElementById('admin-profile-name');
      const profileEmail = document.getElementById('admin-profile-email');
      const hubName = document.getElementById('admin-account-page-username');
      const hubEmail = document.getElementById('admin-account-page-useremail');
      const topName = document.getElementById('admin-top-header-name');
      const topEmail = document.getElementById('admin-top-header-email');

      const adminNameStr = admin.name || (state.currentUser && state.currentUser.name) || 'Ubaid Mehar';
      const adminEmailStr = admin.email || (state.currentUser && state.currentUser.email) || 'ubaidmehar@gmail.com';

      if (inputName) inputName.value = adminNameStr;
      if (inputEmail) inputEmail.value = adminEmailStr;
      if (profileName) profileName.textContent = adminNameStr;
      if (profileEmail) profileEmail.textContent = adminEmailStr;
      if (hubName) hubName.textContent = adminNameStr;
      if (hubEmail) hubEmail.textContent = adminEmailStr;
      if (topName) topName.textContent = adminNameStr;
      if (topEmail) topEmail.textContent = adminEmailStr;

      // Populate Payment & WhatsApp Settings
      const setWhatsApp = document.getElementById('admin-setting-whatsapp');
      const setEasypaisaNo = document.getElementById('admin-setting-easypaisa-no');
      const setEasypaisaTitle = document.getElementById('admin-setting-easypaisa-title');
      const setJazzCashNo = document.getElementById('admin-setting-jazzcash-no');
      const setJazzCashTitle = document.getElementById('admin-setting-jazzcash-title');
      const setBankName = document.getElementById('admin-setting-bank-name');
      const setBankNo = document.getElementById('admin-setting-bank-no');
      const setBankTitle = document.getElementById('admin-setting-bank-title');

      if (setWhatsApp) setWhatsApp.value = s.whatsapp_number || '03298024266';
      if (setEasypaisaNo) setEasypaisaNo.value = s.easypaisa_number || '03298024266';
      if (setEasypaisaTitle) setEasypaisaTitle.value = s.easypaisa_title || 'Ubaid Mehar';
      if (setJazzCashNo) setJazzCashNo.value = s.jazzcash_number || '03298024266';
      if (setJazzCashTitle) setJazzCashTitle.value = s.jazzcash_title || 'Ubaid Mehar';
      if (setBankName) setBankName.value = s.bank_name || 'Meezan Bank Ltd';
      if (setBankNo) setBankNo.value = s.bank_account_number || '01020304050607';
      if (setBankTitle) setBankTitle.value = s.bank_account_title || 'Ubaid Mehar';

      // Update Hub Metric Counts
      const mOrders = document.getElementById('admin-metric-orders-count');
      const mRevenue = document.getElementById('admin-metric-revenue-count');
      const mCatalog = document.getElementById('admin-metric-catalog-count');
      if (mOrders && adminState.stats) mOrders.textContent = adminState.stats.total_orders || '0';
      if (mRevenue && adminState.stats) mRevenue.textContent = formatMoney(adminState.stats.total_sales || 0);
      if (mCatalog && adminState.stats) mCatalog.textContent = adminState.stats.total_products || '23';

      if (admin.avatar_url) {
        const avatarImg = document.getElementById('admin-profile-avatar-img');
        const avatarLetter = document.getElementById('admin-profile-avatar-letter');
        const hubAvatar = document.getElementById('admin-account-page-avatar');
        if (avatarImg) {
          avatarImg.src = admin.avatar_url;
          avatarImg.classList.remove('hidden');
        }
        if (avatarLetter) avatarLetter.classList.add('hidden');
        if (hubAvatar) {
          hubAvatar.innerHTML = `<img src="${admin.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="Admin Avatar" />`;
        }
      }
    }
  } catch (err) {
    console.error('Error fetching admin settings:', err);
  }
}

let pendingAdminAvatarBase64 = null;

// Handle Admin Profile Photo Selection (Camera / Gallery Upload)
function handleAdminProfilePhotoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Photo is too large. Please select an image under 5MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const base64Data = evt.target.result;
    pendingAdminAvatarBase64 = base64Data;

    const previewImg = document.getElementById('admin-profile-avatar-img');
    const letter = document.getElementById('admin-profile-avatar-letter');
    if (previewImg) {
      previewImg.src = base64Data;
      previewImg.classList.remove('hidden');
    }
    if (letter) letter.classList.add('hidden');
    showToast('Photo selected! Click "Save Admin Profile & Photo" to apply.', 'info');
  };
  reader.readAsDataURL(file);
}

// 1. Update Admin Profile (Name, Email & Photo)
async function handleSaveAdminProfileForm(e) {
  if (e) e.preventDefault();
  const token = state.token || localStorage.getItem('aashop_token');
  if (!token) return;

  const name = document.getElementById('admin-input-name')?.value.trim();
  const email = document.getElementById('admin-input-email')?.value.trim();
  const btn = document.getElementById('btn-save-admin-profile');
  const feedback = document.getElementById('admin-profile-feedback');

  if (!name || !email) {
    showToast('Name and email are required.', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const payload = { name, email };
    if (pendingAdminAvatarBase64) {
      payload.avatar_url = pendingAdminAvatarBase64;
    }

    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast('Admin Profile & Photo saved successfully! 👤', 'success');
      if (state.currentUser) {
        state.currentUser.name = name;
        state.currentUser.email = email;
        if (data.admin?.avatar_url) state.currentUser.avatar_url = data.admin.avatar_url;
        localStorage.setItem('aashop_user', JSON.stringify(state.currentUser));
      }
      fetchAdminSettings();
      openAdminAccountSubView('hub');
    } else {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = data.message || 'Failed to update profile.';
        feedback.classList.remove('hidden');
      }
      showToast(data.message || 'Failed to update profile.', 'error');
    }
  } catch (err) {
    console.error('Error updating admin profile:', err);
    showToast('Server error updating profile.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Admin Profile & Photo';
    }
  }
}

// 2. Change Admin Password
async function handleSaveAdminPasswordForm(e) {
  if (e) e.preventDefault();
  const token = state.token || localStorage.getItem('aashop_token');
  if (!token) return;

  const curPass = document.getElementById('admin-input-cur-pass')?.value;
  const newPass = document.getElementById('admin-input-new-pass')?.value;
  const confirmPass = document.getElementById('admin-input-confirm-pass')?.value;
  const btn = document.getElementById('btn-save-admin-password');

  if (!curPass || !newPass) {
    showToast('Please enter your current and new password.', 'error');
    return;
  }

  if (newPass.length < 6) {
    showToast('New password must be at least 6 characters.', 'error');
    return;
  }

  if (newPass !== confirmPass) {
    showToast('New password and confirm password do not match.', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Changing...';
  }

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        current_password: curPass,
        new_password: newPass
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Admin password changed successfully! 🔒', 'success');
      document.getElementById('admin-input-cur-pass').value = '';
      document.getElementById('admin-input-new-pass').value = '';
      document.getElementById('admin-input-confirm-pass').value = '';
    } else {
      showToast(data.message || 'Failed to change password.', 'error');
    }
  } catch (err) {
    console.error('Error changing admin password:', err);
    showToast('Server error changing password.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Update Password';
    }
  }
}

// 3. Save Store Payment Numbers & WhatsApp Number
async function handleSaveAdminPaymentSettings(e) {
  if (e) e.preventDefault();
  const token = state.token || localStorage.getItem('aashop_token');
  if (!token) return;

  const btn = document.getElementById('btn-save-payment-settings');
  const whatsapp_number = document.getElementById('admin-setting-whatsapp')?.value.trim();
  const easypaisa_number = document.getElementById('admin-setting-easypaisa-no')?.value.trim();
  const easypaisa_title = document.getElementById('admin-setting-easypaisa-title')?.value.trim();
  const jazzcash_number = document.getElementById('admin-setting-jazzcash-no')?.value.trim();
  const jazzcash_title = document.getElementById('admin-setting-jazzcash-title')?.value.trim();
  const bank_name = document.getElementById('admin-setting-bank-name')?.value.trim();
  const bank_account_number = document.getElementById('admin-setting-bank-no')?.value.trim();
  const bank_account_title = document.getElementById('admin-setting-bank-title')?.value.trim();

  if (!whatsapp_number) {
    showToast('WhatsApp number is required.', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        whatsapp_number,
        easypaisa_number,
        easypaisa_title,
        jazzcash_number,
        jazzcash_title,
        bank_name,
        bank_account_number,
        bank_account_title
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Store Payment Accounts & WhatsApp Number updated! ⚙️', 'success');
      syncDynamicStoreConfig();
    } else {
      showToast(data.message || 'Failed to update store settings.', 'error');
    }
  } catch (err) {
    console.error('Error saving store settings:', err);
    showToast('Server error saving settings.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Save Store Payments & WhatsApp Settings';
    }
  }
}

// Helper: Toggle Password visibility inside field
function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  if (btnEl) {
    const icon = btnEl.querySelector('i');
    if (icon) {
      icon.className = isPass ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    }
  }
}

// Fetch public store config and sync customer WhatsApp widgets & checkout merchant badges
async function syncDynamicStoreConfig() {
  try {
    const res = await fetch('/api/admin/public-config');
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      state.storeSettings = s;

      const waRaw = s.whatsapp_number || '03298024266';
      let waDigits = waRaw.replace(/[^0-9]/g, '');
      if (waDigits.startsWith('0')) waDigits = '92' + waDigits.substring(1);

      const targetHref = `https://wa.me/${waDigits}?text=Hello%20AA%20Shop%20Support%2C%20I%20need%20assistance`;

      // Update floating widget
      const floatingWidget = document.querySelector('.floating-whatsapp-widget');
      if (floatingWidget) {
        floatingWidget.href = targetHref;
      }

      // Update support cards
      const supportCardLink = document.getElementById('customer-support-whatsapp-link');
      if (supportCardLink) {
        supportCardLink.href = targetHref;
      }

      // Update Checkout Merchant Receiving Badges
      const epNum = document.getElementById('chk-easypaisa-merchant-num');
      const epTitle = document.getElementById('chk-easypaisa-merchant-title');
      const jcNum = document.getElementById('chk-jazzcash-merchant-num');
      const jcTitle = document.getElementById('chk-jazzcash-merchant-title');
      const gwEpDest = document.getElementById('gw-easypaisa-dest');
      const gwJcDest = document.getElementById('gw-jazzcash-dest');
      const gwCardDest = document.getElementById('gw-card-dest');

      if (epNum) epNum.textContent = s.easypaisa_number || '0329-8024266';
      if (epTitle) epTitle.textContent = s.easypaisa_title || 'Ubaid Mehar';
      if (jcNum) jcNum.textContent = s.jazzcash_number || '0329-8024266';
      if (jcTitle) jcTitle.textContent = s.jazzcash_title || 'Ubaid Mehar';

      if (gwEpDest) gwEpDest.textContent = `AA Shop (${s.easypaisa_number || '03298024266'} - ${s.easypaisa_title || 'Ubaid Mehar'})`;
      if (gwJcDest) gwJcDest.textContent = `AA Shop (${s.jazzcash_number || '03298024266'} - ${s.jazzcash_title || 'Ubaid Mehar'})`;
      if (gwCardDest) gwCardDest.textContent = `${s.bank_name || 'Meezan Bank'} - AA Shop (${s.bank_account_number || '01020304050607'})`;
    }
  } catch (e) {}
}

// ==========================================================================
// THEME MANAGEMENT ENGINE (Pitch Black OLED Dark & Clean Crisp Light)
// ==========================================================================
function initTheme() {
  const saved = localStorage.getItem('aashop_theme') || 'dark';
  setTheme(saved, false);
}

function setTheme(theme, showToastMsg = true) {
  state.currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  if (document.body) {
    document.body.setAttribute('data-theme', theme);
  }
  localStorage.setItem('aashop_theme', theme);

  // Update Header Icon
  const icon = document.getElementById('theme-header-icon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-moon text-warning' : 'fa-solid fa-sun text-warning';
  }

  // Update User Account Cards
  const uDark = document.getElementById('theme-card-user-dark');
  const uLight = document.getElementById('theme-card-user-light');
  if (uDark) uDark.classList.toggle('active', theme === 'dark');
  if (uLight) uLight.classList.toggle('active', theme === 'light');

  // Update Admin Account Cards
  const aDark = document.getElementById('theme-card-admin-dark');
  const aLight = document.getElementById('theme-card-admin-light');
  if (aDark) aDark.classList.toggle('active', theme === 'dark');
  if (aLight) aLight.classList.toggle('active', theme === 'light');

  if (showToastMsg) {
    showToast(theme === 'dark' ? 'Switched to Pitch Black OLED Theme 🌙' : 'Switched to Clean Crisp Day Theme ☀️', 'info');
  }
}

function toggleTheme() {
  const cur = state.currentTheme || document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  setTheme(next, true);
}

// Handler for top right Header "Sign In / Sign Up / Account" button
function handleHeaderAccountClick() {
  const user = state.currentUser || JSON.parse(localStorage.getItem('aashop_user') || 'null');
  const token = state.token || localStorage.getItem('aashop_token');

  if (user && token) {
    if (user.role === 'admin') {
      navigateTo('admin');
    } else {
      navigateTo('account');
    }
  } else {
    navigateTo('auth');
  }
}

// Synchronize Header User Avatar and Text based on auth status
function syncHeaderUserButton() {
  const user = state.currentUser || JSON.parse(localStorage.getItem('aashop_user') || 'null');
  const token = state.token || localStorage.getItem('aashop_token');
  const textEl = document.getElementById('auth-btn-text');
  const avatarEl = document.getElementById('header-user-avatar');
  const btnEl = document.getElementById('nav-account-btn');

  if (user && token) {
    if (textEl) textEl.textContent = user.name || (user.role === 'admin' ? 'Admin' : 'My Account');
    if (avatarEl) {
      if (user.avatar_url) {
        avatarEl.innerHTML = `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${user.name}" />`;
      } else if (user.role === 'admin') {
        avatarEl.innerHTML = `<i class="fa-solid fa-crown text-warning"></i>`;
      } else {
        const initial = (user.name || 'U').charAt(0).toUpperCase();
        avatarEl.innerHTML = `<span style="font-weight:800;">${initial}</span>`;
      }
    }
    if (btnEl) btnEl.title = user.role === 'admin' ? 'Admin Dashboard' : 'My Account';
  } else {
    if (textEl) textEl.textContent = 'Sign In / Sign Up';
    if (avatarEl) avatarEl.innerHTML = `<i class="fa-regular fa-user"></i>`;
    if (btnEl) btnEl.title = 'Sign In / Sign Up';
  }
}

// Notification Dropdown and Badge Handlers
function toggleNotificationsDropdown() {
  const menu = document.getElementById('notifications-dropdown-menu');
  const badge = document.getElementById('notifications-unread-badge');
  if (!menu) return;

  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
    // Clear notification badge
    if (badge) {
      badge.style.display = 'none';
      localStorage.setItem('aashop_notifs_read', 'true');
    }
    renderStoreAnnouncements();
  } else {
    menu.classList.add('hidden');
  }
}

function markAllNotificationsRead() {
  const badge = document.getElementById('notifications-unread-badge');
  if (badge) badge.style.display = 'none';
  localStorage.setItem('aashop_notifs_read', 'true');
  const list = document.getElementById('notif-items-list');
  if (list) {
    list.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">All announcements marked as read.</div>`;
  }
  showToast('All notifications marked as read', 'info');
}

function renderStoreAnnouncements() {
  const list = document.getElementById('notif-items-list');
  if (!list) return;
  list.innerHTML = `
    <div style="padding: 10px; border-bottom: 1px solid var(--border-subtle); display: flex; gap: 10px; align-items: flex-start;">
      <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 71, 87, 0.15); color: #ff4757; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fa-solid fa-truck-fast"></i>
      </div>
      <div>
        <strong style="font-size: 0.85rem; color: var(--text-primary); display: block;">Free Nationwide Delivery Active</strong>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">Enjoy FREE standard delivery on all orders across Pakistan this week!</p>
        <small style="font-size: 0.7rem; color: var(--text-muted);">Just now</small>
      </div>
    </div>
    <div style="padding: 10px; display: flex; gap: 10px; align-items: flex-start;">
      <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(37, 211, 102, 0.15); color: #25d366; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fa-solid fa-shield-check"></i>
      </div>
      <div>
        <strong style="font-size: 0.85rem; color: var(--text-primary); display: block;">Easypaisa & JazzCash Verified</strong>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">Direct 0% fee mobile account payments active with instant confirmation.</p>
        <small style="font-size: 0.7rem; color: var(--text-muted);">Today</small>
      </div>
    </div>
  `;
}

// Close notification dropdown when clicking outside
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('notifications-dropdown-wrap');
  const menu = document.getElementById('notifications-dropdown-menu');
  if (wrap && menu && !wrap.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

// Check if notifications were already read
if (localStorage.getItem('aashop_notifs_read') === 'true') {
  const badge = document.getElementById('notifications-unread-badge');
  if (badge) badge.style.display = 'none';
}

// Initialize theme immediately on load
initTheme();

// Initial sync
syncDynamicStoreConfig();
syncHeaderUserButton();

async function fetchAdminStats() {
  const token = state.token || localStorage.getItem('aashop_token');
  if (!token) return;
  state.token = token;

  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.stats) {
      adminState.stats = data.stats;
      const revEl = document.getElementById('admin-stat-revenue');
      const ordEl = document.getElementById('admin-stat-orders');
      const pendEl = document.getElementById('admin-stat-pending');
      const prodEl = document.getElementById('admin-stat-products');

      if (revEl) revEl.textContent = formatMoney(data.stats.total_sales || 0);
      if (ordEl) ordEl.textContent = data.stats.total_orders || 0;
      if (pendEl) pendEl.textContent = data.stats.pending_orders || 0;
      if (prodEl) prodEl.textContent = data.stats.total_products || 0;
    }
  } catch (err) {
    console.error('Error fetching admin stats:', err);
  }
}

async function fetchAdminOrders() {
  const token = state.token || localStorage.getItem('aashop_token');
  const container = document.getElementById('admin-orders-list-container');
  if (!token) {
    if (container) container.innerHTML = `<p class="text-danger text-center p-4">Session expired. Please sign in again.</p>`;
    return;
  }
  state.token = token;

  if (container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading placed orders...</p>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/admin/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.orders) {
      adminState.orders = data.orders;
      const countEl = document.getElementById('admin-orders-tab-count');
      if (countEl) countEl.textContent = data.orders.length;
      const bottomOrdersBadge = document.getElementById('admin-bottom-orders-badge');
      if (bottomOrdersBadge) {
        bottomOrdersBadge.textContent = data.orders.length;
        bottomOrdersBadge.classList.toggle('hidden', data.orders.length === 0);
      }
      renderAdminOrdersList();
    } else {
      if (container) container.innerHTML = `<p class="text-muted text-center p-4">No orders found.</p>`;
    }
  } catch (err) {
    console.error('Error fetching admin orders:', err);
    if (container) container.innerHTML = `<p class="text-danger text-center p-4">Network error loading orders.</p>`;
  }
}

function filterAdminOrders() {
  const query = document.getElementById('admin-orders-search-input')?.value.trim().toLowerCase() || '';
  adminState.ordersSearchQuery = query;
  renderAdminOrdersList();
}

function filterAdminOrdersByStatus(status) {
  adminState.orderStatusFilter = status.toLowerCase();
  document.querySelectorAll('#admin-orders-filter-pills .admin-filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status.toLowerCase());
  });
  renderAdminOrdersList();
}

function renderAdminOrdersList() {
  const container = document.getElementById('admin-orders-list-container');
  if (!container) return;

  let filtered = [...adminState.orders];

  // Filter by status
  if (adminState.orderStatusFilter !== 'all') {
    filtered = filtered.filter(ord => {
      const st = (ord.status || 'pending').toLowerCase();
      return st === adminState.orderStatusFilter;
    });
  }

  // Filter by search query
  if (adminState.ordersSearchQuery) {
    const q = adminState.ordersSearchQuery;
    filtered = filtered.filter(ord => {
      return (
        (ord.order_number && ord.order_number.toLowerCase().includes(q)) ||
        (ord.customer_name && ord.customer_name.toLowerCase().includes(q)) ||
        (ord.customer_email && ord.customer_email.toLowerCase().includes(q)) ||
        (ord.phone && ord.phone.toLowerCase().includes(q)) ||
        (ord.address && ord.address.toLowerCase().includes(q)) ||
        (ord.city && ord.city.toLowerCase().includes(q))
      );
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <div class="empty-icon"><i class="fa-solid fa-boxes-stacked"></i></div>
        <h4>No Orders Found</h4>
        <p class="text-muted">No orders match your filter/search criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(ord => {
    const currentStatus = ord.status || 'Pending';
    const cleanPhone = (ord.phone || '').replace(/[^0-9]/g, '');
    let waPhone = cleanPhone;
    if (waPhone.startsWith('03')) {
      waPhone = '92' + waPhone.substring(1);
    } else if (!waPhone.startsWith('92') && waPhone.length === 10) {
      waPhone = '92' + waPhone;
    }

    const waMessage = encodeURIComponent(
      `Assalam o Alaikum ${ord.customer_name || 'Customer'}! 🛍️\n\nThis is AA Shop Admin regarding your Order #${ord.order_number || ord.id}.\nTotal Amount: Rs. ${Math.round(ord.total_amount * 280).toLocaleString()}\nStatus: ${currentStatus}\n\nWe are processing your order. Thank you for choosing AA Shop!`
    );
    const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

    return `
      <div class="admin-order-card" id="admin-order-card-${ord.id}">
        <div class="admin-order-card-header">
          <div class="admin-order-meta-left">
            <span class="admin-order-badge-num"><i class="fa-solid fa-receipt text-warning"></i> ${escapeHtml(ord.order_number || `ORD-${ord.id}`)}</span>
            <span class="admin-order-date">${new Date(ord.created_at || Date.now()).toLocaleString()}</span>
          </div>
          <div class="admin-status-select-wrap">
            <span class="text-muted" style="font-size: 0.8rem; font-weight: 700;">Status:</span>
            <select class="admin-status-dropdown" onchange="updateAdminOrderStatus(${ord.id}, this.value)">
              <option value="Pending" ${currentStatus.toLowerCase() === 'pending' ? 'selected' : ''}>⏳ Pending</option>
              <option value="Confirmed" ${currentStatus.toLowerCase() === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
              <option value="Out for Delivery" ${currentStatus.toLowerCase() === 'out for delivery' ? 'selected' : ''}>🚚 Out for Delivery</option>
              <option value="Delivered" ${currentStatus.toLowerCase() === 'delivered' ? 'selected' : ''}>📦 Delivered</option>
              <option value="Cancelled" ${currentStatus.toLowerCase() === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
            </select>
          </div>
        </div>

        <!-- AI Verification Control Bar -->
        <div class="admin-ai-verify-bar" style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-robot text-primary-aa" style="font-size: 1.1rem;"></i>
            <div>
              <div style="font-size: 0.84rem; font-weight: 800; color: #fff;">
                AI Verification: 
                ${ord.ai_verified === 1 || currentStatus.toLowerCase() === 'confirmed'
                  ? '<span style="color: #2ed573;"><i class="fa-solid fa-circle-check"></i> Confirmed via AI WhatsApp (Customer replied YES)</span>'
                  : currentStatus.toLowerCase() === 'cancelled'
                  ? '<span style="color: #ff4757;"><i class="fa-solid fa-ban"></i> Cancelled (Customer replied NO)</span>'
                  : '<span style="color: #f59e0b;"><i class="fa-solid fa-clock-rotate-left"></i> Awaiting Customer WhatsApp Reply</span>'}
              </div>
              <small class="text-muted" style="font-size: 0.76rem;">Automatic message sent from admin WhatsApp channel</small>
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-sm" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.4); font-weight: 700; font-size: 0.78rem;" onclick="handleSimulateAiVerification(${ord.id}, 'yes')" title="Simulate customer replying YES to AI message">
              <i class="fa-solid fa-check"></i> Customer YES (Confirm)
            </button>
            <button class="btn btn-sm" style="background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.4); font-weight: 700; font-size: 0.78rem;" onclick="handleSimulateAiVerification(${ord.id}, 'no')" title="Simulate customer replying NO to AI message">
              <i class="fa-solid fa-xmark"></i> Customer NO (Cancel)
            </button>
          </div>
        </div>

        <div class="admin-order-grid-details">
          <div class="admin-info-col">
            <h5>Customer Details & WhatsApp</h5>
            <div class="admin-customer-name">${escapeHtml(ord.customer_name || 'Anonymous Customer')}</div>
            <div class="admin-customer-sub"><i class="fa-regular fa-envelope"></i> ${escapeHtml(ord.customer_email || 'No email')}</div>
            <div class="admin-customer-sub"><i class="fa-solid fa-phone"></i> ${escapeHtml(ord.customer_phone || ord.phone || 'No phone')}</div>
            ${(ord.customer_phone || ord.phone) ? `
              <a href="${waUrl}" target="_blank" rel="noopener" class="btn-whatsapp-admin" title="Open direct WhatsApp chat with customer">
                <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
              </a>
            ` : ''}
          </div>

          <div class="admin-info-col">
            <h5>Shipping Address</h5>
            <div class="text-white" style="font-size: 0.88rem;">${escapeHtml(ord.address || 'Address not specified')}</div>
            <div class="text-muted" style="font-size: 0.82rem;">${escapeHtml(ord.city || '')} ${escapeHtml(ord.postal_code ? `- ${ord.postal_code}` : '')}</div>
          </div>

          <div class="admin-info-col">
            <h5>Payment & Total</h5>
            <div style="font-size: 0.88rem;"><strong class="text-primary-aa">${escapeHtml(ord.payment_method || 'Cash on Delivery')}</strong></div>
            ${ord.payment_details ? `<div class="text-muted" style="font-size: 0.78rem; word-break: break-all;">${escapeHtml(ord.payment_details)}</div>` : ''}
            <div class="mt-2" style="font-size: 1.15rem; font-weight: 900; color: #fff;">
              ${formatMoney(ord.total_amount)}
            </div>
          </div>
        </div>

        <!-- Ordered Items Mini Gallery -->
        <div class="admin-order-items-preview">
          ${(ord.items || []).map(item => `
            <div class="admin-mini-item">
              <img src="${escapeHtml(item.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100')}" alt="${escapeHtml(item.title)}" />
              <span><strong>${escapeHtml(item.title)}</strong> (${item.quantity}x @ ${formatMoney(item.price)})</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function updateAdminOrderStatus(orderId, newStatus) {
  if (!state.token) return;
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (data.success) {
      // Update local state
      const targetOrd = adminState.orders.find(o => o.id === orderId);
      if (targetOrd) targetOrd.status = newStatus;
      
      showToast(`Order status updated to "${newStatus}"! ✅`, 'success');
      fetchAdminStats();
    } else {
      showToast(data.message || 'Failed to update order status.', 'error');
    }
  } catch (err) {
    console.error('Error updating order status:', err);
    showToast('Server error while updating status.', 'error');
  }
}

async function fetchAdminProducts() {
  const token = state.token || localStorage.getItem('aashop_token');
  const container = document.getElementById('admin-products-grid-container');
  if (!token) {
    if (container) container.innerHTML = `<p class="text-danger text-center p-4">Session expired. Please sign in again.</p>`;
    return;
  }
  state.token = token;

  if (container) {
    container.innerHTML = `
      <div class="loading-state" style="grid-column: 1 / -1;">
        <div class="spinner"></div>
        <p>Loading product catalog...</p>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/admin/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.products) {
      adminState.products = data.products;
      const countEl = document.getElementById('admin-products-tab-count');
      if (countEl) countEl.textContent = data.products.length;
      const bottomProductsBadge = document.getElementById('admin-bottom-products-badge');
      if (bottomProductsBadge) {
        bottomProductsBadge.textContent = data.products.length;
        bottomProductsBadge.classList.toggle('hidden', data.products.length === 0);
      }
      renderAdminProductsGrid();
    } else {
      if (container) container.innerHTML = `<p class="text-danger text-center p-4">${data.message || 'Failed to load products.'}</p>`;
    }
  } catch (err) {
    console.error('Error fetching admin products:', err);
    if (container) container.innerHTML = `<p class="text-danger text-center p-4">Network error loading products.</p>`;
  }
}

function filterAdminProducts() {
  const query = document.getElementById('admin-products-search-input')?.value.trim().toLowerCase() || '';
  adminState.productsSearchQuery = query;
  renderAdminProductsGrid();
}

function renderAdminProductsGrid() {
  const container = document.getElementById('admin-products-grid-container');
  if (!container) return;

  let filtered = [...adminState.products];
  if (adminState.productsSearchQuery) {
    const q = adminState.productsSearchQuery;
    filtered = filtered.filter(p => {
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.badge && p.badge.toLowerCase().includes(q))
      );
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
        <div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>
        <h4>No Products Found</h4>
        <p class="text-muted">No products match your search query.</p>
        <button class="btn btn-primary-aa mt-3" onclick="openAdminProductModal()">
          <i class="fa-solid fa-plus"></i> Add New Product
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isFlash = p.featured === 1 || (p.badge && p.badge.toLowerCase().includes('flash'));
    return `
      <div class="admin-product-card" id="admin-prod-card-${p.id}">
        <img src="${escapeHtml(p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80')}" alt="${escapeHtml(p.title)}" class="admin-product-thumb" />
        <span class="badge-tag ${isFlash ? 'badge-flash' : ''}" style="position: absolute; top: 24px; left: 24px;">
          ${isFlash ? '⚡ ' : ''}${escapeHtml(p.badge || 'Flash Sale')}
        </span>
        <h4 class="admin-product-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h4>
        <div class="text-muted" style="font-size: 0.78rem; margin-bottom: 8px;">${escapeHtml(p.category)} • Stock: ${p.stock} units</div>
        <div class="admin-product-meta-row">
          <span class="price-current" style="font-size: 1.1rem;">${formatMoney(p.price)}</span>
          ${p.original_price ? `<span class="price-original" style="font-size: 0.85rem;">${formatMoney(p.original_price)}</span>` : ''}
        </div>
        <div class="admin-product-actions">
          <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="openAdminProductEditor(${p.id})">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-sm ${isFlash ? 'btn-primary-aa' : 'btn-outline-secondary'}" onclick="toggleAdminProductFlashDeal(${p.id})" title="Toggle Flash Deal Featured status">
            <i class="fa-solid fa-bolt"></i> Flash
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteAdminProduct(${p.id})" title="Delete product">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openAdminProductModal(productId = null) {
  openAdminProductEditor(productId);
}

function openAdminProductEditor(productId = null) {
  navigateTo('admin-product-edit', productId);
}

function renderAdminProductEditorPage(productId = null) {
  const form = document.getElementById('admin-product-full-form');
  if (form) form.reset();

  const idInput = document.getElementById('admin-editor-prod-id');
  const titleEl = document.getElementById('admin-editor-main-title');
  const modeBadge = document.getElementById('admin-editor-mode-badge');
  const titleInput = document.getElementById('admin-editor-title');
  const catInput = document.getElementById('admin-editor-category');
  const stockInput = document.getElementById('admin-editor-stock');
  const brandInput = document.getElementById('admin-editor-brand');
  const warrantyInput = document.getElementById('admin-editor-warranty');
  const origPriceInput = document.getElementById('admin-editor-orig-price-pkr');
  const discountInput = document.getElementById('admin-editor-discount-pct');
  const salePriceInput = document.getElementById('admin-editor-sale-price-pkr');
  const featInput = document.getElementById('admin-editor-featured');
  const badgeInput = document.getElementById('admin-editor-badge');
  const badgePreset = document.getElementById('admin-editor-badge-preset');
  const descInput = document.getElementById('admin-editor-desc');
  const feedback = document.getElementById('admin-editor-feedback');

  if (feedback) feedback.classList.add('hidden');
  removeProductPickedPhoto();

  if (productId) {
    const prod = adminState.products.find(p => p.id === parseInt(productId) || p.id === productId);
    if (prod) {
      if (idInput) idInput.value = prod.id;
      if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-primary-aa"></i> Edit Product: <span class="text-white">${escapeHtml(prod.title)}</span>`;
      if (modeBadge) {
        modeBadge.textContent = `Editing ID #${prod.id}`;
        modeBadge.className = 'badge-tag badge-flash';
      }
      if (titleInput) titleInput.value = prod.title;
      if (catInput) catInput.value = prod.category;
      if (stockInput) stockInput.value = prod.stock || 50;
      if (featInput) featInput.checked = prod.featured === 1;
      if (badgeInput) badgeInput.value = prod.badge || 'Flash Sale';
      if (badgePreset) badgePreset.value = 'custom';
      if (descInput) descInput.value = prod.description || '';

      // Convert prices to PKR (base rate 278)
      const pkrOrig = Math.round((prod.original_price || prod.price) * 278);
      const pkrSale = Math.round(prod.price * 278);
      if (origPriceInput) origPriceInput.value = pkrOrig;
      if (salePriceInput) salePriceInput.value = pkrSale;

      // Calculate discount %
      if (pkrOrig > pkrSale) {
        const discPct = Math.round(((pkrOrig - pkrSale) / pkrOrig) * 100);
        if (discountInput) discountInput.value = discPct;
      } else {
        if (discountInput) discountInput.value = 0;
      }
      updatePricingSummary();

      // Show existing image
      if (prod.image_url) {
        setProductPhotoPreview(prod.image_url);
      }
      return;
    }
  }

  // New product defaults
  if (idInput) idInput.value = '';
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-circle-plus text-primary-aa"></i> Add New Store Product';
  if (modeBadge) {
    modeBadge.textContent = 'New Catalog Item';
    modeBadge.className = 'badge-tag badge-flash';
  }
  if (stockInput) stockInput.value = 50;
  if (origPriceInput) origPriceInput.value = '';
  if (discountInput) discountInput.value = 0;
  if (salePriceInput) salePriceInput.value = '';
  if (featInput) featInput.checked = true;
  if (badgeInput) badgeInput.value = 'Flash Sale';
  if (badgePreset) badgePreset.value = 'Flash Sale';
  updatePricingSummary();
}

/* ==========================================================================
   2-WAY REAL-TIME PKR PRICING & DISCOUNT CALCULATOR
   ========================================================================== */
function calculatePricingFromOriginal() {
  const orig = parseFloat(document.getElementById('admin-editor-orig-price-pkr')?.value) || 0;
  const disc = parseFloat(document.getElementById('admin-editor-discount-pct')?.value) || 0;
  const saleInput = document.getElementById('admin-editor-sale-price-pkr');

  if (orig > 0) {
    if (disc > 0) {
      const finalPrice = Math.round(orig * (1 - disc / 100));
      if (saleInput) saleInput.value = finalPrice;
    } else {
      if (saleInput) saleInput.value = orig;
    }
  }
  updatePricingSummary();
}

function calculatePricingFromDiscount() {
  const orig = parseFloat(document.getElementById('admin-editor-orig-price-pkr')?.value) || 0;
  const disc = parseFloat(document.getElementById('admin-editor-discount-pct')?.value) || 0;
  const saleInput = document.getElementById('admin-editor-sale-price-pkr');

  if (orig > 0) {
    const finalPrice = Math.round(orig * (1 - Math.min(disc, 99) / 100));
    if (saleInput) saleInput.value = finalPrice;
  }
  updatePricingSummary();
}

function calculatePricingFromSale() {
  const orig = parseFloat(document.getElementById('admin-editor-orig-price-pkr')?.value) || 0;
  const sale = parseFloat(document.getElementById('admin-editor-sale-price-pkr')?.value) || 0;
  const discInput = document.getElementById('admin-editor-discount-pct');

  if (orig > 0 && sale > 0) {
    if (orig >= sale) {
      const discPct = Math.round(((orig - sale) / orig) * 100);
      if (discInput) discInput.value = discPct;
    } else {
      if (discInput) discInput.value = 0;
    }
  }
  updatePricingSummary();
}

function updatePricingSummary() {
  const orig = parseFloat(document.getElementById('admin-editor-orig-price-pkr')?.value) || 0;
  const sale = parseFloat(document.getElementById('admin-editor-sale-price-pkr')?.value) || 0;
  const origEl = document.getElementById('calc-summary-original');
  const discEl = document.getElementById('calc-summary-discount');
  const finalEl = document.getElementById('calc-summary-final');

  if (origEl) origEl.textContent = `Rs. ${orig.toLocaleString('en-PK')}`;
  if (finalEl) finalEl.textContent = `Rs. ${sale.toLocaleString('en-PK')}`;

  if (orig > 0 && sale > 0 && orig > sale) {
    const saved = orig - sale;
    const pct = Math.round((saved / orig) * 100);
    if (discEl) discEl.textContent = `${pct}% OFF (Save Rs. ${saved.toLocaleString('en-PK')})`;
  } else {
    if (discEl) discEl.textContent = '0% OFF (No Discount)';
  }
}

/* ==========================================================================
   CAMERA & GALLERY REAL PHOTO UPLOAD
   ========================================================================== */
function handleProductPhotoPicked(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG, PNG, WEBP).', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawDataUrl = e.target.result;
    compressImage(rawDataUrl, 1200, 0.85, function(compressedDataUrl) {
      setProductPhotoPreview(compressedDataUrl);
      showToast('Photo attached successfully! 📸', 'success');
    });
  };
  reader.readAsDataURL(file);
}

function compressImage(srcDataUrl, maxWidth, quality, callback) {
  const img = new Image();
  img.onload = function() {
    let width = img.width;
    let height = img.height;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL('image/jpeg', quality);
    callback(compressed);
  };
  img.onerror = function() {
    callback(srcDataUrl);
  };
  img.src = srcDataUrl;
}

function setProductPhotoPreview(imgSrc) {
  const placeholder = document.getElementById('admin-photo-empty-placeholder');
  const activeView = document.getElementById('admin-photo-active-view');
  const previewImg = document.getElementById('admin-photo-preview-img');
  const dataInput = document.getElementById('admin-editor-image-data');

  if (previewImg) previewImg.src = imgSrc;
  if (dataInput) dataInput.value = imgSrc;
  if (placeholder) placeholder.classList.add('hidden');
  if (activeView) activeView.classList.remove('hidden');
}

function removeProductPickedPhoto() {
  const placeholder = document.getElementById('admin-photo-empty-placeholder');
  const activeView = document.getElementById('admin-photo-active-view');
  const previewImg = document.getElementById('admin-photo-preview-img');
  const dataInput = document.getElementById('admin-editor-image-data');
  const camInput = document.getElementById('admin-editor-camera-input');
  const galInput = document.getElementById('admin-editor-gallery-input');

  if (previewImg) previewImg.src = '';
  if (dataInput) dataInput.value = '';
  if (camInput) camInput.value = '';
  if (galInput) galInput.value = '';
  if (activeView) activeView.classList.add('hidden');
  if (placeholder) placeholder.classList.remove('hidden');
}

function applyBadgePreset(presetVal) {
  const customInput = document.getElementById('admin-editor-badge');
  if (!customInput) return;
  if (presetVal !== 'custom') {
    customInput.value = presetVal;
  } else {
    customInput.focus();
  }
}

/* ==========================================================================
   SAVE PRODUCT TO STORE BACKEND (FULL SUBMIT HANDLER)
   ========================================================================== */
async function handleAdminSaveProductFull(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!state.token) {
    showToast('Admin session expired. Please sign in again.', 'error');
    return;
  }

  const id = document.getElementById('admin-editor-prod-id')?.value;
  const title = document.getElementById('admin-editor-title')?.value.trim();
  const category = document.getElementById('admin-editor-category')?.value;
  const stock = parseInt(document.getElementById('admin-editor-stock')?.value) || 50;
  const brand = document.getElementById('admin-editor-brand')?.value.trim();
  const warranty = document.getElementById('admin-editor-warranty')?.value.trim();

  // PKR Prices converted to base USD (base rate 278)
  const origPKR = parseFloat(document.getElementById('admin-editor-orig-price-pkr')?.value) || 0;
  const salePKR = parseFloat(document.getElementById('admin-editor-sale-price-pkr')?.value) || origPKR;
  const priceUSD = parseFloat((salePKR / 278).toFixed(2));
  const origPriceUSD = origPKR > 0 ? parseFloat((origPKR / 278).toFixed(2)) : priceUSD;

  let imageData = document.getElementById('admin-editor-image-data')?.value.trim();
  if (!imageData) {
    imageData = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';
  }

  const featured = document.getElementById('admin-editor-featured')?.checked ? 1 : 0;
  const badge = document.getElementById('admin-editor-badge')?.value.trim() || 'Flash Sale';
  let description = document.getElementById('admin-editor-desc')?.value.trim() || '';

  // Append brand & warranty info into description if provided
  if (brand || warranty) {
    let extra = '';
    if (brand) extra += `\n• Brand: ${brand}`;
    if (warranty) extra += `\n• Warranty: ${warranty}`;
    if (!description.includes(brand) && !description.includes(warranty)) {
      description = `${description}\n\nKey Specifications:${extra}`.trim();
    }
  }

  const feedback = document.getElementById('admin-editor-feedback');
  const saveBtn = document.getElementById('admin-editor-save-btn');

  if (feedback) feedback.classList.add('hidden');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Product to Store...';
  }

  try {
    const isEdit = Boolean(id);
    const endpoint = isEdit ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        title,
        category,
        stock,
        price: priceUSD,
        original_price: origPriceUSD,
        image_url: imageData,
        featured,
        badge,
        description
      })
    });

    const data = await res.json();

    if (data.success) {
      showToast(isEdit ? `Product #${id} "${title}" updated successfully! ✨` : `"${title}" published to live store! 🎉`, 'success');
      await fetchProducts(); // Refresh store catalog
      await fetchAdminProducts(); // Refresh admin catalog
      await fetchAdminStats(); // Refresh admin stats
      navigateTo('admin');
    } else {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = data.message || 'Failed to save product.';
        feedback.classList.remove('hidden');
      }
      showToast(data.message || 'Failed to save product.', 'error');
    }
  } catch (error) {
    console.error('Save product error:', error);
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = 'Server connection error.';
      feedback.classList.remove('hidden');
    }
    showToast('Server connection error.', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Save & Publish Product to Store</span>';
    }
  }
}

async function toggleAdminProductFlashDeal(productId) {
  const prod = adminState.products.find(p => p.id === productId);
  if (!prod) return;

  const newFeatured = prod.featured === 1 ? 0 : 1;
  try {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        featured: newFeatured,
        badge: newFeatured ? 'Flash Sale' : 'Regular'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Flash Deal ${newFeatured ? 'Enabled ⚡' : 'Disabled'} for "${prod.title}"!`, 'info');
      await fetchAdminProducts();
      await fetchProducts();
    }
  } catch (err) {
    console.error('Error toggling flash deal:', err);
  }
}

/* ==========================================================================
   CUSTOM IN-APP PRODUCT DELETE CONFIRMATION ENGINE
   ========================================================================== */
let pendingDeleteProductId = null;

function deleteAdminProduct(productId) {
  const pId = parseInt(productId) || productId;
  const prod = (adminState.products && adminState.products.find(p => p.id === pId)) || (state.products && state.products.find(p => p.id === pId));
  
  pendingDeleteProductId = pId;

  const modal = document.getElementById('admin-delete-confirm-modal');
  const titleEl = document.getElementById('delete-modal-product-title');
  const previewTitle = document.getElementById('delete-modal-title-text');
  const previewPrice = document.getElementById('delete-modal-price-text');
  const previewImg = document.getElementById('delete-modal-img');

  const title = prod ? prod.title : `Product #${pId}`;
  if (titleEl) titleEl.textContent = `"${title}"`;
  if (previewTitle) previewTitle.textContent = title;
  if (previewPrice) previewPrice.textContent = prod ? formatMoney(prod.price) : '';
  if (previewImg) previewImg.src = prod && prod.image_url ? prod.image_url : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100';

  if (modal) modal.classList.remove('hidden');
}

function closeDeleteConfirmModal() {
  pendingDeleteProductId = null;
  const modal = document.getElementById('admin-delete-confirm-modal');
  if (modal) modal.classList.add('hidden');
}

async function executeConfirmedDeleteProduct() {
  if (!pendingDeleteProductId) return;
  const pId = pendingDeleteProductId;
  const prod = (adminState.products && adminState.products.find(p => p.id === pId)) || (state.products && state.products.find(p => p.id === pId));
  const title = prod ? prod.title : `Product #${pId}`;

  const token = state.token || localStorage.getItem('aashop_token');
  if (!token) {
    showToast('Admin session expired. Please sign in again.', 'error');
    closeDeleteConfirmModal();
    return;
  }

  const deleteBtn = document.getElementById('confirm-delete-product-btn');
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
  }

  // 1. Instant optimistic UI removal: Animate and remove card immediately
  const cardEl = document.getElementById(`admin-prod-card-${pId}`);
  if (cardEl) {
    cardEl.style.transition = 'all 0.3s ease';
    cardEl.style.opacity = '0';
    cardEl.style.transform = 'scale(0.8)';
    setTimeout(() => {
      if (cardEl && cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
    }, 300);
  }

  // 2. Remove from memory state immediately
  if (adminState.products) {
    adminState.products = adminState.products.filter(p => p.id !== pId);
    const countEl = document.getElementById('admin-products-tab-count');
    if (countEl) countEl.textContent = adminState.products.length;
  }
  if (state.products) {
    state.products = state.products.filter(p => p.id !== pId);
  }

  // 3. Purge from local cart & wishlist
  state.cart = state.cart.filter(item => item.id !== pId);
  localStorage.setItem('aashop_cart', JSON.stringify(state.cart));
  updateCartBadge();

  state.wishlist = state.wishlist.filter(id => id !== pId);
  localStorage.setItem('aashop_wishlist', JSON.stringify(state.wishlist));
  updateWishlistBadge();

  try {
    const res = await fetch(`/api/admin/products/${pId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (data.success) {
      showToast(`Product "${title}" deleted from database & store! 🗑️`, 'success');
      fetchAdminStats();
      fetchProducts();
    } else {
      showToast(data.message || 'Failed to delete product.', 'error');
      fetchAdminProducts();
    }
  } catch (err) {
    console.error('Error deleting product:', err);
    showToast('Server connection error while deleting.', 'error');
    fetchAdminProducts();
  } finally {
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Confirm Delete';
    }
    closeDeleteConfirmModal();
  }
}

/* ==========================================================================
   INITIALIZATION & BOOTSTRAP
   ========================================================================== */
function handleHashChange() {
  const targetRoute = getActiveRouteFromUrlOrStorage();
  if (targetRoute !== state.currentPage) {
    navigateTo(targetRoute);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // 1. Immediately determine active route and apply screen visibility with 0ms delay!
  const activeRoute = getActiveRouteFromUrlOrStorage();
  applyImmediatePageVisibility(activeRoute);

  updateCurrencyUI();
  updateAuthUI();
  updateCartBadge();
  updateWishlistBadge();

  // 2. Restore persistent session
  await checkPersistentSession();

  // 3. Navigate & load data for active route
  navigateTo(activeRoute);

  // 4. Fetch store products catalog
  await fetchProducts();

  window.addEventListener('hashchange', handleHashChange);
}

// Persistent session verification with SQLite
async function checkPersistentSession() {
  const token = state.token || localStorage.getItem('aashop_token');
  if (!token) return;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.user) {
      state.currentUser = data.user;
      state.token = token;
      localStorage.setItem('aashop_user', JSON.stringify(data.user));
      localStorage.setItem('aashop_token', token);
      updateAuthUI();
      console.log('✅ Persistent session restored for:', data.user.email);
    }
  } catch (error) {
    console.warn('Session verification offline');
  }
}

/* ==========================================================================
   MULTI-CURRENCY ENGINE
   ========================================================================== */
function setCurrency(newCurrency) {
  if (!CURRENCIES[newCurrency]) return;
  state.currency = newCurrency;
  localStorage.setItem('aashop_currency', newCurrency);
  updateCurrencyUI();
  
  if (state.currentPage === 'home') renderProducts(state.products);
  else if (state.currentPage === 'product-detail' && state.currentProductId) openProductDetailPage(state.currentProductId);
  else if (state.currentPage === 'wishlist') renderWishlistPage();
  else if (state.currentPage === 'cart') renderCartPage();
  else if (state.currentPage === 'checkout') renderCheckoutPage();
  else if (state.currentPage === 'account') renderAccountPage('orders');

  showToast(`Currency changed to ${CURRENCIES[newCurrency].name} (${CURRENCIES[newCurrency].symbol})!`, 'info');
}

function updateCurrencyUI() {
  const curr = CURRENCIES[state.currency] || CURRENCIES['PKR'];
  if (elements.currentCurrencyFlag) elements.currentCurrencyFlag.textContent = curr.flag;
  if (elements.currentCurrencyCode) elements.currentCurrencyCode.textContent = state.currency;

  document.querySelectorAll('.currency-item').forEach(item => {
    item.classList.toggle('active', item.dataset.currency === state.currency);
  });
}

/* ==========================================================================
   PRODUCTS CATALOG (HOME PAGE)
   ========================================================================== */
async function fetchProducts() {
  try {
    elements.productsGrid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading AA Shop catalog...</p>
      </div>
    `;

    const params = new URLSearchParams();
    if (state.searchQuery) params.append('q', state.searchQuery);
    if (state.activeCategory && state.activeCategory !== 'All') params.append('category', state.activeCategory);
    if (state.activeSort) params.append('sort', state.activeSort);

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      state.products = data.products;
      renderProducts(data.products);
    } else {
      showToast('Failed to load products', 'error');
    }
  } catch (error) {
    console.error('Error loading products:', error);
    elements.productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Failed to connect to server</h3>
        <p>Backend server running on http://localhost:3000</p>
      </div>
    `;
  }
}

function renderProducts(products) {
  if (!products || products.length === 0) {
    elements.productsGrid.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    elements.catalogCountText.textContent = 'Showing 0 products';
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.catalogCountText.textContent = `Showing ${products.length} product${products.length > 1 ? 's' : ''}`;

  elements.productsGrid.innerHTML = products.map(product => {
    const isWishlisted = state.wishlist.includes(product.id);
    const discountPercent = product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="card-image-wrap" onclick="openProductDetailPage(${product.id})">
          ${discountPercent ? `<span class="card-badge-discount">-${discountPercent}% OFF</span>` : ''}
          ${product.badge ? `<span class="card-badge-custom">${escapeHtml(product.badge)}</span>` : ''}
          <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist(${product.id})" title="Add to wishlist">
            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.title)}" loading="lazy" />
        </div>
        
        <div class="card-info">
          <div class="card-meta">
            <span class="card-category">${escapeHtml(product.category)}</span>
            <div class="card-rating">
              <i class="fa-solid fa-star"></i>
              <span>${product.rating.toFixed(1)}</span>
              <span class="text-muted">(${product.rating_count})</span>
            </div>
          </div>

          <h3 class="card-title" onclick="openProductDetailPage(${product.id})">${escapeHtml(product.title)}</h3>
          <p class="card-desc">${escapeHtml(product.description || '')}</p>

          <div class="card-price-row">
            <span class="card-price">${formatMoney(product.price)}</span>
            ${product.original_price ? `<span class="card-original-price">${formatMoney(product.original_price)}</span>` : ''}
            <span class="card-stock-status"><i class="fa-solid fa-check"></i> In Stock (${product.stock})</span>
          </div>

          <div class="card-actions">
            <button class="card-add-btn" onclick="addToCart(${product.id})">
              <i class="fa-solid fa-bag-shopping"></i> Add to Bag
            </button>
            <button class="card-quickview-btn" onclick="buyNowDirect(${product.id})" title="Buy Now Single Item">
              <i class="fa-solid fa-bolt text-warning"></i> Buy
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterCategory(categoryName) {
  state.activeCategory = categoryName;
  document.querySelectorAll('.daraz-cat-item').forEach(p => {
    p.classList.toggle('active', p.dataset.category === categoryName);
  });
  fetchProducts();
  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
}

function resetFilters() {
  state.searchQuery = '';
  state.activeCategory = 'All';
  state.activeSort = 'featured';

  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.sortSelect) elements.sortSelect.value = 'featured';

  document.querySelectorAll('.daraz-cat-item').forEach(p => {
    p.classList.toggle('active', p.dataset.category === 'All');
  });

  fetchProducts();
}

/* ==========================================================================
   PAGE 2: DEDICATED FULL PRODUCT DETAILS PAGE (#product-detail)
   ========================================================================== */
async function openProductDetailPage(productId) {
  state.currentProductId = productId;
  navigateTo('product-detail');

  elements.productDetailPageContent.innerHTML = `
    <div class="loading-state" style="padding: 60px 20px;">
      <div class="spinner"></div>
      <p>Loading product details...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/products/${productId}`);
    const data = await res.json();

    if (!data.success || !data.product) {
      showToast('Product not found', 'error');
      navigateTo('home');
      return;
    }

    const p = data.product;
    const related = data.related || [];

    if (elements.detailPageBreadcrumbCategory) {
      elements.detailPageBreadcrumbCategory.textContent = p.category;
    }

    const discountPercent = p.original_price && p.original_price > p.price
      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
      : null;

    elements.productDetailPageContent.innerHTML = `
      <div class="product-detail-grid">
        <div class="detail-gallery">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" class="detail-main-img" />
        </div>

        <div class="detail-info">
          <div class="detail-badges">
            <span class="badge-tag">${escapeHtml(p.category)}</span>
            ${p.badge ? `<span class="badge-tag" style="background: rgba(255,165,2,0.2); color:#ffa502;">${escapeHtml(p.badge)}</span>` : ''}
            ${discountPercent ? `<span class="badge-tag" style="background: rgba(255,71,87,0.2); color: #ff4757;">-${discountPercent}% OFF</span>` : ''}
            <div class="card-rating">
              <i class="fa-solid fa-star"></i>
              <span>${p.rating.toFixed(1)}</span>
              <span class="text-muted">(${p.rating_count} customer reviews)</span>
            </div>
          </div>

          <h1 class="detail-title" style="font-size: 2rem; margin: 12px 0;">${escapeHtml(p.title)}</h1>

          <div class="detail-price-box">
            <span class="detail-price-current">${formatMoney(p.price)}</span>
            ${p.original_price ? `<span class="detail-price-original">${formatMoney(p.original_price)}</span>` : ''}
            <span class="text-success" style="font-size: 0.85rem; font-weight: 700; margin-left: 8px;">
              <i class="fa-solid fa-circle-check"></i> In Stock (${p.stock} units available)
            </span>
          </div>

          <p class="detail-desc">${escapeHtml(p.description)}</p>

          <div class="detail-specs-grid">
            <div class="spec-item"><i class="fa-solid fa-shield-check"></i> 100% Genuine Boxed Item</div>
            <div class="spec-item"><i class="fa-solid fa-truck-fast"></i> Express Delivery in 2-4 Days</div>
            <div class="spec-item"><i class="fa-solid fa-rotate-left"></i> 14-Day Easy Return Policy</div>
            <div class="spec-item"><i class="fa-solid fa-hand-holding-dollar"></i> Cash on Delivery Available</div>
          </div>

          <div class="detail-actions-row mt-4">
            <div class="detail-qty-picker">
              <button onclick="adjustDetailQty(-1)">-</button>
              <input type="text" id="detail-qty-val" value="1" readonly />
              <button onclick="adjustDetailQty(1)">+</button>
            </div>

            <button class="btn btn-primary-aa btn-lg" onclick="addDetailPageToCart(${p.id})">
              <i class="fa-solid fa-bag-shopping"></i> Add to Bag
            </button>

            <button class="btn btn-secondary btn-lg" onclick="buyNowFromDetailPage(${p.id})">
              <i class="fa-solid fa-bolt text-warning"></i> Buy Now (This Item Only)
            </button>
          </div>
        </div>
      </div>

      ${related.length > 0 ? `
        <div class="detail-related-section mt-5">
          <h3 class="mb-3" style="font-size: 1.3rem;"><i class="fa-solid fa-fire text-danger"></i> Similar Products in ${escapeHtml(p.category)}</h3>
          <div class="related-grid">
            ${related.map(r => `
              <div class="related-card" onclick="openProductDetailPage(${r.id})">
                <img src="${escapeHtml(r.image_url)}" alt="${escapeHtml(r.title)}" class="related-img" />
                <h5>${escapeHtml(r.title)}</h5>
                <span class="text-primary-aa font-weight-bold">${formatMoney(r.price)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  } catch (error) {
    console.error('Error opening product details page:', error);
    showToast('Failed to load product details.', 'error');
  }
}

function adjustDetailQty(delta) {
  const qtyInput = document.getElementById('detail-qty-val');
  if (!qtyInput) return;
  let val = parseInt(qtyInput.value) || 1;
  val = Math.max(1, Math.min(20, val + delta));
  qtyInput.value = val;
}

function addDetailPageToCart(productId) {
  const qtyInput = document.getElementById('detail-qty-val');
  const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
  addToCart(productId, qty);
}

// DIRECT SINGLE-ITEM BUY FUNCTION (BUYS ONLY THIS 1 ITEM)
function buyNowFromDetailPage(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  const qtyInput = document.getElementById('detail-qty-val');
  const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

  state.checkoutItems = [{
    id: product.id,
    title: product.title,
    price: product.price,
    image_url: product.image_url,
    quantity: qty
  }];

  navigateTo('checkout');
}

function buyNowDirect(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.checkoutItems = [{
    id: product.id,
    title: product.title,
    price: product.price,
    image_url: product.image_url,
    quantity: 1
  }];

  navigateTo('checkout');
}

function buySingleItemFromCart(productId) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  state.checkoutItems = [{
    id: item.id,
    title: item.title,
    price: item.price,
    image_url: item.image_url,
    quantity: item.quantity
  }];

  navigateTo('checkout');
}

/* ==========================================================================
   PAGE 3: DEDICATED WISHLIST PAGE (#wishlist)
   ========================================================================== */
function renderWishlistPage() {
  const wishlistedProducts = state.products.filter(p => state.wishlist.includes(p.id));

  if (wishlistedProducts.length === 0) {
    elements.wishlistPageGrid.innerHTML = '';
    elements.wishlistEmptyState.classList.remove('hidden');
    return;
  }

  elements.wishlistEmptyState.classList.add('hidden');
  elements.wishlistPageGrid.innerHTML = wishlistedProducts.map(product => {
    return `
      <div class="product-card">
        <div class="card-image-wrap" onclick="openProductDetailPage(${product.id})">
          <button class="card-wishlist-btn active" onclick="event.stopPropagation(); toggleWishlist(${product.id})" title="Remove from wishlist">
            <i class="fa-solid fa-heart"></i>
          </button>
          <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.title)}" />
        </div>
        
        <div class="card-info">
          <span class="card-category">${escapeHtml(product.category)}</span>
          <h3 class="card-title" onclick="openProductDetailPage(${product.id})">${escapeHtml(product.title)}</h3>
          <div class="card-price-row">
            <span class="card-price">${formatMoney(product.price)}</span>
            <span class="card-stock-status"><i class="fa-solid fa-check"></i> In Stock</span>
          </div>

          <div class="card-actions">
            <button class="card-add-btn" onclick="addToCart(${product.id})">
              <i class="fa-solid fa-bag-shopping"></i> Move to Bag
            </button>
            <button class="card-quickview-btn" onclick="buyNowDirect(${product.id})" title="Buy Now">
              <i class="fa-solid fa-bolt text-warning"></i> Buy
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleWishlist(productId) {
  const index = state.wishlist.indexOf(productId);
  if (index > -1) {
    state.wishlist.splice(index, 1);
    showToast('Removed from wishlist', 'info');
  } else {
    state.wishlist.push(productId);
    showToast('Saved to wishlist ❤️', 'success');
  }
  localStorage.setItem('aashop_wishlist', JSON.stringify(state.wishlist));
  updateWishlistBadge();

  if (state.currentPage === 'wishlist') renderWishlistPage();
  else if (state.currentPage === 'home') renderProducts(state.products);
}

function updateWishlistBadge() {
  const count = state.wishlist.length;
  if (elements.wishlistBadge) {
    elements.wishlistBadge.textContent = count;
    elements.wishlistBadge.classList.toggle('hidden', count === 0);
  }
  if (elements.bottomWishlistBadge) {
    elements.bottomWishlistBadge.textContent = count;
    elements.bottomWishlistBadge.classList.toggle('hidden', count === 0);
  }
  if (elements.metricWishlistCount) {
    elements.metricWishlistCount.textContent = count;
  }
}

/* ==========================================================================
   PAGE 4: DEDICATED CART / SHOPPING BAG PAGE (#cart)
   ========================================================================== */
function renderCartPage() {
  updateCartBadge();

  if (state.cart.length === 0) {
    elements.cartPageLayout.classList.add('hidden');
    elements.cartEmptyState.classList.remove('hidden');
    return;
  }

  elements.cartEmptyState.classList.add('hidden');
  elements.cartPageLayout.classList.remove('hidden');

  elements.cartPageItemsContainer.innerHTML = `
    <div style="margin-bottom: 12px; font-size: 0.86rem; color: var(--text-muted);">
      <i class="fa-solid fa-circle-info text-primary-aa"></i> You can buy any individual item instantly or checkout the whole bag together.
    </div>
    ${state.cart.map(item => `
      <div class="cart-item cart-item-clickable" onclick="openProductDetailPage(${item.id})">
        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="cart-item-img" />
        <div class="cart-item-info">
          <div>
            <h4 class="cart-item-title">${escapeHtml(item.title)}</h4>
            <span class="cart-item-price">${formatMoney(item.price * item.quantity)}</span>
          </div>
          <div class="cart-qty-controls" onclick="event.stopPropagation()">
            <button class="qty-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
          </div>
        </div>
        <div class="cart-item-actions-group" onclick="event.stopPropagation()">
          <button class="btn-buy-single" onclick="buySingleItemFromCart(${item.id})">
            <i class="fa-solid fa-bolt text-warning"></i> Buy This Only
          </button>
          <button class="cart-item-remove" onclick="removeCartItem(${item.id})" title="Remove item">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('')}
  `;

  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + shipping + tax;

  if (elements.pageCartGrandTotal) {
    elements.pageCartGrandTotal.textContent = formatMoney(grandTotal);
  }
}

function addToCart(productId, quantity = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existingItemIndex = state.cart.findIndex(item => item.id === productId);

  if (existingItemIndex > -1) {
    state.cart[existingItemIndex].quantity += quantity;
  } else {
    state.cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
      stock: product.stock,
      quantity: quantity
    });
  }

  saveCart();
  showToast(`Added "${product.title}" to AA Shop bag! 🛍️`, 'success');
  if (state.currentPage === 'cart') renderCartPage();
}

function updateCartQuantity(productId, delta) {
  const itemIndex = state.cart.findIndex(i => i.id === productId);
  if (itemIndex === -1) return;

  state.cart[itemIndex].quantity += delta;
  if (state.cart[itemIndex].quantity <= 0) {
    state.cart.splice(itemIndex, 1);
  }

  saveCart();
  renderCartPage();
}

function removeCartItem(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCart();
  renderCartPage();
  showToast('Item removed from bag', 'info');
}

function saveCart() {
  localStorage.setItem('aashop_cart', JSON.stringify(state.cart));
  updateCartBadge();
}

function updateCartBadge() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (elements.cartBadge) elements.cartBadge.textContent = totalCount;
  if (elements.bottomCartBadge) elements.bottomCartBadge.textContent = totalCount;
  if (elements.metricCartCount) elements.metricCartCount.textContent = totalCount;
}

/* ==========================================================================
   PAGE 5: DEDICATED 2-STEP CHECKOUT WIZARD (#checkout)
   ========================================================================== */
function renderCheckoutPage() {
  // If no checkoutItems set, default to all cart items
  if (!state.checkoutItems || state.checkoutItems.length === 0) {
    if (state.cart.length > 0) {
      state.checkoutItems = [...state.cart];
    } else {
      navigateTo('cart');
      showToast('No items selected for checkout.', 'error');
      return;
    }
  }

  // Reset to Step 1
  elements.checkoutStep1Info.classList.remove('hidden');
  elements.checkoutStep2Payment.classList.add('hidden');
  elements.wizardStepInd1.className = 'wizard-step-indicator active';
  elements.wizardStepInd2.className = 'wizard-step-indicator';

  // Autofill user details if logged in
  if (state.currentUser) {
    if (elements.chkStep1Name) elements.chkStep1Name.value = state.currentUser.name || '';
    if (elements.chkStep1Email) elements.chkStep1Email.value = state.currentUser.email || '';
  }

  // Render Step 1 Items Preview
  elements.step1ItemsPreview.innerHTML = state.checkoutItems.map(item => `
    <div class="checkout-mini-item">
      <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" />
      <div class="mini-info">
        <div><strong>${escapeHtml(item.title)}</strong></div>
        <div class="text-muted">Qty: ${item.quantity} × ${formatMoney(item.price)}</div>
      </div>
      <div><strong>${formatMoney(item.price * item.quantity)}</strong></div>
    </div>
  `).join('');
}

// Step 1 Submission: Validates info and moves to Step 2
function handleStep1Submit(e) {
  e.preventDefault();

  const name = elements.chkStep1Name.value.trim();
  const email = elements.chkStep1Email.value.trim();
  const phone = elements.chkStep1Phone.value.trim();
  const city = elements.chkStep1City.value.trim();
  const address = elements.chkStep1Address.value.trim();
  const zip = elements.chkStep1Zip.value.trim();

  elements.step1ErrorFeedback.classList.add('hidden');

  if (!name || !email || !phone || !city || !address) {
    elements.step1ErrorFeedback.className = 'form-feedback error';
    elements.step1ErrorFeedback.textContent = 'Please complete all required fields (*).';
    elements.step1ErrorFeedback.classList.remove('hidden');
    return;
  }

  state.checkoutDeliveryInfo = { name, email, phone, city, address, zip };

  // Transition to Step 2
  elements.checkoutStep1Info.classList.add('hidden');
  elements.checkoutStep2Payment.classList.remove('hidden');
  elements.wizardStepInd1.className = 'wizard-step-indicator completed';
  elements.wizardStepInd2.className = 'wizard-step-indicator active';

  // Setup Step 2 Cost Breakdown
  const subtotal = state.checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountAmount = state.appliedPromo ? subtotal * state.appliedPromo.discount : 0;
  const discountedSub = Math.max(0, subtotal - discountAmount);
  const shipping = discountedSub > 100 ? 0 : 9.99;
  const tax = discountedSub * 0.05;
  const total = discountedSub + shipping + tax;

  elements.step2ItemsPreview.innerHTML = state.checkoutItems.map(item => `
    <div class="checkout-mini-item">
      <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" />
      <div class="mini-info">
        <div><strong>${escapeHtml(item.title)}</strong></div>
        <div class="text-muted">Qty: ${item.quantity} × ${formatMoney(item.price)}</div>
      </div>
      <div><strong>${formatMoney(item.price * item.quantity)}</strong></div>
    </div>
  `).join('');

  elements.pageChkSubtotal.textContent = formatMoney(subtotal);
  if (discountAmount > 0) {
    elements.pageChkDiscountRow.classList.remove('hidden');
    elements.pageChkDiscount.textContent = `-${formatMoney(discountAmount)}`;
  } else {
    elements.pageChkDiscountRow.classList.add('hidden');
  }
  elements.pageChkShipping.textContent = shipping === 0 ? 'FREE' : formatMoney(shipping);
  elements.pageChkTax.textContent = formatMoney(tax);
  elements.pageChkTotal.textContent = formatMoney(total);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Payment Choice Dynamic Toggles (Separate Easypaisa & JazzCash)
function updatePaymentChoiceUI() {
  const choice = document.querySelector('input[name="payment_choice"]:checked')?.value || 'Cash on Delivery';

  document.querySelectorAll('.payment-tile-card').forEach(tile => {
    const isThis = tile.dataset.method === choice;
    tile.classList.toggle('active', isThis);
    const radio = tile.querySelector('input[name="payment_choice"]');
    if (radio) radio.checked = isThis;
  });

  const boxEp = document.getElementById('box-pay-easypaisa');
  const boxJc = document.getElementById('box-pay-jazzcash');
  const boxCard = document.getElementById('box-pay-card');

  if (boxEp) boxEp.classList.toggle('hidden', choice !== 'Easypaisa');
  if (boxJc) boxJc.classList.toggle('hidden', choice !== 'JazzCash');
  if (boxCard) boxCard.classList.toggle('hidden', choice !== 'Visa / Mastercard');

  // Update button text
  const btn = document.getElementById('page-place-order-btn');
  if (btn) {
    if (choice === 'Easypaisa') {
      btn.innerHTML = '<i class="fa-solid fa-mobile-screen-button"></i> <span>Pay with Easypaisa (Direct Debit)</span>';
    } else if (choice === 'JazzCash') {
      btn.innerHTML = '<i class="fa-solid fa-mobile-retro"></i> <span>Pay with JazzCash (Direct Debit)</span>';
    } else if (choice === 'Visa / Mastercard') {
      btn.innerHTML = '<i class="fa-regular fa-credit-card"></i> <span>Pay Securely with Card (3D Secure)</span>';
    } else {
      btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> <span>Confirm and Place Order (COD)</span>';
    }
  }
}

let pendingGatewayOrderData = null;

// Step 2 Submission: Validates Payment and Initiates Gateway Authorization
async function handleStep2Submit(e) {
  e.preventDefault();

  const paymentMethod = document.querySelector('input[name="payment_choice"]:checked')?.value || 'Cash on Delivery';
  const feedback = document.getElementById('step2-error-feedback');
  if (feedback) feedback.classList.add('hidden');

  const { name, email, phone, city, address, zip } = state.checkoutDeliveryInfo;

  // Calculate order total
  const subtotal = state.checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountAmount = state.appliedPromo ? subtotal * state.appliedPromo.discount : 0;
  const discountedSub = Math.max(0, subtotal - discountAmount);
  const shipping = discountedSub > 100 ? 0 : 9.99;
  const tax = discountedSub * 0.05;
  const grandTotal = discountedSub + shipping + tax;
  const grandTotalFormatted = formatMoney(grandTotal);

  if (paymentMethod === 'Easypaisa') {
    const epNum = document.getElementById('pay-easypaisa-account-no')?.value.trim();
    if (!epNum || epNum.length < 10) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = 'Please enter your registered 11-digit Easypaisa Mobile Account number.';
        feedback.classList.remove('hidden');
      }
      return;
    }

    // Prepare Gateway Modal
    const gwAmount = document.getElementById('gw-easypaisa-amount');
    const gwSender = document.getElementById('gw-easypaisa-sender');
    const gwMpin = document.getElementById('gw-easypaisa-mpin');
    if (gwAmount) gwAmount.textContent = grandTotalFormatted;
    if (gwSender) gwSender.textContent = epNum;
    if (gwMpin) gwMpin.value = '';

    pendingGatewayOrderData = {
      customer_name: name,
      customer_email: email,
      phone,
      address: `${address} (Easypaisa Account: ${epNum})`,
      city,
      postal_code: zip,
      payment_method: `Easypaisa Direct Debit (Account: ${epNum})`,
      methodType: 'Easypaisa',
      senderAccount: epNum,
      grandTotal
    };

    document.getElementById('modal-easypaisa-gateway-backdrop')?.classList.add('active');
    return;
  }

  if (paymentMethod === 'JazzCash') {
    const jcNum = document.getElementById('pay-jazzcash-account-no')?.value.trim();
    const jcCnic = document.getElementById('pay-jazzcash-cnic')?.value.trim();
    if (!jcNum || jcNum.length < 10 || !jcCnic || jcCnic.length < 6) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = 'Please enter your JazzCash Mobile Number and CNIC last 6 digits.';
        feedback.classList.remove('hidden');
      }
      return;
    }

    const gwAmount = document.getElementById('gw-jazzcash-amount');
    const gwSender = document.getElementById('gw-jazzcash-sender');
    const gwMpin = document.getElementById('gw-jazzcash-mpin');
    if (gwAmount) gwAmount.textContent = grandTotalFormatted;
    if (gwSender) gwSender.textContent = jcNum;
    if (gwMpin) gwMpin.value = '';

    pendingGatewayOrderData = {
      customer_name: name,
      customer_email: email,
      phone,
      address: `${address} (JazzCash Account: ${jcNum}, CNIC: ${jcCnic})`,
      city,
      postal_code: zip,
      payment_method: `JazzCash Direct Debit (Account: ${jcNum})`,
      methodType: 'JazzCash',
      senderAccount: jcNum,
      grandTotal
    };

    document.getElementById('modal-jazzcash-gateway-backdrop')?.classList.add('active');
    return;
  }

  if (paymentMethod === 'Visa / Mastercard') {
    const cardName = document.getElementById('pay-card-name')?.value.trim();
    const cardNum = document.getElementById('pay-card-number')?.value.trim();
    const cardExp = document.getElementById('pay-card-expiry')?.value.trim();
    const cardCvv = document.getElementById('pay-card-cvv')?.value.trim();

    if (!cardName || !cardNum || cardNum.length < 15 || !cardExp || !cardCvv) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = 'Please enter complete cardholder details and 16-digit card number.';
        feedback.classList.remove('hidden');
      }
      return;
    }

    const gwAmount = document.getElementById('gw-card-amount');
    const gwCardMask = document.getElementById('gw-card-number-mask');
    const gwOtp = document.getElementById('gw-card-otp');
    if (gwAmount) gwAmount.textContent = grandTotalFormatted;
    if (gwCardMask) gwCardMask.textContent = `•••• •••• •••• ${cardNum.slice(-4)}`;
    if (gwOtp) gwOtp.value = '';

    pendingGatewayOrderData = {
      customer_name: name,
      customer_email: email,
      phone,
      address: `${address} (Card: •••• ${cardNum.slice(-4)})`,
      city,
      postal_code: zip,
      payment_method: `Visa / Mastercard (Card: •••• ${cardNum.slice(-4)}, Name: ${cardName})`,
      methodType: 'Visa / Mastercard',
      senderAccount: `Card •••• ${cardNum.slice(-4)}`,
      grandTotal
    };

    document.getElementById('modal-card-3ds-backdrop')?.classList.add('active');
    return;
  }

  // Cash on Delivery direct placement
  await finalizeAndPlaceOrder({
    customer_name: name,
    customer_email: email,
    phone,
    address: `${address} (Phone: ${phone})`,
    city,
    postal_code: zip,
    payment_method: 'Cash on Delivery (Doorstep Payment)',
    items: state.checkoutItems.map(item => ({
      product_id: item.id,
      quantity: item.quantity
    }))
  });
}

function closePaymentGatewayModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => {
    if (m.id.includes('gateway') || m.id.includes('3ds')) {
      m.classList.remove('active');
    }
  });
}

async function executeGatewayAuthorization(method) {
  if (!pendingGatewayOrderData) return;

  let authBtn = null;
  let pinVal = '';

  if (method === 'Easypaisa') {
    authBtn = document.getElementById('btn-approve-easypaisa');
    pinVal = document.getElementById('gw-easypaisa-mpin')?.value.trim();
    if (!pinVal || pinVal.length < 4) {
      showToast('Please enter your 5-digit Easypaisa MPIN.', 'error');
      return;
    }
  } else if (method === 'JazzCash') {
    authBtn = document.getElementById('btn-approve-jazzcash');
    pinVal = document.getElementById('gw-jazzcash-mpin')?.value.trim();
    if (!pinVal || pinVal.length < 4) {
      showToast('Please enter your 4-digit JazzCash MPIN.', 'error');
      return;
    }
  } else if (method === 'Visa / Mastercard') {
    authBtn = document.getElementById('btn-approve-card');
    pinVal = document.getElementById('gw-card-otp')?.value.trim();
    if (!pinVal || pinVal.length < 4) {
      showToast('Please enter the 6-digit Bank OTP code.', 'error');
      return;
    }
  }

  if (authBtn) {
    authBtn.disabled = true;
    authBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Real-Time Transfer...';
  }

  // Real-time Gateway handshake & instant credit simulation
  await new Promise(r => setTimeout(r, 1000));

  const randomTrx = Math.floor(10000000 + Math.random() * 90000000);
  const trxId = `${method.substring(0, 2).toUpperCase()}-${randomTrx}`;

  const payload = {
    customer_name: pendingGatewayOrderData.customer_name,
    customer_email: pendingGatewayOrderData.customer_email,
    phone: pendingGatewayOrderData.phone,
    address: pendingGatewayOrderData.address,
    city: pendingGatewayOrderData.city,
    postal_code: pendingGatewayOrderData.postal_code,
    payment_method: `${pendingGatewayOrderData.payment_method} [PAID ONLINE ✅ TRX: ${trxId}]`,
    items: state.checkoutItems.map(item => ({
      product_id: item.id,
      quantity: item.quantity
    }))
  };

  closePaymentGatewayModals();
  await finalizeAndPlaceOrder(payload);

  if (authBtn) {
    authBtn.disabled = false;
    authBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Authorize & Pay to Merchant Account';
  }
}

async function finalizeAndPlaceOrder(orderPayload) {
  const btn = document.getElementById('page-place-order-btn');
  const feedback = document.getElementById('step2-error-feedback');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirming & Placing Order...';
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();

    if (data.success && data.order) {
      // Remove purchased items from cart
      const purchasedIds = state.checkoutItems.map(i => i.id);
      state.cart = state.cart.filter(item => !purchasedIds.includes(item.id));
      saveCart();
      state.checkoutItems = [];

      // Save order in persistent local storage cache
      try {
        const localOrders = JSON.parse(localStorage.getItem('aashop_placed_orders') || '[]');
        localOrders.unshift(data.order);
        localStorage.setItem('aashop_placed_orders', JSON.stringify(localOrders));
      } catch (e) {}

      showToast(`🎉 Order ${data.order.order_number} confirmed! Status: PENDING / PAID.`, 'success');
      
      // Render Photorealistic Real Photo Receipt Screen (#receipt)
      renderOrderReceiptScreen(data.order);
    } else {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = data.message || 'Order processing failed.';
        feedback.classList.remove('hidden');
      }
      showToast(data.message || 'Order processing failed.', 'error');
    }
  } catch (error) {
    console.error('Order submission error:', error);
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = 'Failed to connect to server.';
      feedback.classList.remove('hidden');
    }
    showToast('Failed to connect to server.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      updatePaymentChoiceUI();
    }
  }
}

/* ==========================================================================
   PAGE 6: PHOTOREALISTIC REAL PHOTO RECEIPT SCREEN (#receipt) & REAL BARCODE
   ========================================================================== */
function renderOrderReceiptScreen(order) {
  navigateTo('receipt');

  elements.receiptOrderNumber.textContent = order.order_number;
  elements.receiptOrderDate.textContent = new Date(order.created_at || Date.now()).toLocaleString();
  elements.receiptCustomerName.textContent = order.customer_name;
  elements.receiptCustomerPhone.textContent = state.checkoutDeliveryInfo.phone || '0300-1234567';
  elements.receiptCustomerEmail.textContent = order.customer_email;
  elements.receiptPaymentMethod.textContent = order.payment_method;
  elements.receiptCustomerAddress.textContent = `${order.address}, ${order.city}`;
  elements.receiptBarcodeText.textContent = `AA-SHOP-${order.order_number}`;

  // Populate Ordered Items with Real Photos
  elements.receiptItemsList.innerHTML = (order.items || []).map(item => `
    <div class="receipt-photo-item-card">
      <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="receipt-photo-thumb" crossorigin="anonymous" />
      <div class="receipt-photo-info">
        <div class="receipt-photo-title">${escapeHtml(item.title)}</div>
        <div class="receipt-photo-qty">Quantity: ${item.quantity} × ${formatMoney(item.price)}</div>
      </div>
      <div class="receipt-photo-total">${formatMoney(item.price * item.quantity)}</div>
    </div>
  `).join('');

  elements.receiptSubtotal.textContent = formatMoney(order.subtotal || order.total_amount);
  elements.receiptShipping.textContent = order.shipping === 0 ? 'FREE' : formatMoney(order.shipping || 0);
  elements.receiptTax.textContent = formatMoney(order.tax || 0);
  elements.receiptTotalAmount.textContent = formatMoney(order.total_amount);

  // Generate Real Scannable Barcode using JsBarcode
  try {
    if (window.JsBarcode) {
      window.JsBarcode("#receipt-barcode-svg", order.order_number || "ORD-000001", {
        format: "CODE128",
        width: 2.2,
        height: 48,
        displayValue: false,
        lineColor: "#0f172a",
        margin: 0
      });
    }
  } catch (err) {
    console.warn('Barcode generation fallback:', err);
  }

  // Trigger Real Mobile App-Style Pop-up Push Notification & Sound Chime!
  triggerMobilePushPopup(
    `Order Placed: ${order.order_number} 🟡`,
    `Your order of ${formatMoney(order.total_amount)} is in PENDING state. Delivery to ${order.city} in 2-4 days.`,
    'order'
  );
}

// 1-Click Save Receipt Image to Device Gallery / Storage
async function saveReceiptToGallery() {
  const receiptCard = document.getElementById('real-invoice-receipt-card');
  if (!receiptCard) return;

  const btn = document.getElementById('btn-save-receipt');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Gallery...';
  }

  try {
    if (window.html2canvas) {
      const canvas = await window.html2canvas(receiptCard, {
        scale: 2,
        backgroundColor: '#0f172a',
        useCORS: true,
        logging: false
      });

      const orderNum = elements.receiptOrderNumber?.textContent || 'ORD-000001';
      const imageURL = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageURL;
      downloadLink.download = `AA_Shop_Receipt_${orderNum}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Trigger confirmation pop-up notification
      triggerMobilePushPopup(
        'Receipt Saved to Gallery! 📥',
        `Receipt image (AA_Shop_Receipt_${orderNum}.png) has been saved to your device gallery.`,
        'save'
      );
      showToast('Receipt saved to your device gallery! 🖼️', 'success');
    } else {
      window.print();
    }
  } catch (err) {
    console.error('Failed to save receipt image:', err);
    showToast('Failed to save image. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-download"></i> Save Receipt to Gallery';
    }
  }
}

/* ==========================================================================
   REAL MOBILE APP-STYLE POP-UP PUSH NOTIFICATIONS & AUDIO CHIME
   ========================================================================== */
let pushNotifTimer = null;

function triggerMobilePushPopup(title, message, type = 'order') {
  // Play subtle synth chime audio
  playNotificationSound();

  const banner = document.getElementById('mobile-push-notification-banner');
  const titleEl = document.getElementById('push-notif-title');
  const msgEl = document.getElementById('push-notif-message');
  const iconEl = document.getElementById('push-notif-icon');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  if (iconEl) {
    if (type === 'save') {
      iconEl.innerHTML = '<i class="fa-solid fa-download"></i>';
      iconEl.style.background = 'linear-gradient(135deg, #2ed573, #10ac84)';
    } else {
      iconEl.innerHTML = '<i class="fa-solid fa-bag-shopping"></i>';
      iconEl.style.background = 'linear-gradient(135deg, #ffa502, #ff4757)';
    }
  }

  if (banner) {
    banner.classList.remove('hidden');
    clearTimeout(pushNotifTimer);
    pushNotifTimer = setTimeout(() => {
      dismissMobilePushNotification();
    }, 6500);
  }

  // Also trigger Native Web Browser Push Notification if supported
  triggerNativeWebNotification(title, message);
}

function dismissMobilePushNotification() {
  const banner = document.getElementById('mobile-push-notification-banner');
  if (banner) banner.classList.add('hidden');
}

// Gentle Web Audio API Synth Chime
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}

// Native Browser Push Notification
function triggerNativeWebNotification(title, body) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.svg'
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.svg'
        });
      }
    });
  }
}

/* ==========================================================================
   PAGE 7: DEDICATED ACCOUNT HUB DASHBOARD (#account) & DEDICATED SUB-PAGES
   ========================================================================== */
let tempProfileAvatarDataUrl = null;

function renderAccountPage() {
  if (!state.currentUser) {
    navigateTo('auth');
    return;
  }

  elements.accountPageUsername.textContent = state.currentUser.name;
  elements.accountPageUseremail.textContent = state.currentUser.email;
  
  if (elements.accountPageAvatar) {
    if (state.currentUser.avatar_url) {
      elements.accountPageAvatar.innerHTML = `<img src="${state.currentUser.avatar_url}" alt="${escapeHtml(state.currentUser.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
    } else {
      elements.accountPageAvatar.textContent = state.currentUser.name.charAt(0).toUpperCase();
    }
  }

  // Toggle secret Admin tile
  const adminTile = document.getElementById('account-admin-portal-tile');
  const isAdmin = state.currentUser && (state.currentUser.is_admin === 1 || (state.currentUser.email && state.currentUser.email.toLowerCase() === 'ubaidmehar@gmail.com'));
  if (adminTile) {
    adminTile.classList.toggle('hidden', !isAdmin);
  }

  updateWishlistBadge();
  updateCartBadge();
  updateAccountOrdersCount();
}

function renderAccountProfilePage() {
  if (!state.currentUser) {
    navigateTo('auth');
    return;
  }
  elements.pageProfileNameInput.value = state.currentUser.name;
  elements.pageProfileEmailReadonly.value = state.currentUser.email;
  const phoneInput = document.getElementById('page-profile-phone-input');
  if (phoneInput) phoneInput.value = state.currentUser.phone || '';
  elements.pageProfileFeedback.classList.add('hidden');

  tempProfileAvatarDataUrl = null;
  updateProfileAvatarPreview(state.currentUser.avatar_url, state.currentUser.name);
}

function updateProfileAvatarPreview(avatarUrl, name) {
  const imgEl = document.getElementById('profile-avatar-img');
  const letterEl = document.getElementById('profile-avatar-letter');
  if (avatarUrl) {
    if (imgEl) {
      imgEl.src = avatarUrl;
      imgEl.classList.remove('hidden');
    }
    if (letterEl) letterEl.classList.add('hidden');
  } else {
    if (imgEl) imgEl.classList.add('hidden');
    if (letterEl) {
      letterEl.classList.remove('hidden');
      letterEl.textContent = (name || 'U').charAt(0).toUpperCase();
    }
  }
}

function handleProfilePhotoUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      // Create lightweight cropped square preview
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = 180;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;
      ctx.drawImage(img, startX, startY, size, size, 0, 0, 180, 180);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      tempProfileAvatarDataUrl = compressedDataUrl;
      updateProfileAvatarPreview(compressedDataUrl, state.currentUser?.name);
      showToast('Photo selected! Click "Save Profile Settings" to apply.', 'info');
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

async function handleUpdateProfilePage(e) {
  e.preventDefault();
  const name = elements.pageProfileNameInput.value.trim();
  if (!name) return;

  const phone = document.getElementById('page-profile-phone-input')?.value.trim() || '';
  const avatar_url = tempProfileAvatarDataUrl !== null ? tempProfileAvatarDataUrl : (state.currentUser?.avatar_url || null);

  const btn = document.getElementById('page-update-profile-submit-btn');
  if (btn) btn.disabled = true;
  elements.pageProfileFeedback.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ name, phone, avatar_url })
    });

    const data = await res.json();
    if (data.success && data.user) {
      state.currentUser = { ...state.currentUser, ...data.user };
      localStorage.setItem('aashop_user', JSON.stringify(state.currentUser));
      updateAuthUI();
      renderAccountPage();

      elements.pageProfileFeedback.className = 'form-feedback success';
      elements.pageProfileFeedback.textContent = 'Profile settings and picture updated successfully!';
      elements.pageProfileFeedback.classList.remove('hidden');

      triggerMobilePushPopup(
        'Profile Settings Saved! 📸',
        'Your profile name, contact phone, and avatar picture have been updated.',
        'save'
      );
      showToast('Profile and photo updated successfully! 📸✨', 'success');
    } else {
      elements.pageProfileFeedback.className = 'form-feedback error';
      elements.pageProfileFeedback.textContent = data.message || 'Failed to update profile settings.';
      elements.pageProfileFeedback.classList.remove('hidden');
    }
  } catch (err) {
    elements.pageProfileFeedback.className = 'form-feedback error';
    elements.pageProfileFeedback.textContent = 'Server connection error.';
    elements.pageProfileFeedback.classList.remove('hidden');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderAccountPasswordPage(mode = 'normal') {
  if (!state.currentUser) {
    navigateTo('auth');
    return;
  }
  switchPasswordSubView(mode);
  elements.pageChangePasswordForm?.reset();
  const pwdFeedback = document.getElementById('page-change-pwd-feedback');
  if (pwdFeedback) pwdFeedback.classList.add('hidden');
  const otpFeedback = document.getElementById('pwd-otp-reset-feedback');
  if (otpFeedback) otpFeedback.classList.add('hidden');
}

function switchPasswordSubView(viewKey = 'normal') {
  const normalView = document.getElementById('pwd-normal-change-view');
  const otpView = document.getElementById('pwd-otp-reset-view');
  const titleEl = document.getElementById('pwd-page-title');
  const subEl = document.getElementById('pwd-page-subtitle');

  if (viewKey === 'otp') {
    normalView?.classList.add('hidden');
    otpView?.classList.remove('hidden');
    if (titleEl) titleEl.textContent = 'Reset Password via Real OTP';
    if (subEl) subEl.textContent = 'Enter the 6-digit code sent to your registered email to set a new password.';
  } else {
    normalView?.classList.remove('hidden');
    otpView?.classList.add('hidden');
    if (titleEl) titleEl.textContent = 'Account Password & Security';
    if (subEl) subEl.textContent = 'Change your password with current password, or reset instantly via Email OTP.';
  }
}

// 1-Click Instant Forgot Password Trigger (Automatically uses logged in user's email or passed email)
async function triggerInstantForgotOtp(overrideEmail = null) {
  const targetEmail = overrideEmail || state.currentUser?.email || (elements.chkStep1Email ? elements.chkStep1Email.value.trim() : '');

  if (!targetEmail) {
    showToast('Please sign in or enter your account email first.', 'error');
    return;
  }

  const triggerBtn = document.getElementById('btn-trigger-instant-otp');
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching Real OTP to ' + targetEmail + '...';
  }

  try {
    const res = await fetch('/api/auth/forgot-password-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail })
    });

    const data = await res.json();
    if (data.success) {
      const emailDisplay = document.getElementById('pwd-otp-target-email-text');
      if (emailDisplay) emailDisplay.textContent = targetEmail;

      // Switch smoothly to OTP Reset Sub-view
      switchPasswordSubView('otp');

      // Trigger sound chime & mobile push pop-up notification
      triggerMobilePushPopup(
        'OTP Sent to Email! ✉️',
        `Real 6-digit password reset code sent to ${targetEmail}. Please check your inbox.`,
        'order'
      );
      showToast(`Real OTP sent to ${targetEmail}! ✉️ Check your inbox.`, 'success');
    } else {
      showToast(data.message || 'Failed to dispatch reset code.', 'error');
    }
  } catch (err) {
    console.error('Forgot OTP error:', err);
    showToast('Server connection error while dispatching OTP.', 'error');
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = '<i class="fa-solid fa-unlock-keyhole text-warning"></i> <span>Forgot Password? Send OTP to My Email</span>';
    }
  }
}

// Submit OTP & Set New Password
async function handleOtpPasswordResetSubmit() {
  const targetEmail = state.currentUser?.email || (document.getElementById('pwd-otp-target-email-text')?.textContent.trim() || '');
  const otp_code = document.getElementById('pwd-otp-code-input')?.value.trim();
  const new_password = document.getElementById('pwd-otp-new-password')?.value;
  const feedbackEl = document.getElementById('pwd-otp-reset-feedback');

  if (feedbackEl) feedbackEl.classList.add('hidden');

  if (!otp_code || otp_code.length !== 6) {
    if (feedbackEl) {
      feedbackEl.className = 'form-feedback error';
      feedbackEl.textContent = 'Please enter all 6 digits of the OTP code.';
      feedbackEl.classList.remove('hidden');
    }
    return;
  }

  if (!new_password || new_password.length < 6) {
    if (feedbackEl) {
      feedbackEl.className = 'form-feedback error';
      feedbackEl.textContent = 'New password must be at least 6 characters long.';
      feedbackEl.classList.remove('hidden');
    }
    return;
  }

  const submitBtn = document.getElementById('btn-submit-otp-pwd-reset');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Code & Updating...';
  }

  try {
    const res = await fetch('/api/auth/forgot-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail, otp_code, new_password })
    });

    const data = await res.json();
    if (data.success && data.token) {
      setLoggedInUser(data.user, data.token);

      // Trigger pop-up alert & notification
      triggerMobilePushPopup(
        'Password Reset Successfully! 🔒',
        'Your password has been updated. You are now logged in with your new password.',
        'save'
      );
      showToast('Password reset successfully! Logged in with new password 🎉', 'success');

      // Clear inputs and return to normal view
      document.getElementById('pwd-otp-code-input').value = '';
      document.getElementById('pwd-otp-new-password').value = '';
      switchPasswordSubView('normal');
      navigateTo('account');
    } else {
      if (feedbackEl) {
        feedbackEl.className = 'form-feedback error';
        feedbackEl.textContent = data.message || 'Invalid or expired OTP code.';
        feedbackEl.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (feedbackEl) {
      feedbackEl.className = 'form-feedback error';
      feedbackEl.textContent = 'Server error during password reset.';
      feedbackEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Verify OTP & Reset Password';
    }
  }
}

async function loadAccountOrdersList() {
  if (!state.currentUser) return;

  elements.pageOrdersListContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading your order history...</p>
    </div>
  `;

  try {
    let orders = [];

    // 1. Fetch from SQLite via Token
    if (state.token) {
      const res = await fetch('/api/orders/my-orders', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (data.success && data.orders) {
        orders = data.orders;
      }
    }

    // 2. Fetch by Email fallback if empty
    if (orders.length === 0 && state.currentUser.email) {
      const res = await fetch(`/api/orders/by-email/${encodeURIComponent(state.currentUser.email)}`);
      const data = await res.json();
      if (data.success && data.orders) {
        orders = data.orders;
      }
    }

    // 3. Merge with local persistent orders
    try {
      const localOrders = JSON.parse(localStorage.getItem('aashop_placed_orders') || '[]');
      localOrders.forEach(locOrd => {
        if (!orders.some(o => o.order_number === locOrd.order_number || (o.id && o.id === locOrd.id))) {
          orders.push(locOrd);
        }
      });
    } catch (e) {}

    if (elements.metricOrdersCount) elements.metricOrdersCount.textContent = orders.length;

    if (orders && orders.length > 0) {
      elements.pageOrdersListContainer.innerHTML = orders.map(ord => {
        const isPending = !ord.status || ord.status.toLowerCase() === 'pending';
        return `
          <div class="order-history-card">
            <div class="order-history-head">
              <div>
                <strong>${ord.order_number || `ORD-${String(ord.id || 1).padStart(6, '0')}`}</strong>
                <div class="text-muted" style="font-size: 0.78rem;">Placed on ${new Date(ord.created_at || Date.now()).toLocaleDateString()}</div>
              </div>
              <div>
                <span class="order-tag-status ${isPending ? 'status-pending' : ''}">
                  <i class="fa-solid fa-clock"></i> ${isPending ? 'PENDING CONFIRMATION' : ord.status.toUpperCase()}
                </span>
              </div>
            </div>

            <!-- Order Tracking Progress Stepper -->
            <div class="order-stepper-track mt-3 mb-3">
              <div class="stepper-step active">
                <div class="step-dot"><i class="fa-solid fa-check"></i></div>
                <span class="step-text">1. Order Placed (Pending)</span>
              </div>
              <div class="stepper-line"></div>
              <div class="stepper-step">
                <div class="step-dot">2</div>
                <span class="step-text">2. Quality Check & Packing</span>
              </div>
              <div class="stepper-line"></div>
              <div class="stepper-step">
                <div class="step-dot">3</div>
                <span class="step-text">3. Dispatched / Courier</span>
              </div>
              <div class="stepper-line"></div>
              <div class="stepper-step">
                <div class="step-dot">4</div>
                <span class="step-text">4. Delivered</span>
              </div>
            </div>

            <div class="order-delivery-meta mb-2" style="font-size: 0.83rem; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div><strong>Payment Method:</strong> <span class="text-primary-aa">${escapeHtml(ord.payment_method || 'Cash on Delivery')}</span></div>
              <div class="mt-1"><strong>Delivery Destination:</strong> ${escapeHtml(ord.customer_name || state.currentUser.name)} - ${escapeHtml(ord.address || '')}, ${escapeHtml(ord.city || '')}</div>
            </div>

            <div class="cost-divider"></div>
            <div class="mt-2 mb-2 font-weight-bold" style="font-size: 0.86rem;"><i class="fa-solid fa-bag-shopping text-primary-aa"></i> Ordered Items:</div>

            <div class="receipt-items-list-container">
              ${(ord.items || []).map(i => `
                <div class="receipt-photo-item-card" style="margin-bottom: 8px;">
                  <img src="${escapeHtml(i.image_url)}" alt="${escapeHtml(i.title)}" class="receipt-photo-thumb" style="width: 44px; height: 44px;" />
                  <div class="receipt-photo-info">
                    <div class="receipt-photo-title" style="font-size: 0.88rem;">${escapeHtml(i.title)}</div>
                    <div class="receipt-photo-qty">Qty: ${i.quantity} × ${formatMoney(i.price)}</div>
                  </div>
                  <div class="receipt-photo-total" style="font-size: 0.92rem;">${formatMoney(i.price * i.quantity)}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="cost-divider"></div>
            <div class="cost-row mt-2" style="font-size: 1.05rem;">
              <span class="text-muted">Total Amount Paid:</span>
              <strong class="text-primary-aa">${formatMoney(ord.total_amount)}</strong>
            </div>
          </div>
        `;
      }).join('');
    } else {
      if (elements.metricOrdersCount) elements.metricOrdersCount.textContent = '0';
      elements.pageOrdersListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>
          <h4>No Orders Found</h4>
          <p>You haven't placed any orders yet. Explore our products and order anytime!</p>
          <button class="btn btn-primary-aa mt-3" onclick="navigateTo('home')">
            <i class="fa-solid fa-bag-shopping"></i> Start Shopping
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading orders:', error);
    elements.pageOrdersListContainer.innerHTML = `<p class="text-danger text-center">Failed to load orders.</p>`;
  }
}

function setupFaqAccordion() {
  if (!elements.pageFaqsAccordion) return;
  elements.pageFaqsAccordion.addEventListener('click', (e) => {
    const questionBtn = e.target.closest('.faq-question');
    if (!questionBtn) return;

    const item = questionBtn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) {
      item.classList.add('open');
    }
  });
}

/* ==========================================================================
   24/7 GEMINI AI CUSTOMER SUPPORT CHAT
   ========================================================================== */
const aiChatState = {
  history: [],
  isGenerating: false
};

function renderAccountFaqsPage() {
  setupFaqAccordion();
}

function askAiQuick(promptText) {
  const input = document.getElementById('ai-chat-input');
  if (input) {
    input.value = promptText;
    handleAiChatSubmit(new Event('submit'));
  }
}

async function handleAiChatSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('ai-chat-input');
  const userText = input ? input.value.trim() : '';

  if (!userText || aiChatState.isGenerating) return;

  // Clear input
  if (input) input.value = '';

  // Append user message
  appendAiChatMessage('user', userText);

  // Show typing indicator
  aiChatState.isGenerating = true;
  const sendBtn = document.getElementById('ai-chat-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  const typingId = 'ai-typing-' + Date.now();
  const container = document.getElementById('ai-chat-messages');
  if (container) {
    const typingBubble = document.createElement('div');
    typingBubble.className = 'ai-msg-bubble bot';
    typingBubble.id = typingId;
    typingBubble.innerHTML = `
      <div class="ai-msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="ai-msg-body">
        <span class="loading-dots"><i class="fa-solid fa-circle-notch fa-spin"></i> AA Shop AI is thinking...</span>
      </div>
    `;
    container.appendChild(typingBubble);
    container.scrollTop = container.scrollHeight;
  }

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: aiChatState.history
      })
    });

    const data = await res.json();
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    if (data.success && data.reply) {
      aiChatState.history.push({ role: 'user', text: userText });
      aiChatState.history.push({ role: 'assistant', text: data.reply });
      appendAiChatMessage('bot', data.reply);
    } else {
      appendAiChatMessage('bot', data.message || 'Sorry, unable to process your request. You can also chat on WhatsApp: 0329-8024266.');
    }
  } catch (err) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    appendAiChatMessage('bot', 'Network error. Please connect directly with our WhatsApp Support team: 0329-8024266.');
  } finally {
    aiChatState.isGenerating = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

function appendAiChatMessage(role, text) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `ai-msg-bubble ${role}`;

  const iconClass = role === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot';

  // Format basic markdown like bold and lists
  let formattedText = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  // Highlight WhatsApp number as clickable link
  formattedText = formattedText.replace(/0329-?8024266/g, '<a href="https://wa.me/923298024266?text=Hello%20AA%20Shop%20Support" target="_blank" class="text-success font-weight-bold" style="text-decoration: underline;"><i class="fa-brands fa-whatsapp"></i> 0329-8024266</a>');

  bubble.innerHTML = `
    <div class="ai-msg-avatar"><i class="${iconClass}"></i></div>
    <div class="ai-msg-body">
      <p style="margin: 0;">${formattedText}</p>
    </div>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

/* ==========================================================================
   PASSWORD TOGGLE VISIBILITY HELPER (👁️ Seen / Hide Password)
   ========================================================================== */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  const icon = btn ? btn.querySelector('i') : null;
  if (icon) {
    if (isPass) {
      icon.className = 'fa-regular fa-eye-slash text-primary-aa';
      if (btn) btn.title = 'Hide Password';
    } else {
      icon.className = 'fa-regular fa-eye';
      if (btn) btn.title = 'Show Password';
    }
  }
}

/* ==========================================================================
   PAGE 8: DEDICATED SIGN IN & REGISTRATION PAGE (#login, #register)
   ========================================================================== */
function renderAuthPage(mode = 'login') {
  elements.pageOtpScreen.classList.add('hidden');
  elements.pageAuthMainView.classList.remove('hidden');
  elements.pageLoginFeedback.classList.add('hidden');
  elements.pageRegisterFeedback.classList.add('hidden');

  elements.pageLoginForm.classList.toggle('hidden', mode !== 'login');
  elements.pageRegisterForm.classList.toggle('hidden', mode !== 'register');
}

async function handleLoginPageSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const emailInput = document.getElementById('page-login-email');
  const passwordInput = document.getElementById('page-login-password');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const remember = document.getElementById('page-login-remember-me') ? document.getElementById('page-login-remember-me').checked : true;

  if (!email || !password) {
    showToast('Please enter your email and password.', 'error');
    return;
  }

  const feedback = elements.pageLoginFeedback || document.getElementById('page-login-feedback');
  if (feedback) feedback.classList.add('hidden');
  const btn = document.getElementById('page-login-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Signing In...</span>';
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember })
    });

    const data = await res.json();

    if (data.success && data.token) {
      setLoggedInUser(data.user, data.token);
      const isAdmin = data.user.is_admin === 1 || (data.user.email && data.user.email.toLowerCase() === 'ubaidmehar@gmail.com');
      if (isAdmin) {
        showToast(`Welcome Master Admin, ${data.user.name}! 👑`, 'success');
        navigateTo('admin');
      } else {
        showToast(`Welcome back, ${data.user.name}! 👋`, 'success');
        navigateTo('home');
      }
    } else {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = data.message || 'Invalid email or password.';
        feedback.classList.remove('hidden');
      }
      showToast(data.message || 'Invalid email or password.', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = 'Server connection error.';
      feedback.classList.remove('hidden');
    }
    showToast('Server connection error.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Sign In</span> <i class="fa-solid fa-arrow-right"></i>';
    }
  }
}

async function handleRegisterPageSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('page-reg-name').value.trim();
  const email = document.getElementById('page-reg-email').value.trim();
  const password = document.getElementById('page-reg-password').value;

  elements.pageRegisterFeedback.classList.add('hidden');
  const btn = document.getElementById('page-register-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching Real OTP...';

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose: 'Account Registration' })
    });

    const data = await res.json();

    if (data.success) {
      state.pendingAuth = { name, email, password, purpose: 'Account Registration' };
      showOtpPageScreen(email);
      showToast(`Real 6-digit verification code dispatched to ${email}! ✉️ Check your inbox.`, 'success');
    } else {
      elements.pageRegisterFeedback.className = 'form-feedback error';
      elements.pageRegisterFeedback.textContent = data.message || 'Failed to process registration.';
      elements.pageRegisterFeedback.classList.remove('hidden');
    }
  } catch (error) {
    elements.pageRegisterFeedback.className = 'form-feedback error';
    elements.pageRegisterFeedback.textContent = 'Server error.';
    elements.pageRegisterFeedback.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> <span>Send Real OTP & Register</span>';
  }
}

async function handleVerifyOtpPageSubmit(e) {
  e.preventDefault();
  const otpCode = Array.from(elements.pageOtpVerifyForm.querySelectorAll('.otp-digit')).map(d => d.value).join('');

  if (otpCode.length !== 6) {
    elements.pageOtpVerifyFeedback.className = 'form-feedback error';
    elements.pageOtpVerifyFeedback.textContent = 'Please enter all 6 digits.';
    elements.pageOtpVerifyFeedback.classList.remove('hidden');
    return;
  }

  if (!state.pendingAuth || !state.pendingAuth.email) {
    showToast('Session expired. Please request a new OTP.', 'error');
    renderAuthPage('register');
    return;
  }

  elements.pageOtpVerifyFeedback.classList.add('hidden');
  elements.pageVerifyOtpSubmitBtn.disabled = true;
  elements.pageVerifyOtpSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Code...';

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: state.pendingAuth.email,
        otp_code: otpCode,
        purpose: state.pendingAuth.purpose
      })
    });

    const data = await res.json();

    if (data.success) {
      if (state.pendingAuth.purpose === 'Account Registration') {
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.pendingAuth.name,
            email: state.pendingAuth.email,
            password: state.pendingAuth.password,
            otp_code: otpCode
          })
        });
        const regData = await regRes.json();
        if (regData.success && regData.token) {
          setLoggedInUser(regData.user, regData.token);
          showToast(`Account registered & saved in database! Welcome, ${regData.user.name} 🎉`, 'success');
          navigateTo('home');
        } else {
          elements.pageOtpVerifyFeedback.className = 'form-feedback error';
          elements.pageOtpVerifyFeedback.textContent = regData.message || 'Registration failed.';
          elements.pageOtpVerifyFeedback.classList.remove('hidden');
        }
      }
    } else {
      elements.pageOtpVerifyFeedback.className = 'form-feedback error';
      elements.pageOtpVerifyFeedback.textContent = data.message || 'Invalid verification code.';
      elements.pageOtpVerifyFeedback.classList.remove('hidden');
    }
  } catch (error) {
    elements.pageOtpVerifyFeedback.className = 'form-feedback error';
    elements.pageOtpVerifyFeedback.textContent = 'Server connection error.';
    elements.pageOtpVerifyFeedback.classList.remove('hidden');
  } finally {
    elements.pageVerifyOtpSubmitBtn.disabled = false;
    elements.pageVerifyOtpSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Verify & Complete Registration</span>';
  }
}

function showOtpPageScreen(email) {
  elements.pageAuthMainView.classList.add('hidden');
  elements.pageOtpScreen.classList.remove('hidden');
  elements.pageOtpTargetEmail.textContent = email;

  const digits = elements.pageOtpVerifyForm.querySelectorAll('.otp-digit');
  digits.forEach(d => d.value = '');
  elements.pageOtpVerifyFeedback.classList.add('hidden');

  setTimeout(() => {
    digits[0]?.focus();
  }, 100);

  startResendTimer();
}

function startResendTimer() {
  clearInterval(state.resendInterval);
  state.resendCountdown = 60;
  elements.pageResendOtpBtn.disabled = true;
  elements.pageResendTimerText.classList.remove('hidden');
  elements.pageResendTimerText.textContent = `(wait ${state.resendCountdown}s)`;

  state.resendInterval = setInterval(() => {
    state.resendCountdown--;
    if (state.resendCountdown <= 0) {
      clearInterval(state.resendInterval);
      elements.pageResendOtpBtn.disabled = false;
      elements.pageResendTimerText.classList.add('hidden');
    } else {
      elements.pageResendTimerText.textContent = `(wait ${state.resendCountdown}s)`;
    }
  }, 1000);
}

function setupOtpInputs() {
  const digits = document.querySelectorAll('.otp-digit');
  digits.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.length === 1 && index < digits.length - 1) {
        digits[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        digits[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{6}$/.test(text)) {
        text.split('').forEach((char, i) => {
          if (digits[i]) digits[i].value = char;
        });
        digits[5]?.focus();
      }
    });
  });
}

function setLoggedInUser(user, token) {
  state.currentUser = user;
  state.token = token;
  localStorage.setItem('aashop_user', JSON.stringify(user));
  localStorage.setItem('aashop_token', token);
  updateAuthUI();
}

function handleLogout(showNotification = true) {
  state.currentUser = null;
  state.token = null;
  localStorage.removeItem('aashop_user');
  localStorage.removeItem('aashop_token');
  localStorage.removeItem('aashop_active_route');
  sessionStorage.removeItem('aashop_current_page');

  // Reset header & auth UI
  updateAuthUI();

  // Route to home
  window.location.hash = 'home';
  navigateTo('home');

  if (showNotification) {
    showToast('You have been signed out of AA Shop. 👋', 'info');
  }
}

function updateAuthUI() {
  if (state.currentUser) {
    elements.authBtnText.textContent = state.currentUser.name.split(' ')[0];
    if (elements.headerUserAvatar) {
      if (state.currentUser.avatar_url) {
        elements.headerUserAvatar.innerHTML = `<img src="${state.currentUser.avatar_url}" alt="${escapeHtml(state.currentUser.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
      } else {
        elements.headerUserAvatar.textContent = state.currentUser.name.charAt(0).toUpperCase();
      }
    }
  } else {
    if (elements.authBtnText) {
      elements.authBtnText.textContent = 'Sign In / Sign Up';
    }
    if (elements.headerUserAvatar) {
      elements.headerUserAvatar.innerHTML = '<i class="fa-regular fa-user"></i>';
    }
  }
}

/* ==========================================================================
   AI CAMERA & GALLERY VISUAL SEARCH ENGINE
   ========================================================================== */
function openVisualSearchModal() {
  elements.visualSearchModalBackdrop.classList.add('active');
  switchVisualTab('camera');
}

function closeVisualSearchModal() {
  stopCameraStream();
  elements.visualSearchModalBackdrop.classList.remove('active');
  elements.visualAnalysisContainer.classList.add('hidden');
}

function switchVisualTab(tab) {
  elements.tabVisualCamera.classList.toggle('active', tab === 'camera');
  elements.tabVisualGallery.classList.toggle('active', tab === 'gallery');
  elements.paneVisualCamera.classList.toggle('hidden', tab !== 'camera');
  elements.paneVisualGallery.classList.toggle('hidden', tab !== 'gallery');

  if (tab === 'camera') {
    startCameraStream();
  } else {
    stopCameraStream();
  }
}

async function startCameraStream() {
  try {
    elements.cameraPromptOverlay.classList.add('hidden');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      state.cameraStream = stream;
      elements.cameraFeed.srcObject = stream;
      elements.capturePhotoBtn.disabled = false;
    } else {
      showToast('Camera not supported. Please upload from gallery.', 'error');
      switchVisualTab('gallery');
    }
  } catch (err) {
    console.warn('Camera access denied:', err);
    elements.cameraPromptOverlay.classList.remove('hidden');
    elements.capturePhotoBtn.disabled = true;
  }
}

function stopCameraStream() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
}

function captureCameraFrame() {
  if (!elements.cameraFeed) return;
  const canvas = elements.cameraCanvas;
  canvas.width = elements.cameraFeed.videoWidth || 640;
  canvas.height = elements.cameraFeed.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(elements.cameraFeed, 0, 0, canvas.width, canvas.height);
  const base64Image = canvas.toDataURL('image/jpeg', 0.8);
  
  processVisualImage(base64Image, 'Camera Scan');
}

function handleGalleryFileUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG, PNG, WEBP)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    processVisualImage(e.target.result, file.name);
  };
  reader.readAsDataURL(file);
}

async function processVisualImage(base64Data, sourceLabel) {
  elements.visualAnalysisContainer.classList.remove('hidden');
  elements.aiDetectedTagsRow.innerHTML = `
    <span class="ai-tag-pill"><i class="fa-solid fa-sparkles"></i> AI Scanning Image...</span>
  `;
  elements.visualResultsGrid.innerHTML = `
    <div class="loading-state" style="grid-column: 1 / -1; padding: 20px;">
      <div class="spinner"></div>
      <p>AI Matching against AA Shop catalog...</p>
    </div>
  `;

  const inferredTags = [];
  const lowerSource = sourceLabel.toLowerCase();
  
  const keywords = [
    'iphone', 'phone', 'mobile', 'samsung', 'watch', 'headphone', 'audio', 'earbuds', 
    'laptop', 'macbook', 'camera', 'shoe', 'sneaker', 'jacket', 'sunglasses', 'perfume', 
    'dior', 'tv', 'appliance', 'dumbbell', 'gym', 'dashcam', 'ps5', 'espresso'
  ];

  keywords.forEach(k => {
    if (lowerSource.includes(k)) inferredTags.push(k);
  });

  if (inferredTags.length === 0) {
    inferredTags.push('electronic', 'smart', 'premium');
  }

  try {
    const res = await fetch('/api/products/visual-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_label: sourceLabel,
        detected_tags: inferredTags,
        image_base64: base64Data
      })
    });

    const data = await res.json();

    if (data.success && data.products && data.products.length > 0) {
      elements.aiDetectedTagsRow.innerHTML = inferredTags.map(t => `
        <span class="ai-tag-pill"><i class="fa-solid fa-tag"></i> ${escapeHtml(t)}</span>
      `).join('');

      elements.visualResultsGrid.innerHTML = data.products.map(p => `
        <div class="visual-match-card" onclick="closeVisualSearchModal(); openProductDetailPage(${p.id})">
          <span class="visual-score-tag">${p.similarity_score || 95}% MATCH</span>
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" class="visual-match-img" />
          <div class="visual-match-title">${escapeHtml(p.title)}</div>
          <div class="visual-match-price">${formatMoney(p.price)}</div>
        </div>
      `).join('');

      showToast(`Found ${data.products.length} visual matches in AA Shop!`, 'success');
    } else {
      elements.visualResultsGrid.innerHTML = `
        <p class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 20px;">No exact visual matches found. Try another photo.</p>
      `;
    }
  } catch (err) {
    console.error('Visual search error:', err);
    elements.visualResultsGrid.innerHTML = `
      <p class="text-danger" style="grid-column: 1 / -1; text-align: center;">Visual Search service unavailable.</p>
    `;
  }
}

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */
function setupEventListeners() {
  // Navigation Links
  elements.navBrandLink?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('home');
  });

  elements.navAccountBtn?.addEventListener('click', () => {
    if (state.currentUser) navigateTo('account');
    else navigateTo('auth');
  });

  // Currency Picker
  elements.currencyPickerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.currencyDropdown.classList.toggle('hidden');
  });

  document.querySelectorAll('.currency-item').forEach(item => {
    item.addEventListener('click', () => {
      setCurrency(item.dataset.currency);
      elements.currencyDropdown.classList.add('hidden');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#currency-picker-wrap')) {
      elements.currencyDropdown?.classList.add('hidden');
    }
  });

  // Search input
  let searchTimeout;
  elements.searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    elements.searchClearBtn?.classList.toggle('hidden', !state.searchQuery);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (state.currentPage !== 'home') navigateTo('home');
      fetchProducts();
    }, 300);
  });

  elements.searchClearBtn?.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClearBtn.classList.add('hidden');
    fetchProducts();
  });

  elements.searchSubmitBtn?.addEventListener('click', () => {
    state.searchQuery = elements.searchInput.value.trim();
    if (state.currentPage !== 'home') navigateTo('home');
    fetchProducts();
  });

  // AI Visual Search
  elements.openVisualSearchBtn?.addEventListener('click', openVisualSearchModal);
  elements.closeVisualSearchBtn?.addEventListener('click', closeVisualSearchModal);
  elements.visualSearchModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === elements.visualSearchModalBackdrop) closeVisualSearchModal();
  });
  elements.tabVisualCamera?.addEventListener('click', () => switchVisualTab('camera'));
  elements.tabVisualGallery?.addEventListener('click', () => switchVisualTab('gallery'));
  elements.startCameraStreamBtn?.addEventListener('click', startCameraStream);
  elements.capturePhotoBtn?.addEventListener('click', captureCameraFrame);
  elements.triggerFileSelectBtn?.addEventListener('click', () => elements.galleryFileInput.click());
  elements.galleryFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleGalleryFileUpload(e.target.files[0]);
  });

  // Gallery Drag & Drop
  elements.galleryDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.galleryDropzone.style.borderColor = 'var(--aa-primary)';
  });
  elements.galleryDropzone?.addEventListener('dragleave', () => {
    elements.galleryDropzone.style.borderColor = '';
  });
  elements.galleryDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.galleryDropzone.style.borderColor = '';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleGalleryFileUpload(e.dataTransfer.files[0]);
    }
  });

  // Category Pills
  elements.categoryPills?.addEventListener('click', (e) => {
    const pill = e.target.closest('.daraz-cat-item');
    if (!pill) return;

    document.querySelectorAll('.daraz-cat-item').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    state.activeCategory = pill.dataset.category;
    if (state.currentPage !== 'home') navigateTo('home');
    fetchProducts();
  });

  // Sort dropdown
  elements.sortSelect?.addEventListener('change', (e) => {
    state.activeSort = e.target.value;
    fetchProducts();
  });

  // Reset filters
  elements.resetFiltersBtn?.addEventListener('click', () => {
    state.searchQuery = '';
    state.activeCategory = 'All';
    state.activeSort = 'featured';
    elements.searchInput.value = '';
    elements.sortSelect.value = 'featured';
    document.querySelectorAll('.daraz-cat-item').forEach(p => {
      p.classList.toggle('active', p.dataset.category === 'All');
    });
    fetchProducts();
  });

  // Hero Featured CTA
  elements.heroFeaturedBtn?.addEventListener('click', () => {
    state.activeSort = 'rating';
    elements.sortSelect.value = 'rating';
    fetchProducts();
    document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Dedicated Cart Page Checkout Entire Bag Button
  elements.pageCheckoutBtn?.addEventListener('click', () => {
    state.checkoutItems = [...state.cart];
    navigateTo('checkout');
  });

  // 2-Step Checkout Forms
  elements.checkoutStep1Form?.addEventListener('submit', handleStep1Submit);
  elements.checkoutStep2Form?.addEventListener('submit', handleStep2Submit);
  elements.btnBackToStep1?.addEventListener('click', () => {
    elements.checkoutStep2Payment.classList.add('hidden');
    elements.checkoutStep1Info.classList.remove('hidden');
    elements.wizardStepInd1.className = 'wizard-step-indicator active';
    elements.wizardStepInd2.className = 'wizard-step-indicator';
  });

  // Payment Choice Radio / Tile Clicks (Big visual cards, no tiny dots)
  document.querySelectorAll('input[name="payment_choice"]').forEach(radio => {
    radio.addEventListener('change', updatePaymentChoiceUI);
  });
  document.querySelectorAll('.payment-tile-card').forEach(tile => {
    tile.addEventListener('click', () => {
      const radio = tile.querySelector('input[name="payment_choice"]');
      if (radio) {
        radio.checked = true;
        updatePaymentChoiceUI();
      }
    });
  });

  // Dedicated Account Page
  elements.pageUpdateProfileForm?.addEventListener('submit', handleUpdateProfilePage);
  elements.pageChangePasswordForm?.addEventListener('submit', handleChangePasswordPage);
  elements.pageForgotSendOtpBtn?.addEventListener('click', handleForgotSendOtpPage);
  elements.pageForgotSubmitResetBtn?.addEventListener('click', handleForgotSubmitResetPage);
  elements.accountPageLogoutBtn?.addEventListener('click', () => handleLogout(true));

  // Dedicated Auth Form
  elements.pageLoginForm?.addEventListener('submit', handleLoginPageSubmit);
  elements.pageRegisterForm?.addEventListener('submit', handleRegisterPageSubmit);
  elements.pageOtpVerifyForm?.addEventListener('submit', handleVerifyOtpPageSubmit);
  elements.pageSwitchToRegister?.addEventListener('click', () => renderAuthPage('register'));
  elements.pageSwitchToLogin?.addEventListener('click', () => renderAuthPage('login'));
  elements.pageSwitchToForgot?.addEventListener('click', (e) => {
    e.preventDefault();
    const enteredEmail = document.getElementById('login-email')?.value.trim();
    if (enteredEmail) {
      triggerInstantForgotOtp(enteredEmail);
    }
    navigateTo('account-password', 'otp');
  });
  elements.pageBackToAuthBtn?.addEventListener('click', () => renderAuthPage('login'));

  elements.pageResendOtpBtn?.addEventListener('click', () => {
    if (state.pendingAuth && state.pendingAuth.email) {
      fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.pendingAuth.email,
          purpose: state.pendingAuth.purpose
        })
      }).then(r => r.json()).then(d => {
        if (d.success) {
          showToast(`New code sent to ${state.pendingAuth.email}!`, 'success');
          startResendTimer();
        }
      });
    }
  });

  // Hero Quick Add
  document.querySelector('.hero-quick-add')?.addEventListener('click', (e) => {
    const id = parseInt(e.target.dataset.id) || 13;
    buyNowDirect(id);
  });
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconClass = type === 'success'
    ? 'fa-solid fa-circle-check'
    : type === 'error'
    ? 'fa-solid fa-circle-exclamation'
    : 'fa-solid fa-circle-info';

  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
