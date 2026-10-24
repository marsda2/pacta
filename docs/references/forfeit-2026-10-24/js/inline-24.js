
        document.addEventListener('DOMContentLoaded', function() {
            const bubbles = [
                { id: 'bubble0', duration: 14000, delay: 0, x: 5 },
                { id: 'bubble1', duration: 16000, delay: 2000, x: 15 },
                { id: 'bubble2', duration: 13000, delay: 4000, x: 25 },
                { id: 'bubble3', duration: 15000, delay: 6000, x: 35 },
                { id: 'bubble4', duration: 17000, delay: 8000, x: 45 },
                { id: 'bubble5', duration: 14500, delay: 10000, x: 55 },
                { id: 'bubble6', duration: 13500, delay: 1000, x: 65 },
                { id: 'bubble7', duration: 15500, delay: 3000, x: 75 },
                { id: 'bubble8', duration: 14250, delay: 5000, x: 85 },
                { id: 'bubble9', duration: 16500, delay: 7000, x: 95 },
                { id: 'bubble10', duration: 13250, delay: 9000, x: 10 },
                { id: 'bubble11', duration: 15250, delay: 11000, x: 20 },
                { id: 'bubble12', duration: 14750, delay: 500, x: 30 },
                { id: 'bubble13', duration: 13750, delay: 2500, x: 40 },
                { id: 'bubble14', duration: 15750, delay: 4500, x: 50 },
                { id: 'bubble15', duration: 16250, delay: 6500, x: 60 },
                { id: 'bubble16', duration: 14000, delay: 8500, x: 70 },
                { id: 'bubble17', duration: 15000, delay: 1500, x: 80 },
                { id: 'bubble18', duration: 14500, delay: 3500, x: 90 },
                { id: 'bubble19', duration: 16750, delay: 5500, x: 3 }
            ];

            const containerHeight = document.body.scrollHeight;
            const containerWidth = window.innerWidth;

            // Set SVG viewBox to match screen dimensions
            const svg = document.querySelector('.lava-lamp-container svg');
            if (svg) {
                svg.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
                svg.setAttribute('preserveAspectRatio', 'none');
            }

            bubbles.forEach((config, index) => {
                const bubble = document.getElementById(config.id);
                if (!bubble) return;

                const animate = () => {
                    const startY = containerHeight + 100;
                    const endY = -100;
                    const xPos = (config.x / 100) * containerWidth; // Convert percentage to pixels based on viewport width

                    // Distribute bubbles throughout screen height initially
                    const initialOffset = (index / bubbles.length) * (containerHeight + 200);

                    const startTime = Date.now();

                    const update = () => {
                        const elapsed = Date.now() - startTime;

                        const progress = (elapsed % config.duration) / config.duration;
                        // Start from distributed position instead of bottom
                        const yPos = (startY - initialOffset) - (progress * (startY - endY));

                        bubble.setAttribute('cx', xPos);
                        bubble.setAttribute('cy', yPos);

                        requestAnimationFrame(update);
                    };

                    update();
                };

                animate();
            });
        });
    