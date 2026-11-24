// ============================================================
// Note Field Auto-Fill — background.js (v1.3.2)
// পুরনো শর্টকাট হ্যান্ডলার অপরিবর্তিত + Route B GitHub আপডেট চেকার
// ============================================================

// GitHub আপডেট চেকার — Rayhan-কে এই এক লাইনই ভরতে হবে:
// নিজের GitHub ইউজারনেম/repo বসান, যেমন: 'rayhan-saykat/steadfast-note-extension'
// যতক্ষণ এখানে USERNAME লেখা থাকবে, চেকার কিছু করবে না (কোনো নেটওয়ার্ক কল নয়)।
const GITHUB_REPO = 'jcse-sudo/steadfast-note-extension';

function isGithubConfigured() {
  return GITHUB_REPO && !GITHUB_REPO.includes('USERNAME') && !GITHUB_REPO.includes('—');
}

const MANIFEST_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/Note/manifest.json`;
const RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;

async function checkForUpdate() {
  if (!isGithubConfigured()) return;
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const remote = await res.json();
    const local = chrome.runtime.getManifest().version;
    if (remote.version && remote.version !== local) {
      await chrome.storage.local.set({
        availableUpdate: { version: remote.version, url: RELEASE_URL, checkedAt: Date.now() }
      });
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#11998e' });
    } else {
      // নতুন ভার্সন নেই — পুরনো নোটিস থাকলে মুছে দাও
      await chrome.storage.local.remove('availableUpdate');
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    console.log('Update check failed:', e);
  }
}

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command.startsWith('fill-message-')) {
    const messageIndex = parseInt(command.split('-')[2]) - 1;

    // Get messages from storage
    chrome.storage.sync.get(['messages'], function(result) {
      const messages = result.messages || [];

      if (messageIndex >= 0 && messageIndex < messages.length) {
        // Send message to active tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'fillNote',
              message: messages[messageIndex].message
            });
          }
        });
      }
    });
  }
});

// আপডেট নোটিস খারিজ করা (popup থেকে আসে)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'dismissUpdate') {
    chrome.storage.local.remove('availableUpdate', () => {
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ ok: true });
    });
    return true;
  }
  return false;
});

// Route B — GitHub আপডেট চেক: ইনস্টল/আপডেটের সময় + প্রতি ৬ ঘণ্টায়
chrome.runtime.onInstalled.addListener(() => { checkForUpdate(); });
chrome.alarms.create('update-check', { periodInMinutes: 360 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'update-check') checkForUpdate();
});
