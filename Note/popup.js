let messages = [];
let editingIndex = -1;

// Load messages when popup opens
document.addEventListener('DOMContentLoaded', function() {
  loadMessages();

  // Auto-open floating window when extension opens
  openFloatingWindow();

  // Event listeners
  document.getElementById('menuBtn').addEventListener('click', toggleMenu);
  document.getElementById('addMenuItem').addEventListener('click', () => {
    toggleMenu();
    openModal();
  });
  document.getElementById('clearAllMenuItem').addEventListener('click', () => {
    toggleMenu();
    clearAllMessages();
  });
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('saveMessageBtn').addEventListener('click', saveMessage);
  document.getElementById('floatingBtn').addEventListener('click', openFloatingWindow);

  // Character counter
  document.getElementById('editMessage').addEventListener('input', function() {
    document.getElementById('charCount').textContent = this.value.length;
  });

  // Close modal on outside click
  document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Close menu on outside click
  document.addEventListener('click', function(e) {
    const menu = document.getElementById('menuDropdown');
    const menuBtn = document.getElementById('menuBtn');
    if (!menu.contains(e.target) && e.target !== menuBtn) {
      menu.classList.remove('show');
    }
  });
});

// Toggle menu
function toggleMenu() {
  document.getElementById('menuDropdown').classList.toggle('show');
}

// Load messages from storage
// v2.1: মেসেজের তালিকা একদম খালি থাকলে (প্রথমবার) ডেলিভারি চার্জের
// দুটো মেসেজ (৭০ / ১৩০) ডিফল্ট হিসেবে বসানো হয় — আগের মেসেজ থাকলে
// কখনো ওভাররাইট করা হয় না। deliveryChargeSeeded ফ্ল্যাগের জন্য
// "সব মুছে ফেলুন"-এর পর আবার নিজে নিজে ফিরে আসবে না।
function loadMessages() {
  chrome.storage.sync.get(['messages', 'deliveryChargeSeeded'], function(result) {
    messages = result.messages || [];
    if (messages.length === 0 && !result.deliveryChargeSeeded) {
      messages = [
        { title: 'ডেলিভারি চার্জ ৭০', message: 'ডেলিভারি চার্জ: ৭০ টাকা।' },
        { title: 'ডেলিভারি চার্জ ১৩০', message: 'ডেলিভারি চার্জ: ১৩০ টাকা।' }
      ];
      chrome.storage.sync.set({ messages: messages, deliveryChargeSeeded: true }, function() {
        renderMessages();
      });
      return;
    }
    renderMessages();
  });
}

// Render messages list
function renderMessages() {
  const container = document.getElementById('messagesList');

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="message-card empty">
        <p>কোনো মেসেজ নেই।<br>মেনু (⋮) থেকে মেসেজ যোগ করুন।</p>
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map((msg, index) => `
    <div class="message-card" data-index="${index}" title="${msg.message}">
      <span class="message-title">${msg.title || 'মেসেজ ' + (index + 1)}</span>
      <div class="message-actions">
        <span class="message-shortcut">${index < 4 ? 'C+S+' + (index + 1) : 'ক্লিক করুন'}</span>
        <button class="btn-edit-msg" data-index="${index}" title="এডিট করুন">✏️</button>
        <button class="btn-del-msg" data-index="${index}" title="মুছে ফেলুন">🗑️</button>
      </div>
    </div>
  `).join('');

  // Add click listeners
  container.querySelectorAll('.message-card:not(.empty)').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.classList.contains('btn-edit-msg') || e.target.classList.contains('btn-del-msg')) return;
      fillNoteField(parseInt(this.dataset.index));
    });
  });

  // Edit button listeners
  container.querySelectorAll('.btn-edit-msg').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openModal(parseInt(this.dataset.index));
    });
  });

  // Delete button listeners — v2.2: একটা করে মেসেজ মোছা যায়
  container.querySelectorAll('.btn-del-msg').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      deleteMessage(parseInt(this.dataset.index));
    });
  });
}

// Open modal for add/edit
function openModal(index = -1) {
  editingIndex = index;
  const modal = document.getElementById('editModal');
  const titleInput = document.getElementById('editTitle');
  const messageInput = document.getElementById('editMessage');
  const modalTitle = document.getElementById('modalTitle');
  const saveBtn = document.getElementById('saveMessageBtn');

  if (index >= 0) {
    modalTitle.textContent = 'মেসেজ এডিট করুন';
    titleInput.value = messages[index].title || '';
    messageInput.value = messages[index].message || '';
    saveBtn.innerHTML = '💾 সেভ করুন';
  } else {
    modalTitle.textContent = 'নতুন মেসেজ';
    titleInput.value = '';
    messageInput.value = '';
    saveBtn.innerHTML = '➕ যোগ করুন';
  }

  document.getElementById('charCount').textContent = messageInput.value.length;
  modal.classList.add('show');
  titleInput.focus();
}

// Close modal
function closeModal() {
  document.getElementById('editModal').classList.remove('show');
  editingIndex = -1;
}

// Save message
function saveMessage() {
  console.log('Save button clicked!');

  const title = document.getElementById('editTitle').value.trim();
  const message = document.getElementById('editMessage').value.trim();

  console.log('Title:', title);
  console.log('Message:', message);

  if (!title) {
    showStatus('⚠️ টাইটেল লিখুন!', 'error');
    return;
  }

  if (!message) {
    showStatus('⚠️ মেসেজ লিখুন!', 'error');
    return;
  }

  if (message.length > 400) {
    showStatus('⚠️ মেসেজ ৪০০ অক্ষরের বেশি হতে পারবে না!', 'error');
    return;
  }

  if (editingIndex >= 0) {
    messages[editingIndex] = { title, message };
    console.log('Editing message at index:', editingIndex);
  } else {
    if (messages.length >= 5) {
      showStatus('⚠️ সর্বোচ্চ ৫টি মেসেজ রাখতে পারবেন!', 'error');
      return;
    }
    messages.push({ title, message });
    console.log('Adding new message. Total messages:', messages.length);
  }

  console.log('Saving to storage...');

  chrome.storage.sync.set({ messages: messages }, function() {
    if (chrome.runtime.lastError) {
      console.error('Storage error:', chrome.runtime.lastError);
      showStatus('⚠️ সেভ করতে সমস্যা হয়েছে!', 'error');
      return;
    }

    console.log('Saved successfully!');
    showStatus('✓ মেসেজ সেভ হয়েছে!', 'success');
    loadMessages();
    closeModal();
  });
}

// Clear all messages
function clearAllMessages() {
  if (confirm('সব মেসেজ মুছে ফেলতে চান?')) {
    messages = [];
    chrome.storage.sync.set({ messages: [] }, function() {
      showStatus('✓ সব মেসেজ মুছে ফেলা হয়েছে!', 'success');
      loadMessages();
    });
  }
}

// একটা মেসেজ মোছা (v2.2) — সিড করা ডিফল্ট মেসেজও মোছা যায়;
// deliveryChargeSeeded ফ্ল্যাগের জন্য মোছা ডিফল্ট আর ফিরে আসবে না।
function deleteMessage(index) {
  if (index < 0 || index >= messages.length) return;
  const title = messages[index].title || ('মেসেজ ' + (index + 1));
  if (!confirm('“' + title + '” মেসেজটি মুছে ফেলতে চান?')) return;
  messages.splice(index, 1);
  chrome.storage.sync.set({ messages: messages }, function() {
    showStatus('✓ মেসেজ মুছে ফেলা হয়েছে', 'success');
    loadMessages();
    populateNoteMessageOptions();
  });
}

// Fill note field with selected message
function fillNoteField(index) {
  if (index < 0 || index >= messages.length) {
    showStatus('⚠️ মেসেজ খুঁজে পাওয়া যায়নি!', 'error');
    return;
  }

  const message = messages[index].message;

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'fillNote',
      message: message
    }, function(response) {
      if (chrome.runtime.lastError) {
        showStatus('⚠️ Note ফিল্ড খুঁজে পাওয়া যায়নি! পেজ রিফ্রেশ করুন।', 'error');
      } else if (response && response.success) {
        showStatus('✓ Note ফিল্ডে মেসেজ ফিল হয়েছে!', 'success');
      } else {
        showStatus('⚠️ Note ফিল্ড খুঁজে পাওয়া যায়নি!', 'error');
      }
    });
  });
}

// Open floating window
function openFloatingWindow() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'showFloating'
      });
    }
  });
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status';
  }, 3000);
}

// ============================================================
// v1.1.0 — ট্যাব, অর্ডার ফর্ম, রাইডার রেটিং, আপডেট ব্যানার
// উপরের মেসেজ কোড অপরিবর্তিত; নিচের কোড শুধু যোগ করা হয়েছে।
// v2.1: রাইডার রেটিং এখন পোর্টালের রেটিং পেজে বসে — content.js
// ডিফল্ট রেটিং + মেসেজ Steadfast-এর ফর্মে বসিয়ে দেয়, Submit অটো নয়।
// v2.2: অর্ডার ফর্ম ছোট (নাম/ফোন/প্রোডাক্ট/প্রাইস/বিবরণ/এলাকা/চার্জ/
// Note); অর্ডার আইডি তারিখ + দিনের কাউন্টার (যেমন 24112601) — শুধু Invoice-এ যায়, Note-তে নয়; রাইডার
// কমেন্ট এখন প্রতিটা রেটিংয়ের আলাদা।
// ============================================================

function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- ট্যাব ----------
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      btn.classList.add('active');
      $('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'order') { populateNoteMessageOptions(); peekOrderId(); }
      if (btn.dataset.tab === 'rider') loadRiderDefaults();
    });
  });
}

// ---------- আপডেট ব্যানার (Route B) ----------
function checkUpdateBanner() {
  chrome.storage.local.get(['availableUpdate'], function(result) {
    const u = result.availableUpdate;
    if (!u || !u.version) return;
    $('updateText').textContent = 'নতুন ভার্সন ' + u.version + ' এসেছে — ডাউনলোড করে chrome://extensions-এ Reload করুন।';
    $('updateLink').href = u.url || '#';
    $('updateBanner').style.display = 'flex';
  });
}

// ---------- অর্ডার ফর্ম ----------
// ---------- অর্ডার ফর্ম (v2.2 — ছোট ফর্ম) ----------
// ফিল্ড: নাম, ফোন, প্রোডাক্ট, প্রাইস, বিবরণ, এলাকা, ডেলিভারি চার্জ, Note।
// অর্ডার আইডি তারিখ + দিনের কাউন্টার DDMMYY + ২ সংখ্যা (যেমন 24112601; Steadfast পেজের
// localStorage) — popup content.js-কে peek করে পরের নম্বর দেখায়,
// ফিলের সময় সেটাই Invoice-এ বসে (Note-তে যায় না)।
// COD টাইপ করা হয় না: COD = প্রাইস + ডেলিভারি চার্জ (অটো)।
// ঠিকানা ফর্মে নেই — Steadfast-এ হাতে লিখবেন।
const DELIVERY_CHARGE = { inside: 70, outside: 130 };
let lastAutoNote = '';
let currentOrderId = '';

function orderNum(id) {
  const v = parseFloat($(id).value);
  return isNaN(v) ? 0 : v;
}

function toBn(n) {
  return String(n).replace(/[0-9]/g, function(d) { return '০১২৩৪৫৬৭৮৯'[d]; });
}

// মেসেজের টাইটেল/টেক্সটে ৭০/১৩০ (বাংলা বা ইংরেজি সংখ্যা) থাকলে
// সেটাই ডেলিভারি চার্জ — ১৩০ আগে দেখা হয়।
function detectCharge(text) {
  const t = String(text || '');
  if (/১৩০|130/.test(t)) return 130;
  if (/৭০|70/.test(t)) return 70;
  return null;
}

function buildNoteText() {
  const charge = Math.max(0, orderNum('ordDeliveryCharge'));
  const chargeLine = 'ডেলিভারি চার্জ: ' + toBn(charge) + ' টাকা।';
  const sel = $('ordNoteMsg').value;
  if (!sel) return chargeLine;
  const saved = messages.find(function(m) { return m.title === sel; });
  if (!saved) return chargeLine;
  // চার্জের মেসেজ হলে সেটাই চার্জের লাইন — আলাদা করে জোড়া লাগে না
  if (detectCharge(saved.title) !== null || detectCharge(saved.message) !== null) {
    return chargeLine;
  }
  return saved.message + ' ' + chargeLine;
}

function orderCod() {
  return Math.max(0, orderNum('ordPrice')) + Math.max(0, orderNum('ordDeliveryCharge'));
}

function recalcOrder() {
  $('ordCodTotal').textContent = '৳' + orderCod();
  const note = buildNoteText();
  if ($('ordNote').value.trim() === '' || $('ordNote').value.trim() === lastAutoNote) {
    $('ordNote').value = note;
  }
  lastAutoNote = note;
}

// Steadfast পেজ থেকে পরের অর্ডার আইডি (peek — কাউন্টার বাড়ে না)
function peekOrderId() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'peekInvoice' }, function(response) {
      if (chrome.runtime.lastError) return;
      if (response && response.invoice) {
        currentOrderId = String(response.invoice);
        $('ordAutoId').textContent = currentOrderId;
        recalcOrder();
      }
    });
  });
}

function populateNoteMessageOptions() {
  const sel = $('ordNoteMsg');
  const prev = sel.value;
  chrome.storage.sync.get(['messages'], function(result) {
    const list = result.messages || [];
    messages = list;
    sel.innerHTML = '<option value="">— কোনো মেসেজ নয় —</option>' +
      list.map(function(m) { return '<option value="' + escapeHtml(m.title || '') + '">' + escapeHtml(m.title || '') + '</option>'; }).join('');
    if (prev) sel.value = prev;
  });
}

function validateOrder() {
  const errors = [];
  const name = $('ordName').value.trim();
  const phone = $('ordPhone').value.trim();
  const price = orderNum('ordPrice');
  const charge = orderNum('ordDeliveryCharge');
  if (!name) errors.push('কাস্টমারের নাম লিখুন');
  if (!/^01\d{9}$/.test(phone)) errors.push('ফোন ১১ সংখ্যার হতে হবে এবং 01 দিয়ে শুরু হতে হবে');
  if (!(price > 0)) errors.push('প্রাইস ০-এর বেশি হতে হবে');
  if (charge < 0) errors.push('ডেলিভারি চার্জ ০-এর কম হতে পারবে না');
  return { ok: errors.length === 0, errors: errors };
}

const ORDER_FIELD_LABELS = {
  name: 'নাম', phone: 'ফোন', address: 'ঠিকানা', invoice: 'Invoice',
  cod: 'COD', itemDescription: 'আইটেম বিবরণ', note: 'Note'
};

function renderOrderResult(results) {
  const lines = Object.keys(ORDER_FIELD_LABELS).map(function(key) {
    const v = results[key];
    const label = ORDER_FIELD_LABELS[key];
    if (v === 'ok') return '✓ ' + label;
    if (v === 'ok-fallback-auto') return '✓ ' + label + ' (অটো আইডি)';
    if (v === 'not-found') return '✗ ' + label + ' — ফিল্ড পাওয়া যায়নি';
    if (v === 'missing-value') return '— ' + label + ' — খালি';
    if (v === 'skipped-empty') return '— ' + label + ' — খালি';
    if (v === 'skipped-manual') return '— ' + label + ' — Steadfast-এ হাতে লিখবেন';
    if (v === 'skipped-existing') return '— ' + label + ' — আগের মান আছে';
    return '✗ ' + label + ' — ব্যর্থ';
  });
  $('ordResult').innerHTML = lines.map(function(l) { return '<div>' + escapeHtml(l) + '</div>'; }).join('');
}

function saveRecentOrder(order) {
  chrome.storage.local.get(['recentOrders'], function(result) {
    let list = result.recentOrders || [];
    list.unshift({ id: Date.now(), savedAt: new Date().toISOString(), order: order });
    list = list.slice(0, 10);
    chrome.storage.local.set({ recentOrders: list }, function() { renderRecentOrders(); });
  });
}

function renderRecentOrders() {
  const box = $('recentOrdersList');
  chrome.storage.local.get(['recentOrders'], function(result) {
    const list = result.recentOrders || [];
    if (list.length === 0) {
      box.innerHTML = '<div class="recent-empty">এখনো কোনো অর্ডার সেভ হয়নি।</div>';
      return;
    }
    box.innerHTML = list.map(function(item) {
      const o = item.order || {};
      const title = (o.invoice || '') + ' — ' + (o.name || '') + ' — ৳' + (o.cod || 0);
      return '<div class="recent-item" data-id="' + item.id + '">' +
        '<span class="recent-title">' + escapeHtml(title) + '</span>' +
        '<span class="recent-actions">' +
          '<button class="btn-small" data-refill="' + item.id + '" type="button">আবার বসাও</button>' +
          '<button class="btn-small danger" data-del="' + item.id + '" type="button">মুছো</button>' +
        '</span></div>';
    }).join('');
    box.querySelectorAll('[data-refill]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = parseInt(btn.dataset.refill, 10);
        chrome.storage.local.get(['recentOrders'], function(r) {
          const found = (r.recentOrders || []).find(function(x) { return x.id === id; });
          if (found) refillOrderForm(found.order);
        });
      });
    });
    box.querySelectorAll('[data-del]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = parseInt(btn.dataset.del, 10);
        chrome.storage.local.get(['recentOrders'], function(r) {
          const kept = (r.recentOrders || []).filter(function(x) { return x.id !== id; });
          chrome.storage.local.set({ recentOrders: kept }, function() { renderRecentOrders(); });
        });
      });
    });
  });
}

function refillOrderForm(o) {
  if (!o) return;
  $('ordName').value = o.name || '';
  $('ordPhone').value = o.phone || '';
  // v2.1-এর পুরনো শেপ (productCode/productName/unitPrice/qty) থাকলেও বসবে
  $('ordProduct').value = o.product || o.productCode || o.productName || '';
  $('ordPrice').value = (o.price != null ? o.price : (o.unitPrice != null ? (o.unitPrice * (o.qty || 1)) : ''));
  $('ordDesc').value = o.description || '';
  $('ordDeliveryArea').value = (o.deliveryCharge === 130) ? 'outside' : 'inside';
  $('ordDeliveryCharge').value = (o.deliveryCharge == null ? 70 : o.deliveryCharge);
  $('ordNote').value = o.note || '';
  if (o.invoice) {
    currentOrderId = String(o.invoice);
    $('ordAutoId').textContent = currentOrderId;
  }
  recalcOrder();
  showStatus('✓ আগের অর্ডার ফর্মে বসানো হয়েছে', 'success');
}

function clearOrderForm() {
  ['ordName', 'ordPhone', 'ordProduct', 'ordPrice', 'ordDesc', 'ordNote'].forEach(function(id) { $(id).value = ''; });
  $('ordDeliveryArea').value = 'inside';
  $('ordDeliveryCharge').value = 70;
  $('ordNoteMsg').value = '';
  lastAutoNote = '';
  $('ordError').textContent = '';
  $('ordResult').innerHTML = '';
  recalcOrder();
}

function fillOrderToSteadfast() {
  const check = validateOrder();
  if (!check.ok) {
    $('ordError').textContent = '⚠️ ' + check.errors.join('; ');
    return;
  }
  $('ordError').textContent = '';
  $('ordResult').innerHTML = '';
  const order = {
    invoice: currentOrderId,
    name: $('ordName').value.trim(),
    phone: $('ordPhone').value.trim(),
    product: $('ordProduct').value.trim(),
    price: orderNum('ordPrice'),
    description: $('ordDesc').value.trim(),
    deliveryCharge: orderNum('ordDeliveryCharge'),
    cod: orderCod(),
    note: $('ordNote').value.trim()
  };
  saveRecentOrder(order);
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs[0]) {
      showStatus('⚠️ সক্রিয় ট্যাব পাওয়া যায়নি!', 'error');
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, { action: 'fillOrder', order: order }, function(response) {
      if (chrome.runtime.lastError) {
        showStatus('⚠️ Steadfast পেজে এক্সটেনশন পৌঁছায়নি! Steadfast পেজে গিয়ে রিফ্রেশ করুন।', 'error');
        return;
      }
      if (response && response.results) {
        renderOrderResult(response.results);
        if (response.invoiceUsed) {
          currentOrderId = String(response.invoiceUsed);
          $('ordAutoId').textContent = currentOrderId;
          // পরের অর্ডারের জন্য কাউন্টারের পরের নম্বর দেখাও
          peekOrderId();
        }
        const failed = Object.values(response.results).filter(function(v) { return v === 'not-found' || v === 'failed'; });
        showStatus(failed.length === 0 ? '✓ অর্ডার Steadfast ফর্মে বসানো হয়েছে — দেখে নিয়ে Create চাপুন' : '⚠️ কিছু ফিল্ড বসেনি — নিচে দেখে হাতে বসান', failed.length === 0 ? 'success' : 'error');
      } else {
        showStatus('⚠️ Steadfast ফর্মে বসানো যায়নি!', 'error');
      }
    });
  });
}

function initOrderForm() {
  $('ordPrice').addEventListener('input', recalcOrder);
  $('ordDeliveryCharge').addEventListener('input', recalcOrder);
  // এলাকা বদলালে চার্জ + Note — শেষে বদলানোই জিতবে
  $('ordDeliveryArea').addEventListener('change', function() {
    $('ordDeliveryCharge').value = DELIVERY_CHARGE[$('ordDeliveryArea').value] || 70;
    recalcOrder();
  });
  // ঐচ্ছিক মেসেজ বদলালে: ৭০/১৩০-র চার্জ-মেসেজ হলে চার্জ + এলাকাও বদলাবে
  $('ordNoteMsg').addEventListener('change', function() {
    const sel = $('ordNoteMsg').value;
    const saved = messages.find(function(m) { return m.title === sel; });
    if (saved) {
      let c = detectCharge(saved.title);
      if (c === null) c = detectCharge(saved.message);
      if (c !== null) {
        $('ordDeliveryCharge').value = c;
        $('ordDeliveryArea').value = (c === 130) ? 'outside' : 'inside';
      }
    }
    $('ordNote').value = buildNoteText();
    lastAutoNote = $('ordNote').value.trim();
    recalcOrder();
  });
  $('ordFillBtn').addEventListener('click', fillOrderToSteadfast);
  $('ordClearBtn').addEventListener('click', clearOrderForm);
  recalcOrder();
  renderRecentOrders();
  peekOrderId();
}

// ---------- রাইডার রেটিং (v2.2 — প্রতিটা রেটিংয়ের আলাদা কমেন্ট) ----------
// পুরনো ম্যানুয়াল ফর্ম (নাম/ফোন/তারকা) + লোকাল রেটিং-তালিকা v2.1-এ
// তুলে দেওয়া হয়েছে। riderComment_<rating> কী-তে প্রতিটা রেটিংয়ের
// নিজের কমেন্ট সেভ হয়। ড্রপডাউন বদলালে সেই রেটিংয়ের সেভ করা কমেন্ট
// (না থাকলে ডিফল্ট) কমেন্ট বক্সে দেখায়। পুরনো একক riderDefaultComment
// কী-টা fallback হিসেবে পড়া হয়, যাতে v2.1-এ সেভ করা মেসেজ হারিয়ে
// না যায়। content.js রেটিং পেজে সেই রেটিংয়ের কমেন্টই বসায় —
// Submit কখনো অটো হবে না, Rayhan নিজে দেখে Submit চাপবেন।
const RIDER_DEFAULT_RATING = 'Excellent';
const RIDER_COMMENTS_DEFAULT = {
  'Excellent': 'দ্রুত ডেলিভারি দেওয়ার জন্য ধন্যবাদ।',
  'Good': 'ভালো সার্ভিসের জন্য ধন্যবাদ।',
  'Average': 'ডেলিভারি দেওয়ার জন্য ধন্যবাদ।',
  'Bad': '',
  'Very Bad': ''
};

function riderCommentKey(rating) { return 'riderComment_' + rating; }

function loadRiderDefaults() {
  chrome.storage.local.get(['riderDefaultRating'], function(result) {
    const rating = result.riderDefaultRating || RIDER_DEFAULT_RATING;
    $('riderDefaultRating').value = rating;
    showRiderCommentFor(rating);
  });
}

function showRiderCommentFor(rating) {
  chrome.storage.local.get([riderCommentKey(rating), 'riderDefaultComment'], function(result) {
    let comment = result[riderCommentKey(rating)];
    if (comment === undefined) {
      // পুরনো একক ডিফল্ট (v2.1) থাকলে Excellent-এর জন্য সেটাই,
      // না থাকলে ওই রেটিংয়ের ডিফল্ট
      comment = (rating === RIDER_DEFAULT_RATING && result.riderDefaultComment !== undefined)
        ? result.riderDefaultComment
        : (RIDER_COMMENTS_DEFAULT[rating] || '');
    }
    $('riderDefaultComment').value = comment;
  });
}

function saveRiderDefaults() {
  const rating = $('riderDefaultRating').value;
  const comment = $('riderDefaultComment').value.trim();
  $('riderError').textContent = '';
  const toSave = { riderDefaultRating: rating };
  toSave[riderCommentKey(rating)] = comment;
  chrome.storage.local.set(toSave, function() {
    $('riderSaved').textContent = '✓ ' + rating + '-এর কমেন্ট সেভ হয়েছে';
    showStatus('✓ ' + rating + '-এর কমেন্ট সেভ হয়েছে', 'success');
    setTimeout(function() { $('riderSaved').textContent = ''; }, 3000);
  });
}

function initRiderForm() {
  loadRiderDefaults();
  $('riderDefaultRating').addEventListener('change', function() {
    showRiderCommentFor(this.value);
  });
  $('riderSaveBtn').addEventListener('click', saveRiderDefaults);
}

// v1.1.0 init (মেসেজের DOMContentLoaded-এর পাশাপাশি চলে)
document.addEventListener('DOMContentLoaded', function() {
  initTabs();
  checkUpdateBanner();
  initOrderForm();
  initRiderForm();
  populateNoteMessageOptions();
  $('updateDismiss').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'dismissUpdate' }, function() {
      $('updateBanner').style.display = 'none';
    });
  });
});
