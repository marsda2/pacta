/* Shared by the four public websites. Run sync.mjs after editing. */
(function () {
  'use strict';
  if (window.ForfeitPrivacy) return;
  const VERSION = 1;
  const KEY = 'forfeit_privacy_v1';
  const MAX_AGE = 183 * 86400000;
  const domain = /(^|\.)overlord\.app$/.test(location.hostname) ? '; Domain=overlord.app' :
    /(^|\.)forfeit\.app$/.test(location.hostname) ? '; Domain=forfeit.app' : '';
  let memory = null;
  let memoryOnly = false;
  let last = '';
  const listeners = new Set();
  const gpc = () => navigator.globalPrivacyControl === true;
  // EU/EEA, UK and Switzerland need opt-in for optional tracking; everywhere else it is on by default.
  // ponytail: device timezone, not IP. Any Europe/* zone (plus the EU's Atlantic islands) counts, so a few
  // non-EU European countries also get opt-in; no US or other non-European zone can match.
  const optInRegion = () => {
    try { return /^(Europe\/|Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe)$|Arctic\/Longyearbyen$)/.test(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); }
    catch (_) { return false; }
  };
  function valid(value) {
    return value && value.version === VERSION && typeof value.analytics === 'boolean' &&
      typeof value.marketing === 'boolean' && Number.isFinite(value.timestamp) &&
      value.timestamp <= Date.now() && Date.now() - value.timestamp < MAX_AGE;
  }
  function read() {
    let value = memoryOnly ? memory : null;
    try {
      const cookie = document.cookie.split('; ').find(x => x.startsWith(KEY + '='));
      if (cookie) {
        try { value = JSON.parse(decodeURIComponent(cookie.slice(KEY.length + 1))); }
        catch (_) { value = null; }
      }
    } catch (_) { value = memory; }
    if (!valid(value)) return {version: VERSION, timestamp: 0, analytics: !gpc() && !optInRegion(), marketing: !gpc() && !optInRegion()};
    return {...value, marketing: value.marketing && !gpc()};
  }
  function allowed(category) { return read()[category] === true; }
  const safeProperties = new Set(['step', 'platform', 'source', 'clicked_button', 'depth',
    'step_number', 'total_steps', 'time_since_last_step_ms', 'value', 'currency', 'goal_type']);
  function sanitize(properties) {
    const result = {};
    for (const [key, value] of Object.entries(properties || {})) {
      if (safeProperties.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) {
        result[key] = typeof value === 'string' ? value.slice(0, 100) : value;
      }
    }
    return result;
  }
  function sanitizeAnalytics(properties) {
    const result = sanitize(properties);
    // Preserve only randomly generated SDK transport IDs, never old email IDs.
    for (const key of ['distinct_id', '$session_id', '$window_id']) {
      if (typeof properties?.[key] === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(properties[key])) result[key] = properties[key];
    }
    if (typeof properties?.token === 'string' && /^phc_[a-zA-Z0-9]+$/.test(properties.token)) result.token = properties.token;
    return result;
  }
  function clearOptional() {
    const choice = read();
    const optional = {test: key => (!choice.analytics && /^(ph_|_ga|_gid|_gat)/.test(key)) ||
      (!choice.marketing && /^_fb[pc]/.test(key)) ||
      (!choice.marketing && /^(ov_utm|signup_utm)/.test(key)) ||
      (!choice.analytics && !choice.marketing && /^ov_(did|sid|initial_ref|last_step_ts)$/.test(key))};
    for (const name of ['localStorage', 'sessionStorage']) {
      try {
        const storage = window[name];
        Object.keys(storage).filter(k => optional.test(k)).forEach(k => storage.removeItem(k));
      } catch (_) {}
    }
    try {
      for (const entry of document.cookie.split('; ')) {
        const key = entry.split('=')[0];
        if (!optional.test(key)) continue;
        for (const suffix of ['', domain, '; Domain=' + location.hostname]) {
          document.cookie = key + '=; Max-Age=0; Path=/' + suffix;
        }
      }
    } catch (_) {}
  }
  function apply() {
    const choice = read();
    const serialized = JSON.stringify(choice);
    if (serialized === last) return;
    last = serialized;
    window['ga-disable-G-NTT286BQ81'] = !choice.analytics;
    if (!choice.analytics) {
      window.posthog?.opt_out_capturing?.();
      window.posthog?.stopSessionRecording?.();
    } else window.posthog?.opt_in_capturing?.();
    if (!choice.analytics && Array.isArray(window.dataLayer)) window.dataLayer.length = 0;
    if (!choice.marketing && Array.isArray(window.fbq?.queue)) {
      window.fbq.queue = window.fbq.queue.filter(args => args[0] === 'init');
    }
    window.fbq?.('consent', choice.marketing ? 'grant' : 'revoke');
    if (!choice.analytics || !choice.marketing) clearOptional();
    for (const callback of listeners) callback(choice);
    document.querySelectorAll('script[data-consent]').forEach(original => {
      if (!choice[original.dataset.consent] || original.dataset.loaded) return;
      original.dataset.loaded = 'true';
      const script = document.createElement('script');
      if (original.dataset.src) script.src = original.dataset.src;
      else script.textContent = original.textContent;
      script.async = false;
      original.after(script);
    });
    document.querySelectorAll('iframe[data-consent-src]').forEach(frame => {
      if (!frame.previousElementSibling?.hasAttribute('data-embed-notice')) {
        const notice = document.createElement('p');
        notice.setAttribute('data-embed-notice', '');
        notice.append('This external video is disabled until you accept Analytics. ');
        const link = document.createElement('a');
        link.href = frame.dataset.consentSrc;
        link.textContent = 'Open the video on its provider website';
        link.rel = 'noreferrer';
        notice.append(link);
        frame.before(notice);
      }
      frame.previousElementSibling.hidden = choice.analytics;
      frame.hidden = !choice.analytics;
      if (choice.analytics) {
        if (frame.getAttribute('src') !== frame.dataset.consentSrc) frame.src = frame.dataset.consentSrc;
      } else frame.removeAttribute('src');
    });
    window.dispatchEvent(new CustomEvent('forfeit:consent', {detail: choice}));
  }
  function save(analytics, marketing) {
    memory = {version: VERSION, timestamp: Date.now(), analytics: !!analytics, marketing: !!marketing && !gpc()};
    try {
      document.cookie = KEY + '=' + encodeURIComponent(JSON.stringify(memory)) +
        '; Path=/; Max-Age=' + MAX_AGE / 1000 + '; SameSite=Lax' + domain +
        (location.protocol === 'https:' ? '; Secure' : '');
      memoryOnly = !document.cookie.split('; ').some(value => value.startsWith(KEY + '='));
    } catch (_) { memoryOnly = true; }
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (_) {}
    apply();
  }
  let dialog;
  let returnFocus;
  // Always non-modal so the page stays visible and usable: a corner card on
  // desktop, a compact bottom bar on phones. A full-screen modal on first
  // load scared visitors off before they saw the page.
  // The pointer checks matter: a page without a viewport meta reports a ~980px
  // width on a phone, which the width test alone would read as a desktop.
  const corner = () => window.matchMedia('(min-width:641px) and (hover:hover) and (pointer:fine)').matches;
  function open() {
    if (!dialog) return;
    returnFocus = document.activeElement;
    const choice = read();
    dialog.querySelector('#privacy-analytics').checked = choice.analytics;
    const marketing = dialog.querySelector('#privacy-marketing');
    marketing.checked = choice.marketing;
    marketing.disabled = gpc();
    dialog.querySelector('#privacy-gpc').hidden = !gpc();
    if (!dialog.open) {
      const inCorner = corner();
      dialog.classList.toggle('privacy-corner', inCorner);
      dialog.classList.toggle('privacy-bar', !inCorner);
      dialog.show();
    }
    // Opening focuses the first control on its own, and Safari paints that as
    // focus-visible, so a tap used to open the dialog with a blue box around
    // the Cookie notice link. Focus the dialog itself instead.
    dialog.focus();
  }
  window.ForfeitPrivacy = {read, allowed, save, open, sanitize, sanitizeAnalytics, subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }};
  function mount() {
    const style = document.createElement('style');
    style.textContent = `
      #privacy-dialog{box-sizing:border-box;width:min(560px,calc(100% - 32px));max-height:85dvh;overflow:auto;border:1px solid #666;border-radius:16px;padding:24px;background:var(--background,#fff);color:var(--foreground,#111);font:16px/1.5 Figtree,sans-serif}
      #privacy-dialog h2{font-size:24px;margin:0 0 12px;color:inherit}
      #privacy-dialog p,#privacy-dialog label{color:inherit;font-size:16px;line-height:1.5}
      #privacy-dialog label{display:block;margin:12px 0}
      #privacy-dialog input{appearance:auto;width:20px;height:20px;vertical-align:middle;margin-right:8px}
      #privacy-dialog button,#privacy-choices{min-height:44px;border:1px solid currentColor;border-radius:12px;padding:10px 14px;background:var(--background,#fff);color:var(--foreground,#111);font:inherit;cursor:pointer}
      #privacy-dialog .privacy-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
      #privacy-dialog a{color:inherit;text-decoration:underline}
      #privacy-choices{position:static;display:inline-block;margin:0 8px;border:0;padding:8px 4px;background:transparent;color:inherit;font:inherit;text-decoration:underline;vertical-align:baseline}
      #privacy-footer{text-align:center;padding:12px;color:inherit;font:12px Figtree,sans-serif}
      footer nav #privacy-choices{padding-left:0;padding-right:0;text-decoration:none}
      #privacy-dialog.privacy-corner{position:fixed;inset:16px 16px auto auto;margin:0;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 32px);z-index:2147483647}
      #privacy-dialog.privacy-bar{position:fixed;inset:auto 8px calc(8px + env(safe-area-inset-bottom)) 8px;margin:0;width:auto;max-width:none;max-height:calc(100dvh - 16px);padding:16px;z-index:2147483647}
      /*
       * The focus ring is for keyboard users. Opening the dialog focuses it,
       * and browsers can count that as focus-visible, so a tap opened the
       * dialog with a blue box on it. The ring is off by default and gated on
       * the last input being a key instead.
       */
      #privacy-dialog:focus,#privacy-dialog :focus-visible,#privacy-choices:focus-visible{outline:none}
      html[data-privacy-keyboard] #privacy-dialog :focus-visible,
      html[data-privacy-keyboard] #privacy-choices:focus-visible{outline:3px solid #0072c6;outline-offset:3px}
      @media(prefers-reduced-motion:reduce){#privacy-dialog *{scroll-behavior:auto}}
    `;
    // Which modality the person is using, so the focus ring above only shows
    // for a keyboard. Capture phase: a handler inside the dialog must not be
    // able to stop it, or the ring would stick to whatever it last saw.
    const keyboardKeys = new Set(['Tab', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    document.addEventListener('keydown', event => {
      if (keyboardKeys.has(event.key)) document.documentElement.setAttribute('data-privacy-keyboard', '');
    }, true);
    for (const type of ['pointerdown', 'touchstart', 'mousedown']) {
      document.addEventListener(type, () => document.documentElement.removeAttribute('data-privacy-keyboard'), true);
    }
    document.head.append(style);
    const existingStylesheet = document.querySelector('link[href="/privacy-ui.css"]');
    if (existingStylesheet) document.head.append(existingStylesheet);
    else {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/privacy-ui.css';
      document.head.append(stylesheet);
    }
    dialog = document.createElement('dialog');
    dialog.id = 'privacy-dialog';
    dialog.setAttribute('aria-labelledby', 'privacy-title');
    dialog.tabIndex = -1;
    dialog.addEventListener('keydown', event => {
      // A non-modal dialog gets no cancel event, so Escape is handled here.
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!read().timestamp) { const initial = read(); save(initial.analytics, initial.marketing); }
        dialog.close();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('a[href],button,input')]
        .filter(control => !control.disabled && control.getClientRects().length);
      if (!controls.length) return;
      const index = controls.indexOf(document.activeElement);
      event.preventDefault();
      controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
    });
    dialog.innerHTML = `<h2 id="privacy-title">Cookies</h2>
      <p>We use cookies to keep the site working, see how it is used and measure our ads. You can change this at any time. <a href="/cookies">Learn more</a></p>
      <div class="privacy-actions"><button type="button" data-choice="all">Accept All</button><button type="button" data-choice="none">Reject All</button><button type="button" data-choice="preferences">Choose Preferences</button></div>
      <div id="privacy-preferences" hidden><p>Analytics measures website use through PostHog and Google Analytics. Marketing measures advertising through Meta. You can turn either on or off here, or any time from Privacy Choices in the footer.</p>
      <p><a href="/cookies">Cookie notice</a>, <a href="/privacy">Privacy notice</a> and <a href="/accessibility">Accessibility Statement</a></p><label><input type="checkbox" checked disabled>Necessary (always enabled)</label><label><input id="privacy-analytics" type="checkbox">Analytics</label><label><input id="privacy-marketing" type="checkbox">Marketing</label><p id="privacy-gpc" hidden>Your browser's Global Privacy Control keeps marketing disabled.</p><button type="button" data-choice="save">Save Preferences</button></div>`;
    dialog.addEventListener('click', event => {
      const choice = event.target.dataset.choice;
      if (!choice) return;
      if (choice === 'preferences') {
        dialog.querySelector('#privacy-preferences').hidden = false;
        dialog.querySelector('#privacy-analytics').focus();
        return;
      }
      save(choice === 'all' || choice === 'save' && dialog.querySelector('#privacy-analytics').checked,
        choice === 'all' || choice === 'save' && dialog.querySelector('#privacy-marketing').checked);
      dialog.close();
    });
    dialog.addEventListener('close', () => returnFocus?.focus?.());
    document.body.append(dialog);
    const button = document.createElement('button');
    button.id = 'privacy-choices';
    button.type = 'button';
    button.textContent = 'Privacy Choices';
    button.addEventListener('click', () => { button.focus(); open(); });
    // Keep the control alongside legal links, including after client-side navigation.
    const placeButton = () => {
      const legalOrigin = ['localhost', '127.0.0.1'].includes(location.hostname)
        ? location.protocol + '//' + location.hostname + ':4312' : 'https://account.forfeit.app';
      for (const link of document.querySelectorAll('a[href]')) {
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin && !/(^|\.)(overlord|forfeit)\.app$/.test(url.hostname)) continue;
        const match = url.pathname.match(/^\/(?:webapp\/)?(privacy|cookies|refunds|accessibility)(?:\.html)?\/?$/);
        if (match) {
          const destination = legalOrigin + '/' + match[1];
          if (link.href !== destination) link.href = destination;
        }
      }
      if (document.querySelector('[data-privacy-menu-trigger]')) {
        button.remove();
        document.getElementById('privacy-footer')?.remove();
        return;
      }
      const legalLink = [...document.querySelectorAll('footer a[href*="privacy"], .ftr a[href*="privacy"], a[href*="privacy"]')]
        .find(link => !dialog.contains(link) && link.getClientRects().length);
      const footer = document.querySelector('footer:not(#privacy-footer), .ftr');
      const explicitTarget = [...document.querySelectorAll('[data-privacy-controls]')]
        .find(candidate => candidate.getClientRects().length);
      const target = explicitTarget || footer?.querySelector('a[href*="privacy"]')?.parentElement || footer || legalLink?.parentElement;
      if (target && target.id !== 'privacy-footer') {
        if (button.parentElement !== target) {
          target.append(button);
          const neighbour = target.querySelector('a') || target.parentElement?.querySelector('a');
          if (neighbour) {
            button.className = neighbour.className;
            const appearance = getComputedStyle(neighbour);
            for (const property of ['color', 'font', 'text-decoration']) {
              button.style.setProperty(property, appearance.getPropertyValue(property));
            }
          }
        }
        document.getElementById('privacy-footer')?.remove();
      } else if (!button.isConnected) {
        const footer = document.createElement('footer');
        footer.id = 'privacy-footer';
        footer.append(button);
        document.body.append(footer);
      }
    };
    placeButton();
    new MutationObserver(placeButton).observe(document.body, {childList: true, subtree: true});
    apply();
    if (!read().timestamp) open();
  }
  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    try { memory = JSON.parse(event.newValue); } catch (_) { memory = null; }
    apply();
  });
  window.addEventListener('focus', apply);
  setInterval(apply, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
