
    (function(){
      var TRACK_URL = 'https://us-central1-forfeit-58b5d.cloudfunctions.net/trackEvent';
      var DID_KEY = 'ov_did', SID_KEY = 'ov_sid';
      function uuid(){
        try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch(e){}
        return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c){
          var r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8); return v.toString(16);
        });
      }
      function gid(key, store){
        try { var v = store.getItem(key); if(!v){ v=uuid(); store.setItem(key,v); } return v; }
        catch(e){ return uuid(); }
      }
      function utm(){
        if (!window.ForfeitPrivacy?.allowed('marketing')) return {};
        try {
          var sp = new URLSearchParams(location.search);
          var values = {
            utm_source: sp.get('utm_source')||undefined,
            utm_medium: sp.get('utm_medium')||undefined,
            utm_campaign: sp.get('utm_campaign')||undefined,
            utm_content: sp.get('utm_content')||undefined,
            utm_term: sp.get('utm_term')||undefined,
            fbclid: sp.get('fbclid')||undefined,
          };
          try { sessionStorage.setItem('ov_utm_v1', JSON.stringify(values)); } catch(eStore) {}
          return values;
        } catch(e){ return {}; }
      }
      window.sendOverlordTrack = function(event, properties, options){
        if (!window.ForfeitPrivacy?.allowed('analytics') && !window.ForfeitPrivacy?.allowed('marketing')) return;
        try {
          // Time since the user's last funnel event in this session. Mirrors
          // the React side so funnel events carry the "+3s" gap between landing_view and
          // get_started_clicked. Shared sessionStorage key on overlord.app
          // means the React app picks up where the static landing left off.
          var props = window.ForfeitPrivacy.sanitize(properties);
          try {
            var prev = parseInt(sessionStorage.getItem('ov_last_step_ts') || '', 10);
            var now = Date.now();
            sessionStorage.setItem('ov_last_step_ts', String(now));
            if (isFinite(prev) && prev > 0) props.time_since_last_step_ms = now - prev;
          } catch(eTime) {}

          var body = {
            event: event,
            consent: window.ForfeitPrivacy.read(),
            properties: props,
            distinct_id: gid(DID_KEY, localStorage),
            session_id: gid(SID_KEY, sessionStorage),
            url: location.origin + location.pathname,
            referrer: '',
            initial_referrer: '',
            screen: { width: screen.width, height: screen.height },
            viewport: { width: innerWidth, height: innerHeight },
            language: navigator.language,
            timezone: (function(){ try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e){ return undefined; } })(),
            timestamp: Date.now()
          };
          utm();
          var pageTitle = document.title;
          if (pageTitle) body.page_title = pageTitle;
          // text/plain body is a CORS-simple request: skips the OPTIONS
          // preflight that was silently aborting on Instagram in-app browser
          // (preflight returned 204 then the POST never followed because the
          // page navigated away). Server parses both text/plain string and
          // application/json object.
          var payload = JSON.stringify(body);
          var unloading = !!(options && options.unloading);
          if (unloading) {
            // About to navigate: sendBeacon is built to survive unload.
            var sent = false;
            try {
              if (navigator.sendBeacon) {
                var blob = new Blob([payload], { type: 'text/plain' });
                sent = navigator.sendBeacon(TRACK_URL, blob);
              }
            } catch(eb) { sent = false; }
            if (!sent) {
              try {
                fetch(TRACK_URL, { method:'POST', body: payload, headers: {'Content-Type':'text/plain'}, keepalive: true });
              } catch(ef) {}
            }
          } else {
            // No imminent navigation: plain fetch has plenty of time and
            // doesn't suffer from sendBeacon's preflight quirks.
            try {
              fetch(TRACK_URL, { method:'POST', body: payload, headers: {'Content-Type':'text/plain'} });
            } catch(ef) {}
          }
        } catch(e){}
      };
    })();
    