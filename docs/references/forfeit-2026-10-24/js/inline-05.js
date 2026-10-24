
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags getPersonProperties getGroups setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getSessionId getSessionReplayUrl alias set set_once set_config register register_once register_for_session unregister unregister_for_session opt_out_capturing has_opted_out_capturing opt_in_capturing reset_groups loaded sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_session_recording opt_out_session_recording session_recording_started clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init('phc_5S35jm9GeH7m6ebkQD6VaVEAtHpiAgaSjnHJ0QJ9zQf', {
        // Same-origin reverse proxy via this site's server so ad
        // blockers + IG/FB in-app browsers can't drop the SDK or recording
        // uploads. ui_host stays on real PostHog so dashboard links work.
        api_host: '/ingest',
        ui_host: 'https://us.posthog.com',
        person_profiles: 'never',
        autocapture: false,
        disable_session_recording: true,
        capture_exceptions: false,
        opt_in_site_apps: false,
        before_send: function(event) { event.properties = window.ForfeitPrivacy.sanitizeAnalytics(event.properties); return window.ForfeitPrivacy.allowed('analytics') ? event : null; },
        capture_pageview: true,
        capture_pageleave: true,
        cross_subdomain_cookie: true,
        session_recording: { maskAllInputs: true, maskTextSelector: "*", blockSelector: "form, video, canvas, iframe, [data-private]", recordCanvas: false, recordCrossOriginIframes: false, maskInputOptions: { password: true } },
        loaded: function(ph){
          ph.stopSessionRecording();
          if (!window.ForfeitPrivacy.allowed('analytics')) ph.opt_out_capturing();
        },
      });
    