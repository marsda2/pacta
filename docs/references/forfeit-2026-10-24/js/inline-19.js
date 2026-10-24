
    (function() {
      var section = document.querySelector('.uc-section');
      if (!section) return;
      var rows = section.querySelectorAll('.uc-row');
      function setOpen(targetId) {
        rows.forEach(function(r) {
          var id = r.getAttribute('data-uc-id');
          var open = id === targetId;
          r.classList.toggle('open', open);
          var chev = r.querySelector('.uc-chev');
          if (chev) chev.textContent = open ? '\u2013' : '+';
        });
      }
      var first = rows[0];
      if (first) setOpen(first.getAttribute('data-uc-id'));
      rows.forEach(function(r) {
        var head = r.querySelector('.uc-head');
        if (!head) return;
        head.addEventListener('click', function() {
          var isOpen = r.classList.contains('open');
          setOpen(isOpen ? null : r.getAttribute('data-uc-id'));
        });
      });
    })();
  