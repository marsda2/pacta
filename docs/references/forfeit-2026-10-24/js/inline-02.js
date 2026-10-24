
      (function(){
        try {
          var p = (location && location.pathname) || '';
          if (p === '/signup' || p === '/signup/' || p.indexOf('/signup/') === 0 || p.indexOf('/signup') === 0) {
            document.documentElement.classList.add('is-signup-page');
          }
        } catch(e){}
      })();
    