
        document.addEventListener('DOMContentLoaded', function() {
            const gridBackgrounds = document.querySelectorAll('.grid-ascii-background');
            if (gridBackgrounds.length === 0) { return; }

            const backgroundChars = ['0', '1', '.', ',', ':', ';', 'o', 'c', 'x', 'k', 'd', 'M', 'W', 'N', 'K', 'X'];

            function generateGridASCII(gridBg) {
                const rect = gridBg.getBoundingClientRect();
                const charsPerLine = Math.floor(rect.width / 8); // Approx chars that fit (viewport width)
                const numLines = Math.ceil(rect.height / 11); // Approx lines that fit (section height)

                let html = '';
                for (let line = 0; line < numLines; line++) {
                    for (let col = 0; col < charsPerLine; col++) {
                        const char = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];
                        html += char;
                    }
                    if (line < numLines - 1) html += '\n';
                }

                gridBg.textContent = html;
            }

            function animateGridBackground(gridBg) {
                const text = gridBg.textContent;
                const textArray = text.split('');
                const numChanges = Math.floor(textArray.length * 0.10); // Change 10% of characters

                for (let i = 0; i < numChanges; i++) {
                    const randomIndex = Math.floor(Math.random() * textArray.length);
                    if (textArray[randomIndex] !== '\n') {
                        textArray[randomIndex] = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];
                    }
                }

                gridBg.textContent = textArray.join('');
            }

            // Generate initial ASCII for all grids
            gridBackgrounds.forEach(bg => generateGridASCII(bg));

            // Animate all grid backgrounds
            setInterval(() => {
                gridBackgrounds.forEach(bg => animateGridBackground(bg));
            }, 100);

            // Regenerate on window resize
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    gridBackgrounds.forEach(bg => generateGridASCII(bg));
                }, 250);
            });
        });
    