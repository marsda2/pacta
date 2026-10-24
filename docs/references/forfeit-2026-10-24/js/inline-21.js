
        // Progressive rendering with individual character cycling for ASCII eye
        async function glitchASCIIEye() {
            const asciiEye = document.querySelector('.ascii-eye');
            if (!asciiEye) { return; }
            console.log('ASCII eye animation starting...');

            // Fetch the ASCII eye from external file
            // Feature flags
            const ENABLE_OUTLINE_GRADIENT = false; // Set to true to enable outline gradient effect

            let originalText; // Keep original structure (blocks and spaces)
            let targetText;
            let blockChars; // Final character for each position
            let outlineMap; // Map of position to outline layer (1, 2, 3)
            const textChars = ['M', 'W', 'N', 'K', 'X', '0', 'O', 'x', 'k', 'd', 'o', 'c', 'l', ';', ':', '.', ',', '\''];
            const noiseChars = ['.', ',', '\'', ';', ':', 'o', 'c'];
            const outlineChars = ['M', 'W', 'N', 'K', 'X', 'o', 'c', 'l', ';', ':', '.', ',']; // Chars for outline

            try {
                const response = await fetch('symmetrical_eye.txt');
                const rawText = await response.text();
                // Trim any trailing whitespace but preserve the internal structure
                originalText = rawText.trim(); // Keep original with blocks

                // Store the final character for each block position (no noise yet)
                blockChars = originalText.split('').map(char => {
                    if (char === '█') {
                        return textChars[Math.floor(Math.random() * textChars.length)];
                    }
                    return char;
                });

                // Don't add noise to targetText - keep it same length as original
                targetText = blockChars.join('');

                // Detect outline positions around the eye shape (DISABLED)
                outlineMap = new Map();

                if (ENABLE_OUTLINE_GRADIENT) {
                    const lines = originalText.split('\n');

                    // Helper to get character at row, col (returns space if out of bounds)
                    function getChar(row, col) {
                        if (row < 0 || row >= lines.length) return ' ';
                        if (col < 0 || col >= lines[row].length) return ' ';
                        return lines[row][col];
                    }

                    // Convert 2D position to linear index
                    function toIndex(row, col) {
                        let index = 0;
                        for (let r = 0; r < row; r++) {
                            index += lines[r].length + 1; // +1 for newline
                        }
                        return index + col;
                    }

                    // Calculate distance from each space to nearest eye block
                    for (let row = 0; row < lines.length; row++) {
                        for (let col = 0; col < lines[row].length; col++) {
                            if (lines[row][col] === ' ') {
                                // Check 8 directions for eye blocks
                                let minDist = Infinity;
                                for (let dr = -3; dr <= 3; dr++) {
                                    for (let dc = -3; dc <= 3; dc++) {
                                        if (dr === 0 && dc === 0) continue;
                                        const checkChar = getChar(row + dr, col + dc);
                                        if (checkChar === '█') {
                                            const dist = Math.max(Math.abs(dr), Math.abs(dc)); // Chebyshev distance
                                            minDist = Math.min(minDist, dist);
                                        }
                                    }
                                }

                                // Assign outline layer based on distance
                                if (minDist === 1) {
                                    outlineMap.set(toIndex(row, col), 1);
                                } else if (minDist === 2) {
                                    outlineMap.set(toIndex(row, col), 2);
                                } else if (minDist === 3) {
                                    outlineMap.set(toIndex(row, col), 3);
                                }
                            }
                        }
                    }

                    console.log('Outline positions detected:', outlineMap.size);
                }

            } catch (error) {
                console.error('Failed to load symmetrical_eye.txt:', error);
                return;
            }

            // Function to convert text with § noise markers to HTML
            function textToHTML(text) {
                let html = '';
                let i = 0;
                while (i < text.length) {
                    if (text[i] === '§') {
                        // Next character is noise
                        i++;
                        if (i < text.length) {
                            html += '<span class="noise">' + text[i] + '</span>';
                            i++;
                        }
                    } else {
                        // Escape HTML special chars and preserve spaces
                        const char = text[i];
                        if (char === '<') html += '&lt;';
                        else if (char === '>') html += '&gt;';
                        else if (char === '&') html += '&amp;';
                        else if (char === ' ') html += '&nbsp;'; // Preserve spaces!
                        else if (char === '\n') html += '\n'; // Keep newlines as-is
                        else html += char;
                        i++;
                    }
                }
                return html;
            }

            let targetArray = targetText.split('');
            let currentArray = targetArray.map(char => {
                // Keep newlines and spaces as-is, replace everything else with 'M'
                if (char === '\n' || char === ' ') {
                    return char;
                }
                return 'M';
            });

            // Function to build HTML from array (no noise during progressive render)
            function arrayToHTML(arr) {
                let html = '';
                for (let i = 0; i < arr.length; i++) {
                    const char = arr[i];
                    if (char === '\n') {
                        html += '\n';
                    } else if (char === ' ') {
                        // Check if this is an outline position (only if feature enabled)
                        if (ENABLE_OUTLINE_GRADIENT) {
                            const outlineLayer = outlineMap.get(i);
                            if (outlineLayer) {
                                // Show outline character during load animation too
                                const outlineChar = outlineChars[Math.floor(Math.random() * outlineChars.length)];
                                html += '<span class="outline-' + outlineLayer + '">' + outlineChar + '</span>';
                            } else {
                                html += '&nbsp;';
                            }
                        } else {
                            html += '&nbsp;';
                        }
                    } else {
                        html += char;
                    }
                }
                return html;
            }

            // Set initial state
            asciiEye.innerHTML = arrayToHTML(currentArray);
            console.log('Initial M state set, starting animation loop...');

            // All possible intermediate characters for cycling (excluding newlines)
            const cycleChars = ['M', 'W', 'N', 'K', 'X', '0', 'O', 'x', 'k', 'd', 'o', 'c', 'l', ';', ':', '.', ',', '\''];

            // Track cycling state for each character position
            let charStates = targetArray.map((targetChar, i) => {
                // Skip spaces and newlines - already correct
                if (targetChar === '\n' || targetChar === ' ') {
                    return { complete: true };
                }
                return {
                    complete: false,
                    settlePoint: Math.random(), // Random point in animation (0-1) when this char settles
                    hasSettled: false
                };
            });

            let fullyRendered = false;
            let frameCount = 0;
            const totalFrames = 30; // Total animation duration in frames

            // Easing function - ease in out cubic for smooth acceleration/deceleration
            function easeInOutCubic(t) {
                return t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;
            }

            // All characters cycle simultaneously - "coming into focus" with curved timing
            function progressiveRender() {
                if (fullyRendered) return;

                frameCount++;

                // Calculate animation progress with easing (0 to 1)
                const rawProgress = Math.min(frameCount / totalFrames, 1);
                const easedProgress = easeInOutCubic(rawProgress);

                let allComplete = true;

                // Update ALL characters at once every frame
                for (let i = 0; i < targetArray.length; i++) {
                    if (charStates[i].complete) continue;

                    allComplete = false;

                    // Check if this character should settle based on eased progress
                    if (!charStates[i].hasSettled && easedProgress >= charStates[i].settlePoint) {
                        // Character settles now
                        currentArray[i] = targetArray[i];
                        charStates[i].hasSettled = true;
                        charStates[i].complete = true;
                    } else if (!charStates[i].hasSettled) {
                        // Still cycling
                        currentArray[i] = cycleChars[Math.floor(Math.random() * cycleChars.length)];
                    }
                }

                asciiEye.innerHTML = arrayToHTML(currentArray);

                // Check if fully rendered
                if (allComplete || frameCount >= totalFrames) {
                    fullyRendered = true;
                    currentText = targetText;
                    // Ensure final state is correct - will be replaced immediately by startConstantCycling
                    console.log('Rendering complete, starting constant cycling');
                    startConstantCycling();
                }
            }

            // Constant cycling after rendering - matches tail end of progressive animation
            function startConstantCycling() {
                let cycleFrame = 0;

                setInterval(() => {
                    // Start from blockChars and regenerate noise each frame
                    let html = '';
                    let noiseCount = 0; // Debug counter
                    for (let i = 0; i < blockChars.length; i++) {
                        let char = blockChars[i];

                        if (char === '\n') {
                            html += '\n';
                            continue;
                        }

                        // For eye characters (not spaces/newlines), occasionally cycle
                        if (char !== ' ' && char !== '\n') {
                            // 8% chance to cycle this character
                            if (Math.random() < 0.08) {
                                html += textChars[Math.floor(Math.random() * textChars.length)];
                            } else {
                                html += char;
                            }
                            continue;
                        }

                        // Spaces: check if it's an outline position, otherwise add noise or empty
                        if (char === ' ') {
                            if (ENABLE_OUTLINE_GRADIENT) {
                                const outlineLayer = outlineMap.get(i);

                                if (outlineLayer) {
                                    // This is an outline position - always show darkened character
                                    const outlineChar = outlineChars[Math.floor(Math.random() * outlineChars.length)];
                                    html += '<span class="outline-' + outlineLayer + '">' + outlineChar + '</span>';
                                } else if (Math.random() < 0.15) {
                                    // Regular background noise (15% chance)
                                    const noiseChar = noiseChars[Math.floor(Math.random() * noiseChars.length)];
                                    html += '<span class="noise">' + noiseChar + '</span>';
                                    noiseCount++;
                                } else {
                                    html += '&nbsp;';
                                }
                            } else {
                                // Outline disabled - just show regular noise
                                if (Math.random() < 0.15) {
                                    const noiseChar = noiseChars[Math.floor(Math.random() * noiseChars.length)];
                                    html += '<span class="noise">' + noiseChar + '</span>';
                                    noiseCount++;
                                } else {
                                    html += '&nbsp;';
                                }
                            }
                            continue;
                        }

                        html += char;
                    }

                    if (cycleFrame % 10 === 0) {
                        console.log('Noise characters this frame:', noiseCount);
                    }
                    cycleFrame++;

                    asciiEye.innerHTML = html;
                }, 100); // Same interval as progressive animation
            }

            // Start progressive rendering - every 100ms (0.1 seconds)
            let renderInterval = setInterval(() => {
                if (fullyRendered) {
                    clearInterval(renderInterval);
                } else {
                    progressiveRender();
                }
            }, 100);
        }

        // Start when page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', glitchASCIIEye);
        } else {
            glitchASCIIEye();
        }
    