
        document.addEventListener('DOMContentLoaded', function() {
            // Aspects section functionality
            const aspectItems = document.querySelectorAll('.aspect-item');
            const messageContainers = document.querySelectorAll('.message-container');
            
            aspectItems.forEach(item => {
                item.addEventListener('click', function() {
                    // Remove active class from all items
                    aspectItems.forEach(i => i.classList.remove('active'));
                    
                    // Add active class to clicked item
                    this.classList.add('active');
                    
                    // Hide all message containers
                    messageContainers.forEach(container => {
                        container.classList.add('hidden');
                    });
                    
                    // Show the relevant message container
                    const aspect = this.getAttribute('data-aspect');
                    document.getElementById(`${aspect}-messages`).classList.remove('hidden');
                });
            });

            // Integrations section functionality
            const integrationLogos = document.querySelectorAll('.integration-logo');
            
            integrationLogos.forEach(logo => {
                logo.addEventListener('click', function() {
                    // Remove active class from all logos
                    integrationLogos.forEach(l => l.classList.remove('active'));
                    
                    // Add active class to clicked logo
                    this.classList.add('active');
                    
                    // Hide all message containers in the integrations section
                    document.querySelectorAll('.integrations-section .iphone-screen .message-container').forEach(container => {
                        container.classList.add('hidden');
                    });
                    
                    // Show the relevant message container
                    const integration = this.getAttribute('data-integration');
                    const messageContainer = document.getElementById(`${integration}-messages`);
                    
                    if (messageContainer) {
                        messageContainer.classList.remove('hidden');
                    }
                });
            });

            // Actions section functionality
            const actionButtons = document.querySelectorAll('.action-button');
            
            actionButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remove active class from all buttons
                    actionButtons.forEach(b => b.classList.remove('active'));
                    
                    // Add active class to clicked button
                    this.classList.add('active');
                    
                    // Hide all message containers in the actions section
                    document.querySelectorAll('.actions-section .iphone-screen .message-container').forEach(container => {
                        container.classList.add('hidden');
                    });
                    
                    // Show the relevant message container
                    const action = this.getAttribute('data-action');
                    const messageContainer = document.getElementById(`${action}-actions`);
                    
                    if (messageContainer) {
                        messageContainer.classList.remove('hidden');
                    } else {
                        console.log(`No message container found for action: ${action}`);
                    }
                });
            });

            // Info Cards functionality (replaces old Goals section functionality)
            const infoCards = document.querySelectorAll('.info-card'); 
            const mainViewMessageContainers = document.querySelectorAll('.right-content .iphone-screen .message-container'); 

            infoCards.forEach(card => {
                card.addEventListener('click', function() {
                    // Remove active class from all info cards
                    infoCards.forEach(c => c.classList.remove('active'));

                    // Add active class to clicked card
                    this.classList.add('active');

                    // Hide all message containers in the main iPhone view
                    mainViewMessageContainers.forEach(container => {
                        container.classList.add('hidden');
                    });

                    // Show the relevant message container for the clicked card
                    const infoGoal = this.getAttribute('data-goal'); // e.g., "story-info"
                    // The ID is expected to be "story-info-messages"
                    const messageContainerId = `${infoGoal}-messages`; 
                    const messageContainer = document.getElementById(messageContainerId);

                    if (messageContainer) {
                        messageContainer.classList.remove('hidden');
                    } else {
                        console.log(`No message container found for info card: ${infoGoal} (ID: ${messageContainerId})`);
                    }
                });
            });
            
            // Set initial state for info cards on page load
            // This ensures the "Story" card's content is visible if it's marked active in HTML
            // No specific JS needed here if HTML classes are set correctly for default.
            // The click handler will manage subsequent interactions.

            // Carousel navigation for mobile info cards
            const carouselContainer = document.querySelector('.info-cards');
            const carouselPrevBtn = document.getElementById('carousel-prev');
            const carouselNextBtn = document.getElementById('carousel-next');
            let currentCardIndex = 0;

            function updateCarousel() {
                if (!carouselContainer) return;

                const card = carouselContainer.querySelector('.info-card');
                const cardWidth = card.offsetWidth;

                // Get gap from computed style
                const computedStyle = window.getComputedStyle(carouselContainer);
                const gap = parseInt(computedStyle.gap) || 100;
                const scrollDistance = cardWidth + gap;

                carouselContainer.scrollLeft = currentCardIndex * scrollDistance;

                // Update button states
                if (carouselPrevBtn) {
                    carouselPrevBtn.disabled = currentCardIndex === 0;
                }
                if (carouselNextBtn) {
                    carouselNextBtn.disabled = currentCardIndex === infoCards.length - 1;
                }
            }

            if (carouselPrevBtn) {
                carouselPrevBtn.addEventListener('click', () => {
                    if (currentCardIndex > 0) {
                        currentCardIndex--;
                        updateCarousel();
                        infoCards[currentCardIndex].click();
                    }
                });
            }

            if (carouselNextBtn) {
                carouselNextBtn.addEventListener('click', () => {
                    if (currentCardIndex < infoCards.length - 1) {
                        currentCardIndex++;
                        updateCarousel();
                        infoCards[currentCardIndex].click();
                    }
                });
            }

            // Initialize carousel
            updateCarousel();


            // FAQ Section Functionality
            const faqItems = document.querySelectorAll('.faq-item');

            faqItems.forEach(item => {
                const questionButton = item.querySelector('.faq-question');
                const answerDiv = item.querySelector('.faq-answer');

                questionButton.addEventListener('click', () => {
                    // Check if the item is already active
                    const isActive = item.classList.contains('active');

                    // Optional: Close all other items if you only want one open at a time
                    // faqItems.forEach(otherItem => {
                    //     if (otherItem !== item) {
                    //         otherItem.classList.remove('active');
                    //         otherItem.querySelector('.faq-answer').style.maxHeight = null; 
                    //     }
                    // });

                    // Toggle the active class on the clicked item
                    item.classList.toggle('active');

                    // Toggle the max-height for the answer
                    if (item.classList.contains('active')) {
                        // Set max-height to the scroll height to smoothly reveal content
                        answerDiv.style.maxHeight = answerDiv.scrollHeight + "px";
                    } else {
                        // Collapse the answer
                        answerDiv.style.maxHeight = null; 
                    }
                });
            });

            // Other Features section functionality
            const otherFeatureButtons = document.querySelectorAll('.other-feature-button');

            otherFeatureButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remove active class from all buttons in this section
                    otherFeatureButtons.forEach(b => b.classList.remove('active'));

                    // Add active class to clicked button
                    this.classList.add('active');

                    // Hide all message containers in this section's iPhone screen
                    document.querySelectorAll('.other-features-section .iphone-screen .message-container').forEach(container => {
                        container.classList.add('hidden');
                    });

                    // Show the relevant message container
                    const feature = this.getAttribute('data-feature');
                    const messageContainerId = `${feature}-messages`; // Construct the ID
                    const messageContainer = document.getElementById(messageContainerId);

                    if (messageContainer) {
                        messageContainer.classList.remove('hidden');
                    } else {
                        console.log(`No message container found for feature: ${feature} (ID: ${messageContainerId})`);
                    }
                });
            });

            // NEW: Scroll-based activation for Other Features using Sticky Parent
            // Target the new intermediary parent for scroll calculations
            const otherFeaturesStickyParent = document.querySelector('.sticky-scroll-parent');
            // Selectors for items inside remain the same, assuming structure is maintained
            const otherFeatureListItems = otherFeaturesStickyParent?.querySelectorAll('.feature-list-item');
            const otherFeatureMessageContainers = otherFeaturesStickyParent?.querySelectorAll('.other-features-section .iphone-screen .message-container');
            const otherFeaturesFakeScrollThumb = otherFeaturesStickyParent?.querySelector('.fake-scrollbar-thumb');

            // Click-to-cycle handler for the new card grid (mirrors scroll behaviour).
            // Scroll-driven update will reassert state when user actually scrolls;
            // this just gives the cards click affordance.
            if (otherFeatureListItems && otherFeatureListItems.length > 0 && otherFeatureMessageContainers) {
                otherFeatureListItems.forEach(item => {
                    item.addEventListener('click', function () {
                        otherFeatureListItems.forEach(i => i.classList.remove('is-active'));
                        this.classList.add('is-active');
                        const feature = this.getAttribute('data-feature');
                        otherFeatureMessageContainers.forEach(container => {
                            if (container.id === `${feature}-messages`) {
                                container.classList.remove('hidden');
                            } else {
                                container.classList.add('hidden');
                            }
                        });
                    });
                });
            }

            // Only run if we found the necessary elements
            if (otherFeaturesStickyParent && otherFeatureListItems && otherFeatureListItems.length > 0 && otherFeatureMessageContainers && otherFeaturesFakeScrollThumb) {

                // This calculation automatically updates with the new item count
                const totalItems = otherFeatureListItems.length;
                // Define how much scroll distance equates to one step (e.g., 70% of viewport height)
                // Keep stepVh the same unless scrolling feels wrong
                const stepVh = 0.7;
                const featurePanel = otherFeaturesStickyParent.querySelector('.other-features-section');
                // Scale the whole mockup, preserving its internal layout on
                // short screens. The observed panel uses stable viewport units.
                const sizeFeaturePhone = () => {
                    const scale = Math.min(1, Math.max(0.5, (featurePanel.clientHeight - 290) / 602));
                    featurePanel.style.setProperty('--feature-phone-scale', scale);
                };
                new ResizeObserver(sizeFeaturePhone).observe(featurePanel);
                sizeFeaturePhone();
                let currentActiveIndex = -1; // Initialize to -1 to force first update

                // Function to update active elements based on scroll
                const updateOtherFeatures = () => {
                    // Calculation now uses otherFeaturesStickyParent
                    const rect = otherFeaturesStickyParent.getBoundingClientRect();
                    const scrolled = -rect.top;
                    const stepPx = featurePanel.clientHeight * stepVh;

                    // Calculate the current index based on scroll distance
                    // Ensure index stays within the valid range [0, totalItems - 1]
                    // We add a small buffer (stepPx * 0.1) before starting step 0
                    // This calculation remains valid
                    let index = Math.floor(Math.max(0, scrolled - (stepPx * 0.1)) / stepPx);
                    index = Math.max(0, Math.min(totalItems - 1, index));
                    // A small dead band prevents direction changes near a step
                    // boundary from rapidly flipping between two examples.
                    if (currentActiveIndex >= 0 && Math.abs(index - currentActiveIndex) === 1) {
                        const boundary = (Math.max(index, currentActiveIndex) + 0.1) * stepPx;
                        if (Math.abs(scrolled - boundary) < 24) index = currentActiveIndex;
                    }

                    // Only update DOM if the index has actually changed
                    if (index !== currentActiveIndex) {
                        // Update List Item Classes
                        otherFeatureListItems.forEach((item, i) => {
                             // Use 'is-active' class now
                            item.classList.toggle('is-active', i === index);
                        });

                        // Update Message Container Visibility
                        otherFeatureMessageContainers.forEach(container => {
                             // Get the feature ID this container corresponds to
                            const containerId = container.id;
                             // Get the feature ID the *active* list item corresponds to
                            const activeFeatureId = otherFeatureListItems[index]?.getAttribute('data-feature');

                            if (activeFeatureId && containerId === `${activeFeatureId}-messages`) {
                                container.classList.remove('hidden');
                            } else {
                                container.classList.add('hidden');
                            }
                        });

                        // Update Fake Scrollbar Position
                        // This calculation automatically adapts to the new totalItems
                        const scrollPercentage = index / (totalItems - 1 || 1); // Avoid division by zero if only 1 item
                        const thumbHeightPercentage = 100 / totalItems;
                         // Calculate max top position (100% - thumb height)
                        const maxTopPercentage = 100 - thumbHeightPercentage;
                        otherFeaturesFakeScrollThumb.style.top = `${scrollPercentage * maxTopPercentage}%`;
                        otherFeaturesFakeScrollThumb.style.height = `${thumbHeightPercentage}%`;

                        // Update the tracked index
                        currentActiveIndex = index;
                    }
                };

                // Add scroll listener
                window.addEventListener('scroll', updateOtherFeatures, { passive: true });

                // Run once on load to set initial state
                updateOtherFeatures();
            }

            // iOS Control section functionality - Button Grid
            const iosControlButtons = document.querySelectorAll('.ios-control-section .ios-control-button');
            const iosAllMessageContainers = document.querySelectorAll('.ios-control-section .iphone-screen .message-container');

            // Listener for Control Buttons
            iosControlButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Deactivate all buttons
                    iosControlButtons.forEach(b => b.classList.remove('active'));

                    // Activate clicked button
                    this.classList.add('active');

                    // Hide ALL message containers in this section
                    iosAllMessageContainers.forEach(container => {
                        container.classList.add('hidden');
                    });

                    // Show the relevant message container
                    const example = this.getAttribute('data-ios-example');
                    const messageContainerId = `${example}-ios-messages`;
                    const messageContainer = document.getElementById(messageContainerId);

                    if (messageContainer) {
                        messageContainer.classList.remove('hidden');
                    } else {
                        console.log(`No message container found for iOS example: ${example} (ID: ${messageContainerId})`);
                    }
                });
            });


            // NEW: Scroll-based activation for Other Features using Sticky Parent
            // ... existing scroll listener code ...


            // NEW: Modal Functionality
            const notifyMacButton = document.getElementById('notifyMacButton');
            const closeButton = document.querySelector('.modal .close-button');
            const modalSubmitButton = document.getElementById('modalSubmitButton'); // Get the new submit button
            const modalEmailInput = document.getElementById('modalEmailInput'); // Get the email input
            const joinEmailListNavbarBtn = document.getElementById('joinEmailListNavbarBtn'); // Get the navbar button

            function openEmailModal() {
                console.log('openEmailModal called'); // DEBUG: Check if function is called
                const emailModal = document.getElementById('emailModal'); // MOVED DECLARATION INSIDE
                if (emailModal) {
                    emailModal.style.display = 'flex'; // Use flex to show and center
                } else {
                    console.error('emailModal element not found when trying to open.'); // DEBUG
                }
            }

            function closeEmailModal() {
                const emailModal = document.getElementById('emailModal'); // MOVED DECLARATION INSIDE
                 if (emailModal) {
                    emailModal.style.display = 'none';
                } else {
                    console.error('emailModal element not found when trying to close.'); // DEBUG
                }
            }

            if (notifyMacButton) {
                notifyMacButton.addEventListener('click', openEmailModal);
            }

            // Event listener for the navbar "Join Email List" button
            if (joinEmailListNavbarBtn) {
                joinEmailListNavbarBtn.addEventListener('click', function(event) {
                    event.preventDefault();
                    openEmailModal();
                });
            }

            if (closeButton) {
                closeButton.addEventListener('click', closeEmailModal); // Use the updated close function
            }

            // Close modal if user clicks outside of the modal content
            window.addEventListener('click', function(event) {
                const emailModal = document.getElementById('emailModal'); // Fetch here too for consistency
                if (emailModal && event.target == emailModal) { // Check if emailModal exists before comparing
                    closeEmailModal(); // Use the updated close function
                }
            });

            // Handle modal submit (Updated to call Cloud Function)
            if (modalSubmitButton) {
                modalSubmitButton.addEventListener('click', async function() { // Added async
                    const email = modalEmailInput.value;
                    const cloudFunctionUrl = 'https://us-central1-forfeit-58b5d.cloudfunctions.net/overlord_website_email_mailchimp'; // <-- UPDATED URL

                    if (!cloudFunctionUrl || cloudFunctionUrl === 'YOUR_CLOUD_FUNCTION_URL_HERE') { // This check can be simplified now or removed if you're confident
                        alert('Cloud Function URL is not configured. Please contact support.');
                        console.error('Cloud Function URL is not set in the script.');
                        return;
                    }

                    // Basic email validation
                    if (email && email.includes('@')) {
                        modalSubmitButton.textContent = 'Submitting...'; // Provide user feedback
                        modalSubmitButton.disabled = true;

                        try {
                            const response = await fetch(cloudFunctionUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ email: email }),
                            });

                            const result = await response.json();

                            if (response.ok) {
                                console.log('Subscription successful:', result);
                                alert(result.message || 'Successfully subscribed! Thank you.');
                                closeEmailModal(); 
                                modalEmailInput.value = ''; // Clear the input
                            } else {
                                // Handle errors from the Cloud Function (e.g., already subscribed, Mailchimp error)
                                console.error('Subscription failed:', result);
                                alert(result.error || 'Subscription failed. Please try again.');
                            }
                        } catch (error) {
                            console.error('Error submitting email:', error);
                            alert('An error occurred while submitting your email. Please try again.');
                        } finally {
                            modalSubmitButton.textContent = 'Submit'; // Reset button text
                            modalSubmitButton.disabled = false;
                        }

                    } else {
                        alert('Please enter a valid email address.');
                    }
                });
            }
            // END NEW: Modal Functionality

            // NEW: Download Info Modal Functionality
            const downloadButtons = document.querySelectorAll('.download-button[data-platform], .final-cta-button[data-platform], .fcta-iter05-badge[data-platform], .ol-topbar-cta[data-platform]');
            const downloadInfoModal = document.getElementById('downloadInfoModal');
            const proceedDownloadBtn = document.getElementById('proceedDownloadBtn');
            const cancelDownloadBtn = document.getElementById('cancelDownloadBtn');
            
            const downloadUrls = {
                ios: 'https://apps.apple.com/us/app/forfeit-habit-contracts/id1633125787',
                android: 'https://play.google.com/store/apps/details?id=app.forfeit.forfeit',
                mac: 'https://github.com/joshmitchell99/overlord-mac-app/releases/latest/download/Overlord.dmg'
            };

            let selectedPlatform = '';

            downloadButtons.forEach(button => {
                button.addEventListener('click', function() {
                    selectedPlatform = this.getAttribute('data-platform');
                    downloadInfoModal.style.display = 'flex';
                });
            });

            proceedDownloadBtn.addEventListener('click', function() {
                if (selectedPlatform && downloadUrls[selectedPlatform]) {
                    window.open(downloadUrls[selectedPlatform], '_blank');
                }
                downloadInfoModal.style.display = 'none';
            });

            cancelDownloadBtn.addEventListener('click', function() {
                downloadInfoModal.style.display = 'none';
            });

            // Close modal if user clicks outside
            window.addEventListener('click', function(event) {
                if (event.target === downloadInfoModal) {
                    downloadInfoModal.style.display = 'none';
                }
            });
            // END NEW: Download Info Modal Functionality

            // Hero Download Modal Functionality
            const heroDownloadTrigger = document.getElementById('hero-download-trigger');
            const heroDownloadModal = document.getElementById('heroDownloadModal');
            const heroDownloadCloseBtn = document.getElementById('heroDownloadCloseBtn');
            const heroDownloadTiles = document.getElementById('heroDownloadTiles');
            const heroDownloadCta = document.getElementById('heroDownloadCta');

            if (heroDownloadTrigger && heroDownloadModal) {
                heroDownloadTrigger.addEventListener('click', function() {
                    heroDownloadModal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                });

                const ctaDownloadTrigger = document.getElementById('cta-download-trigger');
                if (ctaDownloadTrigger) {
                    ctaDownloadTrigger.addEventListener('click', function() {
                        heroDownloadModal.style.display = 'flex';
                        document.body.style.overflow = 'hidden';
                    });
                }

                if (heroDownloadCloseBtn) {
                    heroDownloadCloseBtn.addEventListener('click', function() {
                        heroDownloadModal.style.display = 'none';
                        document.body.style.overflow = '';
                    });
                }

                // Close modal if user clicks outside
                window.addEventListener('click', function(event) {
                    if (event.target === heroDownloadModal) {
                        heroDownloadModal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                });
            }

            // Tile picker — update selection + CTA href/label
            if (heroDownloadTiles && heroDownloadCta) {
                const ctaLabel = heroDownloadCta.querySelector('.download-modal-cta-label');
                heroDownloadTiles.querySelectorAll('.download-modal-tile').forEach(function(tile) {
                    tile.addEventListener('click', function() {
                        heroDownloadTiles.querySelectorAll('.download-modal-tile').forEach(function(t) {
                            t.classList.remove('sel');
                        });
                        tile.classList.add('sel');
                        const href = tile.getAttribute('data-href');
                        const cta = tile.getAttribute('data-cta');
                        if (href) heroDownloadCta.setAttribute('href', href);
                        if (cta && ctaLabel) ctaLabel.textContent = cta;
                    });
                });
            }
            // END Hero Download Modal Functionality
        });
    