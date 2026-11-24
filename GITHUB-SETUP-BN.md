# Steadfast Note Extension — GitHub-এ লাইভ করার গাইড

## একটা সত্যি কথা আগে

GitHub-এ push দিলেই Chrome এক্সটেনশন **নিজে থেকে** আপডেট হয় না — যদি সেটা
`Load unpacked` দিয়ে লোড করা থাকে। Chrome শুধু **Chrome Web Store** থেকে
ইনস্টল করা এক্সটেনশনই নিজে আপডেট করে। তাই ২টা রুট:

### রুট B — ফ্রি, GitHub-ই যথেষ্ট (এটাই বেছে নেওয়া হয়েছে)
এক্সটেনশনের ভেতরে আপডেট-চেকার বসানো আছে (`Note/background.js`)।
- Background প্রতি ৬ ঘণ্টায় GitHub-এর `manifest.json` (raw link) চেক করবে।
- নতুন ভার্সন এলে আইকনে **NEW** ব্যাজ + পপআপে ডাউনলোড ব্যানার আসবে।
- ইউজার ১ ক্লিকে নতুন Release zip নামাবে, extract করে `chrome://extensions`-এ **Reload** চাপবে — ১০ সেকেন্ডের কাজ।
- খরচ ০, রিভিউ নেই, কিন্তু ১০০% অটোমেটিক নয় — প্রতি আপডেটে ১টা ক্লিক + Reload লাগবে।

### রুট A — সত্যিকারের অটো-আপডেট (পরে চাইলে)
Chrome Web Store + GitHub Actions।
- একবার Store-এ পাবলিশ করলে, GitHub-এ push → Actions zip বানিয়ে Store-এ
  আপলোড করবে → Chrome নিজে সবার ব্রাউজারে আপডেট নামিয়ে নেবে।
- লাগবে: Chrome Web Store ডেভেলপার অ্যাকাউন্ট (একবার $৫), আর GitHub
  Secrets-এ `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`,
  `CHROME_REFRESH_TOKEN`, `CHROME_EXTENSION_ID`।
- খারাপ দিক: Store রিভিউতে কয়েক ঘণ্টা–দিন লাগতে পারে, তাই push করলেই
  সঙ্গে সঙ্গে লাইভ হয় না।

## সিস্টেম রেডী — এই ফোল্ডারে কী আছে

- `Note/` — এক্সটেনশনের আসল কোড (v1.2.0 — অর্ডার ফর্ম + পোর্টাল রাইডার রেটিং)
- `README.md` — ইনস্টল + আপডেটের গাইড (GitHub-এ repo-র প্রথম পেজে দেখাবে)
- `.github/workflows/release.yml` — Tag দিলেই (যেমন `v1.2.0`) zip বানিয়ে GitHub Release বানাবে
- `Note/background.js` — আপডেট-চেকার বসানো আছে; শুধু ৯ নম্বর লাইনে repo-র নাম বসানো বাকি
- `GITHUB-SETUP-BN.md` — এই গাইড
- `V2-SUMMARY-BN.md` — ভার্সনের বদলের সারাংশ
- `docs/` — পুরনো গাইডগুলো (zip-এ যায় না)

## লাইভ করার ধাপ (git ছাড়াই, শুধু ব্রাউজার দিয়ে)

### ধাপ ১ — GitHub-এ repo বানান
1. github.com-এ গিয়ে **+ → New repository**।
2. নাম: `steadfast-note-extension` (বা তোমার পছন্দের নাম)।
3. **Public** রাখো (Private রাখলে raw manifest লিংক কাজ করবে না — চেকার চলবে না)।
4. README/`.gitignore`/license কিছু টিক দিও না — **Create repository** চাপো।

### ধাপ ২ — ফাইল আপলোড করো
1. Repo পেজে **Add file → Upload files**।
2. এই ফোল্ডারের সবকিছু টেনে ছাড়ো: `Note/` ফোল্ডার, `.github/` ফোল্ডার,
   `README.md`, `GITHUB-SETUP-BN.md`, `V2-SUMMARY-BN.md`।
3. নিচে **Commit changes** চাপো।

### ধাপ ৩ — চেকারে repo-র নাম বসাও (১ লাইন)
1. GitHub-এ repo-তে `Note/background.js` খুলে ✏️ (Edit) চাপো।
2. ৯ নম্বর লাইন: `const GITHUB_REPO = 'USERNAME/REPO-NAME — Rayhan to fill';`
3. বদলে বসাও: `const GITHUB_REPO = 'তোমার-ইউজারনেম/steadfast-note-extension';`
   (যেমন: `'rayhan-saykat/steadfast-note-extension'`)
4. **Commit changes** চাপো।
   - আমাকে ইউজারনেম + repo নাম দিলে আমি এই লাইনটা বসিয়ে নতুন zip-ও বানিয়ে দেবো।

### ধাপ ৪ — প্রথম Release বানাও (v1.2.0)
1. Repo পেজের ডানে **Releases → Create a new release**।
2. **Choose a tag** → লিখো `v1.2.0` → **Create new tag**।
3. Title: `v1.2.0`।
4. নিচে **Attach binaries**-এ আমার দেওয়া `steadfast-extension-v2.zip` ফাইলটা
   আপলোড করো (এটার ভেতরে `Note/` ফোল্ডার আছে)।
5. **Publish release** চাপো — ব্যস, লাইভ!

### ধাপ ৫ — নিজের PC-তে ওই Release দিয়ে ইনস্টল করো
1. Release পেজ থেকে `steadfast-extension-v2.zip` ডাউনলোড করে extract করো।
2. `chrome://extensions` → Developer mode → **Load unpacked** → `Note/` ফোল্ডার।
3. এবার থেকে চেকার চালু — নতুন ভার্সন এলে নিজেই জানাবে।

## পরের আপডেট সকল ইউজার কীভাবে পাবে (রুট B)

ধরো তুমি, মুনা, রাখি — সবাই এক্সটেনশনটা ব্যবহার করছো। আপডেটের ধারা:

1. **আমি নতুন ভার্সন বানাই** → `manifest.json`-এ version বাড়ে (যেমন 1.2.0 → 1.2.1)।
2. **GitHub-এ push + নতুন Release** (`v1.2.1` tag, zip আপলোড) — Tag দিলে
   `.github/workflows/release.yml` নিজেই zip বানিয়ে Release-এ বসিয়ে দেবে।
3. **৬ ঘণ্টার মধ্যে সবার ব্রাউজারে NEW নোটিস** — চেকার GitHub-এর manifest
   দেখে ভার্সন মেলায়; নতুন পেলে আইকনে NEW ব্যাজ + পপআপে ব্যানার।
4. **প্রত্যেকে ১ ক্লিকে ডাউনলোড + Reload** — ব্যানারের ডাউনলোডে ক্লিক,
   extract, `chrome://extensions`-এ Reload। হয়ে গেল।
5. যারা প্রথমবার ইনস্টল করবে, তারা Release পেজের সবচেয়ে নতুন zip দিয়েই
   ইনস্টল করবে — তারপর থেকে তারাও নোটিস পাবে।

মানে: **তোমাকে আপডেট প্রত্যেককে হাতে পাঠাতে হবে না** — নোটিস সবার কাছে নিজে
যাবে, শুধু প্রত্যেককে ১টা ক্লিক + Reload করতে হবে। পুরোপুরি ক্লিক-ছাড়া
অটো-আপডেট চাইলে একমাত্র রাস্তা Chrome Web Store (রুট A, একবার $৫)।

## নতুন ভার্সন দেওয়ার চেকলিস্ট (প্রতিবার)

- [ ] `Note/manifest.json`-এ version বাড়ানো হয়েছে
- [ ] বদলগুলো GitHub-এ push করা হয়েছে
- [ ] Tag দেওয়া হয়েছে (`git tag vX.Y.Z && git push origin vX.Y.Z`) বা GitHub-এ Release বানানো হয়েছে
- [ ] Release-এ zip আছে (Actions নিজে বানালে চেক করো)
- [ ] নিজের PC-তে Reload করে নতুন ভার্সন দেখা গেছে
