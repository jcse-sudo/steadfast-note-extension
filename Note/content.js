// ============================================================
// Note Field Auto-Fill — content.js (v2.2.0)
// পুরনো Note / floating অপরিবর্তিত
// v2.1: Steadfast-এর রেটিং পেজে (consignment/rating/<id>) ডিফল্ট
// রেটিং + ধন্যবাদ-মেসেজ বসানো হয় — Submit কখনো অটো হবে না,
// ব্যবহারকারী নিজে দেখে Submit চাপবেন।
// v2.2: অর্ডার ফর্ম ছোট (নাম/ফোন/প্রোডাক্ট/প্রাইস/বিবরণ/চার্জ/COD/
// Invoice/Note); ঠিকানা আর Area (thana/district) ভরা হয় না;
// অর্ডার আইডি তারিখ + দিনের কাউন্টার (DDMMYY + ২ সংখ্যা, যেমন 24112601); রেটিংয়ের কমেন্ট
// এখন প্রতিটা রেটিংয়ের আলাদা (riderComment_<rating>)।
// লাইভ ফর্মের লেবেল (2026-11-24 যাচাই, add-parcel/regular):
// "Phone number", "Name", "Cash on delivery", "Invoice / order ID
// (optional)", "Item description (optional)", "Note (optional)".
// ============================================================

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'fillNote') {
    const success = fillNoteField(request.message);
    sendResponse({ success: success });
  } else if (request.action === 'toggleFloating') {
    toggleFloatingWindow();
  } else if (request.action === 'showFloating') {
    showFloatingWindow();
  } else if (request.action === 'fillOrder') {
    const result = fillOrderForm(request.order || {});
    sendResponse(result);
  } else if (request.action === 'peekInvoice') {
    // পরের অর্ডার আইডি দেখানো — কাউন্টার বাড়ে না
    sendResponse({ invoice: peekInvoiceNumber() });
  }
  return true;
});

// Function to find and fill the note field
function fillNoteField(message) {
  const noteField = findNoteField();
  const invoiceField = findInvoiceField();

  if (noteField) {
    // Check if invoice field is empty
    const invoiceIsEmpty = !invoiceField || invoiceField.value.trim() === '';

    console.log('📝 Filling note field');
    console.log('Invoice field empty?', invoiceIsEmpty);

    // Fill the note field
    noteField.value = message;

    // Trigger all possible events
    noteField.dispatchEvent(new Event('input', { bubbles: true }));
    noteField.dispatchEvent(new Event('change', { bubbles: true }));
    noteField.dispatchEvent(new Event('blur', { bubbles: true }));

    // For React/Vue apps
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(noteField, message);
    noteField.dispatchEvent(new Event('input', { bubbles: true }));

    // Focus and highlight the field
    noteField.focus();
    noteField.style.border = '3px solid #11998e';
    noteField.style.boxShadow = '0 0 15px rgba(17, 153, 142, 0.6)';
    noteField.style.transition = 'all 0.3s';

    // Remove highlight after 2 seconds
    setTimeout(() => {
      noteField.style.border = '';
      noteField.style.boxShadow = '';
    }, 2000);

    // Auto-fill Invoice field ONLY if it's empty
    if (invoiceField && invoiceIsEmpty) {
      const invoiceNumber = getNextInvoiceNumber();
      console.log('📝 Filling invoice field with:', invoiceNumber);

      invoiceField.value = invoiceNumber;

      // Trigger events for invoice field
      invoiceField.dispatchEvent(new Event('input', { bubbles: true }));
      invoiceField.dispatchEvent(new Event('change', { bubbles: true }));
      invoiceField.dispatchEvent(new Event('blur', { bubbles: true }));

      // For React/Vue apps
      const nativeInvoiceValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      if (nativeInvoiceValueSetter) {
        nativeInvoiceValueSetter.call(invoiceField, invoiceNumber);
        invoiceField.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Highlight invoice field
      invoiceField.style.border = '3px solid #11998e';
      invoiceField.style.boxShadow = '0 0 15px rgba(17, 153, 142, 0.6)';

      setTimeout(() => {
        invoiceField.style.border = '';
        invoiceField.style.boxShadow = '';
      }, 2000);
    } else if (invoiceField && !invoiceIsEmpty) {
      console.log('⚠️ Invoice field already has value, skipping auto-fill');
    } else {
      console.log('⚠️ Invoice field not found');
    }

    return true;
  }

  return false;
}

// Enhanced function to find note field
// লাইভ ফর্মের আসল লেবেল (2026-11-24 যাচাই): "Note (optional)",
// placeholder "Instructions for the rider (max. 400 characters)".
// লেবেল দিয়েই আগে খোঁজা হয় — কারণ Item description-এরও maxlength
// 400, তাই শুধু maxlength দিয়ে খুঁজলে ভুল textarea ধরতে পারে।
function findNoteField() {
  const byLabel = findFieldByKeywords(
    [['note (optional)'], ['note'], ['instructions for the rider']],
    'textarea',
    []
  );
  if (byLabel) return byLabel;

  // Try multiple selectors in order of specificity
  const selectors = [
    // Exact match for your screenshot
    'textarea[placeholder*="Type Note"]',
    'textarea[placeholder*="Instructions for the rider"]',
    'textarea[placeholder*="note"]',
    'textarea[placeholder*="Note"]',
    'textarea[maxlength="400"]',

    // By name/id
    'textarea[name*="note" i]',
    'textarea[id*="note" i]',
    'textarea[name*="description" i]',
    'textarea[id*="description" i]',

    // By class
    'textarea[class*="note" i]',
    'textarea[class*="description" i]',

    // Generic textarea with max length
    'textarea[maxlength]'
  ];

  // Try each selector
  for (const selector of selectors) {
    try {
      const field = document.querySelector(selector);
      if (field && field.offsetParent !== null) { // Check if visible
        return field;
      }
    } catch (e) {
      continue;
    }
  }

  // Last resort: find all textareas and pick the most likely one
  const allTextareas = document.querySelectorAll('textarea');
  for (const textarea of allTextareas) {
    if (textarea.offsetParent === null) continue; // Skip hidden

    const placeholder = (textarea.getAttribute('placeholder') || '').toLowerCase();
    const name = (textarea.getAttribute('name') || '').toLowerCase();
    const id = (textarea.getAttribute('id') || '').toLowerCase();
    const maxlength = textarea.getAttribute('maxlength');

    // Check if it matches note-like patterns
    if (placeholder.includes('note') ||
        placeholder.includes('400') ||
        name.includes('note') ||
        id.includes('note') ||
        maxlength === '400') {
      return textarea;
    }
  }

  // If still not found, return the first visible textarea
  for (const textarea of allTextareas) {
    if (textarea.offsetParent !== null) {
      return textarea;
    }
  }

  return null;
}

// ------------------------------------------------------------
// v1.1.0 — লেবেল দিয়ে ফিল্ড খোঁজা (অবস্থান দিয়ে নয়)
// পুরনো বাগ: Invoice না চিনলে ২য় text input-কেই invoice ধরা হতো,
// সেটা ফোন/নাম হতে পারত। এখন লেবেল/placeholder/name/id না মিললে
// ফিল্ড পাওয়া যায়নি বলে জানানো হবে — ভুল ফিল্ডে বসবে না।
// ------------------------------------------------------------
function labelTextFor(el) {
  if (!el) return '';
  // <label for="...">
  if (el.id) {
    const lab = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
    if (lab) return (lab.textContent || '').trim();
  }
  // <label><input ...> Text</label>
  const wrap = el.closest('label');
  if (wrap) return (wrap.textContent || '').trim();
  // aria-label / aria-labelledby
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labEl = document.getElementById(labelledBy);
    if (labEl) return (labEl.textContent || '').trim();
  }
  return '';
}

function fieldSearchText(el) {
  const parts = [
    el.getAttribute('placeholder') || '',
    el.getAttribute('name') || '',
    el.getAttribute('id') || '',
    el.getAttribute('aria-label') || '',
    el.getAttribute('class') || '',
    labelTextFor(el)
  ];
  return parts.join(' ').toLowerCase();
}

// keywordGroups: অগ্রাধিকারের ক্রমে কিওয়ার্ডের গ্রুপ।
// tags: 'input' | 'textarea' | 'both'। exclude: এই শব্দ থাকলে বাদ।
function findFieldByKeywords(keywordGroups, tags, excludeWords) {
  const exclude = (excludeWords || []).map(function(w) { return w.toLowerCase(); });
  let candidates = [];
  if (tags === 'input' || tags === 'both') {
    candidates = candidates.concat(Array.from(document.querySelectorAll('input')));
  }
  if (tags === 'textarea' || tags === 'both') {
    candidates = candidates.concat(Array.from(document.querySelectorAll('textarea')));
  }
  candidates = candidates.filter(function(el) {
    if (el.offsetParent === null) return false; // লুকানো ফিল্ড বাদ
    if (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'submit' || el.type === 'button' || el.type === 'file') return false;
    return true;
  });
  for (const group of keywordGroups) {
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      const text = fieldSearchText(el);
      if (exclude.some(function(w) { return w && text.includes(w); })) continue;
      for (const kw of group) {
        const k = kw.toLowerCase();
        if (!k || !text.includes(k)) continue;
        // লেবেল মিললে সবচেয়ে বেশি স্কোর, placeholder/name/id মিললে তারপর
        const label = labelTextFor(el).toLowerCase();
        const score = label.includes(k) ? 100 : 50;
        if (score > bestScore) { bestScore = score; best = el; }
      }
    }
    if (best) return best;
  }
  return null;
}

function findInvoiceField() {
  console.log('🔍 Looking for Invoice field (label-based)...');
  // লাইভ লেবেল: "Invoice / order ID (optional)"
  const field = findFieldByKeywords(
    [['invoice / order id', 'invoice number', 'invoice no'], ['invoice'], ['order number', 'order no', 'order id']],
    'input',
    []
  );
  if (field) console.log('✅ Found invoice field by label/name/id');
  else console.log('❌ Invoice field not found — ভুল ফিল্ডে বসানো হবে না');
  return field;
}

function findRecipientNameField() {
  // লাইভ লেবেল: "Name", placeholder "Recipient name"
  return findFieldByKeywords(
    [['recipient name', 'receiver name', 'customer name'], ['recipient', 'receiver'], ['name']],
    'input',
    ['product', 'item', 'invoice', 'company', 'shop', 'merchant']
  );
}

function findPhoneField() {
  // লাইভ লেবেল: "Phone number", placeholder "01XXXXXXXXXX"
  return findFieldByKeywords(
    [['phone number', 'mobile number', 'recipient phone', 'receiver phone'], ['phone', 'mobile', 'contact']],
    'input',
    ['invoice', 'amount', 'cod']
  );
}

function findCodField() {
  // লাইভ লেবেল: "Cash on delivery" (prefilled 0)
  return findFieldByKeywords(
    [['cash on delivery', 'cod amount', 'collectable'], ['cod']],
    'input',
    ['charge', 'delivery']
  );
}

function findItemDescriptionField() {
  // লাইভ লেবেল: "Item description (optional)",
  // placeholder "What is inside (max. 400 characters)"
  return findFieldByKeywords(
    [['item description', 'item desc'], ['item']],
    'both',
    ['note']
  );
}

// React/Vue ফর্মেও মান বসানোর জন্য native setter + event
function setFieldValue(el, value) {
  if (!el) return false;
  try {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    highlightField(el);
    return true;
  } catch (e) {
    console.log('setFieldValue failed:', e);
    return false;
  }
}

function highlightField(el) {
  try {
    el.focus();
    el.style.border = '3px solid #11998e';
    el.style.boxShadow = '0 0 15px rgba(17, 153, 142, 0.6)';
    el.style.transition = 'all 0.3s';
    setTimeout(() => {
      el.style.border = '';
      el.style.boxShadow = '';
    }, 2000);
  } catch (e) { /* highlight ব্যর্থ হলে মান বসানোই আসল */ }
}

// v2.2 — পুরো অর্ডার একসাথে Steadfast ফর্মে বসানো (ছোট ফর্ম)
// ফিল্ড: নাম, ফোন, Invoice (অটো তারিখ-আইডি DDMMYY+কাউন্টার), COD (প্রাইস + চার্জ),
// আইটেম বিবরণ, Note। ঠিকানা আর Area (thana/district ড্রপডাউন) ভরা
// হয় না — ঠিকানা Steadfast-এ হাতে লিখবেন, রিপোর্টে 'skipped-manual'।
// Weight (kg) ছোঁয়া হয় না। কখনো auto-submit করে না — ব্যবহারকারী
// নিজে দেখে "Create parcel" চাপবেন।
function fillOrderForm(order) {
  const results = {};
  const fillOne = function(key, finder, value, required) {
    if (value === undefined || value === null || String(value).trim() === '') {
      results[key] = required ? 'missing-value' : 'skipped-empty';
      return;
    }
    const field = finder();
    if (!field) { results[key] = 'not-found'; return; }
    results[key] = setFieldValue(field, String(value)) ? 'ok' : 'failed';
  };

  fillOne('name', findRecipientNameField, order.name, true);
  fillOne('phone', findPhoneField, order.phone, true);

  // ঠিকানা: extension ফর্মে আর নেই — Steadfast-এ হাতে লিখবেন
  results.address = 'skipped-manual';

  // Invoice: popup-এর peek করা অটো আইডি থাকলে সেটাই বসবে।
  // না থাকলে: ফিল্ড খালি থাকলে তারিখ-আইডি (DDMMYY + দিনের
  // কাউন্টার), আগে কিছু থাকলে সেটা রেখে দেওয়া হবে। বসানো আইডি
  // কাউন্টারে সিঙ্ক করা হয়, যাতে পরের peek-এ এটার পরের নম্বর আসে।
  let invoiceUsed = '';
  const invoiceField = findInvoiceField();
  if (order.invoice && String(order.invoice).trim() !== '') {
    invoiceUsed = String(order.invoice).trim();
    if (!invoiceField) results.invoice = 'not-found';
    else results.invoice = setFieldValue(invoiceField, invoiceUsed) ? 'ok' : 'failed';
    try { syncInvoiceStateFromId(invoiceUsed); } catch (e) { /* সিঙ্ক ব্যর্থ হলে কাউন্টার আগের মতোই থাকবে */ }
  } else if (invoiceField) {
    if (invoiceField.value.trim() === '') {
      invoiceUsed = getNextInvoiceNumber();
      results.invoice = setFieldValue(invoiceField, invoiceUsed) ? 'ok-fallback-auto' : 'failed';
    } else {
      invoiceUsed = invoiceField.value.trim();
      results.invoice = 'skipped-existing';
    }
  } else {
    results.invoice = 'not-found';
  }

  fillOne('cod', findCodField, order.cod, true);

  // আইটেম বিবরণ: ইউজারের লেখা বিবরণ; খালি থাকলে "প্রোডাক্ট — ৳দাম"
  const desc = (order.description && String(order.description).trim() !== '')
    ? String(order.description).trim()
    : (order.product ? order.product + ' — ৳' + (order.price || 0) : '');
  fillOne('itemDescription', findItemDescriptionField, desc, false);
  fillOne('note', findNoteField, order.note, false);

  const okCount = Object.values(results).filter(function(v) { return v === 'ok' || v === 'ok-fallback-auto'; }).length;
  console.log('📦 Order fill results:', results);
  return { success: okCount > 0, results: results, invoiceUsed: invoiceUsed };
}

// অর্ডার আইডি: তারিখ + দিনের কাউন্টার — DDMMYY + ২ সংখ্যা
// যেমন 24 Nov 2026-এর ১ম অর্ডার = 24112601, ২য় = 24112602;
// পরের দিন আবার 01 থেকে শুরু (25112601)।
// Steadfast পেজের localStorage-এ {date, counter} থাকে।
const INVOICE_STATE_KEY = 'invoiceCounterState';

function todayDatePart() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return dd + mm + yy;
}

function readInvoiceState() {
  try {
    const s = JSON.parse(localStorage.getItem(INVOICE_STATE_KEY) || 'null');
    if (s && typeof s.date === 'string' && typeof s.counter === 'number') return s;
  } catch (e) { /* ভাঙা state থাকলে নতুন দিনের মতো ধরা হবে */ }
  return null;
}

function writeInvoiceState(state) {
  try { localStorage.setItem(INVOICE_STATE_KEY, JSON.stringify(state)); } catch (e) { /* সেভ ব্যর্থ হলে কাউন্টার আগের মতোই থাকবে */ }
}

// বসানো আইডি থেকে state সিঙ্ক করা (DDMMYY + কাউন্টার হলে তবেই)
function syncInvoiceStateFromId(id) {
  const m = /^(\d{6})(\d{2})$/.exec(String(id || '').trim());
  if (m) writeInvoiceState({ date: m[1], counter: parseInt(m[2], 10) });
}

// পরের অর্ডার আইডি দেখা — কাউন্টার বাড়ে না (peek)
function peekInvoiceNumber() {
  const today = todayDatePart();
  const s = readInvoiceState();
  if (!s || s.date !== today) return today + '01';
  return today + String(s.counter + 1).padStart(2, '0');
}

// Get next invoice number — দিন বদলালে কাউন্টার 01 থেকে শুরু
function getNextInvoiceNumber() {
  const today = todayDatePart();
  const s = readInvoiceState();
  const counter = (s && s.date === today) ? s.counter + 1 : 1;
  writeInvoiceState({ date: today, counter: counter });
  return today + String(counter).padStart(2, '0');
}

// Floating window functionality
let floatingWindow = null;

function toggleFloatingWindow() {
  if (floatingWindow) {
    floatingWindow.remove();
    floatingWindow = null;
  } else {
    createFloatingWindow();
  }
}

function showFloatingWindow() {
  if (!floatingWindow) {
    createFloatingWindow();
  }
}

function createFloatingWindow() {
  // Remove existing floating window if any
  if (floatingWindow) {
    floatingWindow.remove();
  }

  // Load messages from storage
  chrome.storage.sync.get(['messages'], function(result) {
    const messages = result.messages || [];

    // Create floating window
    floatingWindow = document.createElement('div');
    floatingWindow.id = 'note-autofill-floating';
    floatingWindow.innerHTML = `
      <div class="floating-header">
        <div class="floating-header-top">
          <span style="flex: 1; text-align: center;">📝 Quick Fill By</span>
          <div class="floating-header-controls">
            <button class="floating-minimize" title="মিনিমাইজ করুন">−</button>
            <button class="floating-close" title="বন্ধ করুন">✕</button>
          </div>
        </div>
        <div class="floating-name">❤️ RAYHAN ❤️</div>
      </div>
      <div class="floating-body" style="display: block;">
        ${messages.length === 0 ?
          '<p class="floating-empty">কোনো মেসেজ নেই<br><small>Extension খুলে মেসেজ যোগ করুন</small></p>' :
          messages.map((msg, index) => `
            <div class="floating-item" data-index="${index}" title="${msg.message}">
              <span class="floating-title">${msg.title}</span>
              <span class="floating-shortcut">${index < 4 ? 'C+S+' + (index + 1) : 'ক্লিক করুন'}</span>
            </div>
          `).join('')
        }
      </div>
      <div class="floating-resize-handle" title="টেনে উইন্ডো বড় ছোট করুন"></div>
    `;

    document.body.appendChild(floatingWindow);

    // Make draggable
    makeDraggable(floatingWindow);

    // Make resizable
    makeResizable(floatingWindow);

    // Add event listeners
    floatingWindow.querySelector('.floating-close').addEventListener('click', function() {
      floatingWindow.remove();
      floatingWindow = null;
    });

    floatingWindow.querySelector('.floating-minimize').addEventListener('click', function() {
      const body = floatingWindow.querySelector('.floating-body');
      const resizeHandle = floatingWindow.querySelector('.floating-resize-handle');
      if (body.style.display === 'none') {
        body.style.display = 'flex';
        resizeHandle.style.display = 'block';
        floatingWindow.style.height = '320px';
        this.textContent = '−';
      } else {
        body.style.display = 'none';
        resizeHandle.style.display = 'none';
        floatingWindow.style.height = 'auto';
        this.textContent = '+';
      }
    });

    floatingWindow.querySelectorAll('.floating-item').forEach(item => {
      item.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        console.log('Filling with message index:', index);
        const success = fillNoteField(messages[index].message);

        // Visual feedback
        if (success) {
          this.style.background = 'rgba(212, 237, 218, 0.3)';
          this.style.borderColor = 'rgba(40, 167, 69, 0.6)';
          setTimeout(() => {
            this.style.background = '';
            this.style.borderColor = '';
          }, 1000);
        }
      });
    });
  });
}

// Make element draggable
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = element.querySelector('.floating-header');

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    // Don't drag if clicking on buttons
    if (e.target.classList.contains('floating-minimize') ||
        e.target.classList.contains('floating-close')) {
      return;
    }

    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    header.style.cursor = 'grabbing';
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    const newTop = element.offsetTop - pos2;
    const newLeft = element.offsetLeft - pos1;

    // Keep window within viewport
    const maxTop = window.innerHeight - element.offsetHeight;
    const maxLeft = window.innerWidth - element.offsetWidth;

    element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    header.style.cursor = 'move';
  }
}

// Make element resizable
function makeResizable(element) {
  const resizeHandle = element.querySelector('.floating-resize-handle');
  let isResizing = false;
  let startY = 0;
  let startHeight = 0;

  resizeHandle.addEventListener('mousedown', function(e) {
    isResizing = true;
    startY = e.clientY;
    startHeight = element.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  });

  function resize(e) {
    if (!isResizing) return;

    const diff = e.clientY - startY;
    const newHeight = Math.max(150, startHeight + diff);

    // ডায়নামাইক - কোনো লক নেই, যেকোনো সাইজে রিসাইজ করা যাবে
    element.style.height = newHeight + 'px';
  }

  function stopResize() {
    isResizing = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
  }
}

// ------------------------------------------------------------
// v2.1 — Steadfast রেটিং পেজে অটো-ফিল (পোর্টালের নিজের ফর্মে)
// v2.2 — কমেন্ট এখন প্রতিটা রেটিংয়ের আলাদা (riderComment_<rating>)
// - /user/consignment/rating/<id>: "Rate this rider" ড্রপডাউনে
//   সেভ করা ডিফল্ট রেটিং (ডিফল্ট Excellent) বসবে — শুধু এখনো
//   "Select" থাকলে; Comment বক্সে ওই রেটিংয়ের সেভ করা মেসেজ বসবে —
//   শুধু বক্স খালি থাকলে। আগে থেকে কিছু বসানো থাকলে হাত দেওয়া হয় না।
// - /user/consignment/<id> (অর্ডার পেজ): "Rate rider" লিংক থাকলে
//   "⭐ রেটিং দিন" ফ্লোটিং বাটন দেখাবে — ক্লিকে রেটিং পেজে যাবে।
// - Submit কখনো অটো চাপা হবে না — ব্যবহারকারী নিজে দেখে চাপবেন।
// ------------------------------------------------------------
const RIDER_DEFAULT_RATING_FALLBACK = 'Excellent';
const RIDER_DEFAULT_COMMENT_FALLBACK = 'দ্রুত ডেলিভারি দেওয়ার জন্য ধন্যবাদ।';

function setSelectValue(el, value) {
  if (!el) return false;
  try {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    highlightField(el);
    return el.value === value;
  } catch (e) {
    return false;
  }
}

function findRatingDropdown() {
  const selects = Array.from(document.querySelectorAll('select')).filter(function(el) { return el.offsetParent !== null; });
  for (const sel of selects) {
    const text = fieldSearchText(sel);
    const opts = Array.from(sel.options).map(function(o) { return (o.text || '').trim().toLowerCase(); });
    if (text.includes('rate') || text.includes('rider') || opts.includes('excellent')) return sel;
  }
  return null;
}

function findRatingCommentBox() {
  const byPlaceholder = document.querySelector('textarea[placeholder*="comment" i]');
  if (byPlaceholder && byPlaceholder.offsetParent !== null) return byPlaceholder;
  const tas = Array.from(document.querySelectorAll('textarea')).filter(function(el) { return el.offsetParent !== null; });
  if (tas.length === 1) return tas[0];
  return null;
}

function showRatingNotice(text) {
  if (document.getElementById('steadfast-rating-notice')) return;
  const n = document.createElement('div');
  n.id = 'steadfast-rating-notice';
  n.textContent = text;
  n.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:999999;background:#11998e;color:#fff;padding:10px 14px;border-radius:8px;font-size:14px;box-shadow:0 2px 12px rgba(0,0,0,.3);max-width:320px;';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'margin-left:8px;background:transparent;border:0;color:#fff;cursor:pointer;font-size:14px;';
  closeBtn.addEventListener('click', function() { n.remove(); });
  n.appendChild(closeBtn);
  document.body.appendChild(n);
  setTimeout(function() { if (n.parentNode) n.remove(); }, 12000);
}

function autoFillRatingPage() {
  // v2.2: ওই রেটিংয়ের নিজের কমেন্ট (riderComment_<rating>); না থাকলে
  // পুরনো একক ডিফল্ট (v2.1), তারপর রেটিংয়ের ডিফল্ট। খালি সেভ করা
  // থাকলে (Bad/Very Bad-এর ডিফল্ট) বক্স খালিই থাকে — ইউজার লিখবেন।
  chrome.storage.local.get(['riderDefaultRating', 'riderDefaultComment', 'riderComment_Excellent', 'riderComment_Good', 'riderComment_Average', 'riderComment_Bad', 'riderComment_Very Bad'], function(result) {
    const rating = result.riderDefaultRating || RIDER_DEFAULT_RATING_FALLBACK;
    let comment = result['riderComment_' + rating];
    if (comment === undefined) {
      if (rating === RIDER_DEFAULT_RATING_FALLBACK && result.riderDefaultComment !== undefined) comment = result.riderDefaultComment;
      else comment = RIDER_DEFAULT_COMMENT_FALLBACK;
    }
    let didSomething = false;

    const dropdown = findRatingDropdown();
    if (dropdown) {
      const currentText = dropdown.options[dropdown.selectedIndex] ? (dropdown.options[dropdown.selectedIndex].text || '').trim() : '';
      const currentValue = (dropdown.value || '').trim();
      const isStillDefault = currentValue === '' || currentValue.toLowerCase() === 'select' || currentText.toLowerCase() === 'select';
      if (isStillDefault) {
        let target = null;
        Array.from(dropdown.options).forEach(function(o) {
          if (o.value === rating || (o.text || '').trim() === rating) target = o.value;
        });
        if (target !== null && setSelectValue(dropdown, target)) didSomething = true;
      }
    }

    const box = findRatingCommentBox();
    if (box && box.value.trim() === '' && comment && comment.trim() !== '') {
      if (setFieldValue(box, comment)) didSomething = true;
    }

    if (didSomething) showRatingNotice(rating + ' + মেসেজ বসানো হয়েছে — দেখে Submit চাপুন');
  });
}

function addRateRiderButton() {
  if (document.getElementById('steadfast-rate-rider-btn')) return;
  const links = Array.from(document.querySelectorAll('a')).filter(function(a) {
    return a.offsetParent !== null && /rate rider/i.test(a.textContent || '');
  });
  if (links.length === 0) return;
  const href = links[0].getAttribute('href') || '';
  const m = window.location.pathname.match(/\/user\/consignment\/(\d+)/);
  // পুরো পেজ লোড দিয়ে রেটিং পেজে যাওয়া হয় — যাতে content script
  // রেটিং পেজে নিশ্চিতভাবে চলে (SPA-নেভিগেশনে চলত না)।
  const targetUrl = href ? new URL(href, window.location.origin).href
    : (m ? window.location.origin + '/user/consignment/rating/' + m[1] : null);
  if (!targetUrl) return;
  const btn = document.createElement('button');
  btn.id = 'steadfast-rate-rider-btn';
  btn.type = 'button';
  btn.textContent = '⭐ রেটিং দিন';
  btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:999999;background:#11998e;color:#fff;border:0;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.3);';
  btn.addEventListener('click', function() { window.location.href = targetUrl; });
  document.body.appendChild(btn);
}

let lastSteadfastPath = '';
function initSteadfastRating() {
  const path = window.location.pathname || '';
  lastSteadfastPath = path;
  if (/\/user\/consignment\/rating\//.test(path)) {
    autoFillRatingPage();
  } else if (/\/user\/consignment\/\d+/.test(path)) {
    addRateRiderButton();
  }
}

// Steadfast SPA হলে পেজ-রিলোড ছাড়াই URL বদলাতে পারে —
// তাই URL বদল হলেও রেটিং লজিক আবার চালানো হয় (একই পথে একবারই)।
setInterval(function() {
  const path = window.location.pathname || '';
  if (path === lastSteadfastPath) return;
  lastSteadfastPath = path;
  if (/\/user\/consignment\/rating\//.test(path)) {
    autoFillRatingPage();
  } else if (/\/user\/consignment\/\d+/.test(path)) {
    addRateRiderButton();
  }
}, 1000);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSteadfastRating);
} else {
  initSteadfastRating();
}
