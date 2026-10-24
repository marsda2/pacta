
    (function(){
      try {
        var p = location.pathname || '';
        var isSignup = p === '/signup' || p === '/signup/' || p.indexOf('/signup') === 0;
        // Relative path keeps the user on the current host: localhost:3500
        // for local dev, overlord.app for prod. The React signup flow is now
        // served from the same Express server as this static landing.
        var SIGNUP_DEST = '/signup/onboarding';
        function buildSignupUrl(){
          return SIGNUP_DEST;
        }
        if (isSignup) {
          // Tag <body> so /signup-only CSS can scope itself without leaking to /.
          try { document.body.classList.add('is-signup-page'); } catch(eBC){}
          // Inject scoped /signup styles + extra hero elements (example chip, single CTA).
          // Wrapped in a one-time guard so HMR-style re-runs do not duplicate the nodes.
          if (!document.getElementById('signup-extras-style')) {
            var sStyle = document.createElement('style');
            sStyle.id = 'signup-extras-style';
            sStyle.textContent = ''
              + '.is-signup-page .left-content,'
              + '.is-signup-page .left-content * { text-align: center !important; }'
              + '.is-signup-page .left-content { align-items: center !important; }'
              + '.is-signup-page .crt-text-container { align-items: center !important; text-align: center !important; }'
              + '.is-signup-page .hero-h1 { text-align: center !important; }'
              + '.is-signup-page .hero-sub { text-align: center !important; }'
              + '.is-signup-page .hero-pill { align-self: center !important; margin-left: auto !important; margin-right: auto !important; margin-top: 32px !important; }'
              + '.is-signup-page .main-content-wrapper { padding-top: 24px !important; }'
              + '@media (min-width: 768px) { .is-signup-page .hero-pill { margin-top: 48px !important; } }'
              + '.is-signup-page .hero-stats-line { justify-content: center !important; }'
              + '.is-signup-page #hero-default-ctas { display: none !important; }'
              + '.is-signup-page .signup-example-chip {'
              +   ' display: flex; align-items: center; gap: 14px; text-align: left !important;'
              +   ' padding: 14px; margin: 4px auto 0; max-width: 480px; width: 100%;'
              +   ' background: #fff; border: 1px solid #e6e6e8; border-radius: 18px;'
              +   ' box-shadow: 0 1px 0 #efeeea; box-sizing: border-box;'
              + ' }'
              + '.is-signup-page .signup-example-chip * { text-align: left !important; }'
              + '.is-signup-page .signup-example-chip-icon {'
              +   ' width: 44px; height: 44px; border-radius: 12px;'
              +   ' background: #2cd957;'
              +   ' display: flex; align-items: center; justify-content: center;'
              +   ' flex: 0 0 44px;'
              + ' }'
              + '.is-signup-page .signup-example-chip-text {'
              +   ' font-size: 14.5px; color: #0b0b0c; font-weight: 400; line-height: 1.35;'
              + ' }'
              + '.is-signup-page .signup-trial-cta {'
              +   ' display: flex; flex-direction: column; gap: 8px;'
              +   ' margin: 8px auto 0; max-width: 480px; width: 100%;'
              + ' }'
              + '.is-signup-page .signup-trial-btn {'
              +   ' width: 100%; background: #0b0b0c; color: #fff;'
              +   ' border: 0; padding: 18px 0; border-radius: 16px;'
              +   ' font-family: inherit; font-size: 16px; font-weight: 700;'
              +   ' cursor: pointer; letter-spacing: 0.1px;'
              + ' }'
              + '.is-signup-page .signup-trial-btn:hover { opacity: 0.92; }'
              + '.is-signup-page .signup-trial-price {'
              +   ' text-align: center; font-size: 12.5px; color: #626269;'
              + ' }'
              + '.is-signup-page .signup-reviews-pill {'
              +   ' display: inline-flex !important; align-items: center !important; gap: 8px !important;'
              + ' }'
              + '.is-signup-page .signup-reviews-pill .hero-pill-dot { display: none !important; }'
              + '.is-signup-page .signup-reviews-stars {'
              +   ' color: #f5a623 !important; letter-spacing: 1.5px !important;'
              +   ' font-size: 12px !important; line-height: 1 !important;'
              + ' }'
              + '.is-signup-page .signup-reviews-text {'
              +   ' font-size: 13px !important; color: #5a5a5f !important; font-weight: 500 !important;'
              + ' }'
              + '.is-signup-page .signup-reviews-text strong { color: #0b0b0c !important; font-weight: 700 !important; }';
            document.head.appendChild(sStyle);
          }
          // Swap the headline on /signup only.
          try {
            var h1Swap = document.querySelector('.hero-h1');
            if (h1Swap) {
              h1Swap.textContent = 'AI that blocks your apps and calls your mom.';
            }
          } catch(eH1){}
          // Swap the long subhead for the tighter /signup voice.
          try {
            var subSwap = document.querySelector('.hero-sub');
            if (subSwap) {
              subSwap.textContent = "Overlord is an AI that actually holds you accountable - with screen blocking, real consequences, and texts to the people you'd rather not disappoint.";
            }
          } catch(eSub){}
          // Replace the "Live · setting up" pill with the current App Store rating.
          try {
            var livePill = document.getElementById('heroLivePill');
            if (livePill) {
              livePill.innerHTML = ''
                + '<span class="signup-reviews-stars" aria-hidden="true">★★★★★</span>'
                + '<span class="signup-reviews-text"><strong>4.8</strong> from 345 ratings</span>';
              livePill.classList.add('signup-reviews-pill');
              livePill.removeAttribute('aria-live');
            }
          } catch(ePill){}
          // Inject the example chip directly after the hero subhead.
          if (!document.querySelector('.signup-example-chip')) {
            var heroSub = document.querySelector('.hero-sub');
            if (heroSub && heroSub.parentNode) {
              var chip = document.createElement('div');
              chip.className = 'signup-example-chip';
              chip.innerHTML = ''
                + '<div class="signup-example-chip-icon" aria-hidden="true">'
                +   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none">'
                +     '<path d="M4 5h16v11H8l-4 4V5z" stroke="#fff" stroke-width="2" stroke-linejoin="round" />'
                +   '</svg>'
                + '</div>'
                + '<span class="signup-example-chip-text">"Text my gym buddy if I skip leg day"</span>';
              heroSub.parentNode.insertBefore(chip, heroSub.nextSibling);
              // Cycle the chip through canonical example goals every 3s.
              // Animation matches chat.overlord.app's ExampleMessageTicker:
              // text fades + slides down, icon fades + scales down, both
              // ease back to neutral when the new content swaps in.
              var SIGNUP_EXAMPLES = [
                '"Text my gym buddy if I skip leg day"',
                '"Charge me $10 if I sleep past 6:30 AM"',
                '"Block Instagram after 10pm on weeknights"',
                '"Call me if I leave home before stretching"',
                '"Lock my Mac after 4 hours of focused work"',
                '"Text my mom if I don’t hit 10k steps"',
                '"Block YouTube during my 9-11 work block"',
                '"Charge $25 if I miss my Tuesday run"'
              ];
              var chipTextEl = chip.querySelector('.signup-example-chip-text');
              var chipIconEl = chip.querySelector('.signup-example-chip-icon');
              var chipIdx = 0;
              if (chipTextEl && chipIconEl) {
                chipTextEl.style.transition = 'opacity 300ms ease, transform 300ms ease';
                chipIconEl.style.transition = 'opacity 300ms ease, transform 300ms ease';
                chipTextEl.style.transform = 'translateY(0)';
                chipIconEl.style.transform = 'scale(1)';
                setInterval(function(){
                  chipIdx = (chipIdx + 1) % SIGNUP_EXAMPLES.length;
                  chipTextEl.style.opacity = '0';
                  chipTextEl.style.transform = 'translateY(8px)';
                  chipIconEl.style.opacity = '0';
                  chipIconEl.style.transform = 'scale(0.8)';
                  setTimeout(function(){
                    chipTextEl.textContent = SIGNUP_EXAMPLES[chipIdx];
                    chipTextEl.style.opacity = '1';
                    chipTextEl.style.transform = 'translateY(0)';
                    chipIconEl.style.opacity = '1';
                    chipIconEl.style.transform = 'scale(1)';
                  }, 300);
                }, 5500);
              }
            }
          }
          // Inject the single "Try Free for 7 Days" CTA replacing the Chat + Download grid.
          if (!document.querySelector('.signup-trial-cta')) {
            var heroCtasHost = document.getElementById('hero-default-ctas');
            if (heroCtasHost && heroCtasHost.parentNode) {
              var ctaWrap = document.createElement('div');
              ctaWrap.className = 'signup-trial-cta';
              ctaWrap.innerHTML = ''
                + '<button type="button" id="signup-trial-cta-btn" class="signup-trial-btn">Try Free for 7 Days</button>'
                + '<div class="signup-trial-price">Then $10.99/month. Cancel anytime.</div>';
              heroCtasHost.parentNode.insertBefore(ctaWrap, heroCtasHost.nextSibling);
              var trialBtn = document.getElementById('signup-trial-cta-btn');
              if (trialBtn) {
                trialBtn.addEventListener('click', function(e){
                  e.preventDefault();
                  e.stopPropagation();
                  try { sendOverlordTrack('OVWeb: signup_funnel', { step: 'get_started_clicked', clicked_button: 'trial-cta' }, { unloading: true }); } catch(e2){}
                  try { if (window.ForfeitPrivacy.allowed('marketing') && typeof window.fbq === 'function') window.fbq('trackCustom', 'GetStartedClick', { source: 'landing', clicked_button: 'trial-cta' }); } catch(eM){}
                  try { window.location.href = buildSignupUrl(); }
                  catch(e3) { window.location.href = SIGNUP_DEST; }
                }, true);
              }
            }
          }
          // Hide the Example goals + See docs links from the legacy CTA grid (defensive -
          // the grid itself is now display:none via the scoped style, but keep these as
          // belt-and-braces for caches that may have re-rendered without the new CSS).
          ['hero-cta-example-goals', 'hero-cta-see-docs'].forEach(function(id){
            var el = document.getElementById(id);
            if (el) el.style.setProperty('display', 'none', 'important');
          });
          // Redirect hero Chat + Download buttons to the signup flow.
          ['hero-cta-chat', 'hero-download-trigger'].forEach(function(id){
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('click', function(e){
              e.preventDefault();
              e.stopPropagation();
              try { sendOverlordTrack('OVWeb: signup_funnel', { step: 'get_started_clicked', clicked_button: id }, { unloading: true }); } catch(e2){}
              try { if (window.ForfeitPrivacy.allowed('marketing') && typeof window.fbq === 'function') window.fbq('trackCustom', 'GetStartedClick', { source: 'landing', clicked_button: id }); } catch(eM){}
              try { window.location.href = buildSignupUrl(); }
              catch(e3) { window.location.href = SIGNUP_DEST; }
            }, true);
            if (el.tagName === 'A') el.setAttribute('href', SIGNUP_DEST);
          });
          // Make the existing floating .hero-chip elements clickable - they become the CTAs.
          // Wire each to navigate to the signup form, fire a tracking event with chip identity,
          // and append distinct_id for cross-domain attribution.
          var heroChips = document.querySelectorAll('.hero-chip');
          heroChips.forEach(function(chip){
            chip.removeAttribute('aria-hidden');
            chip.setAttribute('role', 'link');
            chip.setAttribute('tabindex', '0');
            chip.style.setProperty('cursor', 'pointer');
            // Derive a stable identifier from the existing class (e.g. hero-chip-gps -> gps)
            var actionId = 'chip';
            for (var i = 0; i < chip.classList.length; i++) {
              var c = chip.classList[i];
              if (c !== 'hero-chip' && c.indexOf('hero-chip-') === 0) {
                actionId = c.replace('hero-chip-', '');
                break;
              }
            }
            var go = function(){
              try { sendOverlordTrack('OVWeb: signup_funnel', { step: 'get_started_clicked', clicked_button: 'chip-' + actionId }, { unloading: true }); } catch(e2){}
              try { if (window.ForfeitPrivacy.allowed('marketing') && typeof window.fbq === 'function') window.fbq('trackCustom', 'GetStartedClick', { source: 'landing', clicked_button: 'chip-' + actionId }); } catch(eM){}
              try { window.location.href = buildSignupUrl(); }
              catch(e3) { window.location.href = SIGNUP_DEST; }
            };
            chip.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); go(); }, true);
            chip.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
          });
          // Redirect topbar CTAs to the signup form. topbar-cta-signup is the
          // single consolidated /signup-only CTA; the other two are hidden by
          // CSS on /signup but kept in the bindings as belt-and-braces for any
          // edge case where the CSS doesn't load.
          var topbarTargets = ['topbar-cta-signup', 'topbar-cta-chat', 'topbar-cta-download'];
          topbarTargets.forEach(function(id){
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('click', function(e){
              e.preventDefault();
              e.stopPropagation();
              try { sendOverlordTrack('OVWeb: signup_funnel', { step: 'get_started_clicked', clicked_button: id }, { unloading: true }); } catch(e2){}
              try { if (window.ForfeitPrivacy.allowed('marketing') && typeof window.fbq === 'function') window.fbq('trackCustom', 'GetStartedClick', { source: 'landing', clicked_button: id }); } catch(eM){}
              try { window.location.href = buildSignupUrl(); }
              catch(e3) { window.location.href = SIGNUP_DEST; }
            }, true);
            if (el.tagName === 'A') el.setAttribute('href', SIGNUP_DEST);
          });
          // Hide final-CTA Chat/Download rows.
          var finalCtaBtnRows = document.querySelectorAll('.fcta-iter05-btnrow, .final-cta-section .fcta-iter05-buttons');
          finalCtaBtnRows.forEach(function(el){ el.style.setProperty('display','none','important'); });
          try { sendOverlordTrack('OVWeb: signup_funnel', { step: 'landing_view' }); } catch(e1){}
        }
      } catch(e) { console.warn('signup variant switch failed', e); }
    })();
    