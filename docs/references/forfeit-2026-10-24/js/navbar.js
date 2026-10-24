document.addEventListener('DOMContentLoaded', function() {
    // Get the navbar container
    const navbarContainer = document.getElementById('navbar-container');

    // Fetch the navbar content (use absolute path)
    fetch('/navbar.html')
      .then(response => response.text())
      .then(data => {
        // Insert the navbar HTML
        navbarContainer.innerHTML = data;

        // Set active page (updated for subdirectories)
        const currentPath = window.location.pathname;
        let currentPage;

        if (currentPath === '/' || currentPath === '/index.html') {
          currentPage = 'index.html';
        } else if (currentPath.includes('/community-goals')) {
          currentPage = 'community-goals.html';
        } else {
          currentPage = currentPath.split('/').pop() || 'index.html';
        }

        const currentLink = document.querySelector(`[data-page="${currentPage}"]`);
        if (currentLink) currentLink.classList.add('active');

        // Hide title and subtitle on product page
        if (currentPage === 'product.html') {
          const navbarTitle = document.querySelector('.navbar-title');
          const navbarSubtitle = document.querySelector('.navbar-subtitle');
          if (navbarTitle) navbarTitle.style.display = 'none';
          if (navbarSubtitle) navbarSubtitle.style.display = 'none';
        }

        // Initialize modal functionality
        initModal();
        initDownloadModal();
      })
      .catch(error => console.error('Error loading navbar:', error));
  });

  // Download Modal functionality
  function initDownloadModal() {
    const modal = document.getElementById('download-modal');
    const downloadTrigger = document.getElementById('download-trigger');
    const closeButton = document.querySelector('.download-modal-close');

    if (!modal || !downloadTrigger || !closeButton) return;

    // Open modal
    downloadTrigger.addEventListener('click', function(e) {
      e.preventDefault();
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    // Close modal with button
    closeButton.addEventListener('click', function() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // Modal functionality (for legacy join-modal if it exists)
  function initModal() {
    const modal = document.getElementById('join-modal');
    const modalTrigger = document.querySelector('.modal-trigger');
    const closeButton = document.querySelector('.modal-close');

    if (!modal || !modalTrigger || !closeButton) return;

    // Open modal
    modalTrigger.addEventListener('click', function(e) {
      e.preventDefault();
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    // Close modal with button
    closeButton.addEventListener('click', function() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }