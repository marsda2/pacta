
        document.addEventListener('DOMContentLoaded', function() {
            const lavaLampAscii = document.querySelector('.lava-lamp-ascii');
            if (!lavaLampAscii) return;

            const backgroundChars = ['0', '1', '.', ',', ':', ';', 'o', 'c', 'x', 'k', 'd', 'M', 'W', 'N', 'K', 'X'];

            function generateLavaLampASCII() {
                const rect = lavaLampAscii.getBoundingClientRect();
                const charsPerLine = Math.floor(rect.width / 8);
                const numLines = Math.ceil(rect.height / 11);

                let html = '';
                for (let line = 0; line < numLines; line++) {
                    for (let col = 0; col < charsPerLine; col++) {
                        const char = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];
                        html += char;
                    }
                    if (line < numLines - 1) html += '\n';
                }

                lavaLampAscii.textContent = html;
            }

            function animateLavaLampASCII() {
                const text = lavaLampAscii.textContent;
                const textArray = text.split('');
                const numChanges = Math.floor(textArray.length * 0.10);

                for (let i = 0; i < numChanges; i++) {
                    const randomIndex = Math.floor(Math.random() * textArray.length);
                    if (textArray[randomIndex] !== '\n') {
                        textArray[randomIndex] = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];
                    }
                }

                lavaLampAscii.textContent = textArray.join('');
            }

            // Generate initial ASCII
            generateLavaLampASCII();

            // Animate ASCII
            setInterval(animateLavaLampASCII, 100);

            // Regenerate on window resize
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(generateLavaLampASCII, 250);
            });
        });
    