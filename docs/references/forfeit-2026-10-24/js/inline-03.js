
      (function(){
        try {
          var c = navigator.connection;
          if (c && (c.saveData || /(^|-)2g$/i.test(c.effectiveType || ''))) return;
          var run = function(){
            fetch('/signup/onboarding', { headers: { 'Accept': 'text/html' }, credentials: 'omit' })
              .then(function(r){ return r.ok ? r.text() : ''; })
              .then(function(html){
                if (!html) return;
                var seen = {};
                var re = /\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g;
                var m;
                while ((m = re.exec(html)) !== null) {
                  var href = m[0];
                  if (seen[href]) continue;
                  seen[href] = 1;
                  var link = document.createElement('link');
                  link.rel = 'prefetch';
                  link.href = href;
                  if (href.endsWith('.css')) link.as = 'style';
                  else { link.as = 'script'; link.crossOrigin = 'anonymous'; }
                  document.head.appendChild(link);
                }
              })
              .catch(function(){});
          };
          if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
          else setTimeout(run, 200);
        } catch(e) {}
      })();
    