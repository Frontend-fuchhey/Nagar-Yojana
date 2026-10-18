/**
 * Zero-storage Dynamic In-Browser Translator
 * Communicates with the Google Translate engine without storing dictionaries.
 */

export function setPageLanguage(lang) {
  const target = lang === 'ne' ? 'ne' : 'en';
  const cookieVal = `/en/${target}`;
  const host = window.location.hostname;

  // Set googtrans cookie for current path and domains
  document.cookie = `googtrans=${cookieVal}; path=/;`;
  document.cookie = `googtrans=${cookieVal}; path=/; domain=${host};`;

  try {
    localStorage.setItem('preferred_language', target);
  } catch (e) {
    // Ignore storage errors in private browsing
  }

  // Trigger Google Translate select element if initialized
  const select = document.querySelector('#google_translate_element select');
  if (select) {
    select.value = target;
    select.dispatchEvent(new Event('change'));
  } else {
    // If widget not initialized yet, a reload applies the cookie
    window.location.reload();
  }
}

export function getInitialLanguage() {
  try {
    const saved = localStorage.getItem('preferred_language');
    if (saved === 'ne' || saved === 'en') return saved;
  } catch (e) {}

  if (document.cookie.includes('googtrans=/en/ne')) {
    return 'ne';
  }
  return 'en';
}
