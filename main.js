let currentWord = [];  
let lastSide = null;  
let currentLetter = null;
let enteredWords = [];
let usedLetters = new Set();
let lastWordLines = [];
let previousWordLines = [];
let currentWordLines = [];

document.addEventListener('DOMContentLoaded', () => {
    generatePuzzle();
    addResizeHandler();
    
    // Add keyboard listener for Enter key
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitWord();
        }
    });

    // Add click listener for enter button
    document.getElementById('enter-word').addEventListener('click', submitWord);

    // Add click listener for undo button
    document.getElementById('undo-letter').addEventListener('click', undoLastLetter);

    // Add click listener for clear button
    document.getElementById('clear-board').addEventListener('click', clearBoard);

    // Add click listener for new puzzle button
    document.getElementById('new-puzzle').addEventListener('click', generatePuzzle);

    // Add click listener for new puzzle button in modal
    document.getElementById('new-puzzle-modal').addEventListener('click', () => {
        document.getElementById('win-modal').classList.remove('show');
        generatePuzzle();
    });

    // Add click listeners for rules modal
    document.getElementById('show-rules').addEventListener('click', () => {
        document.getElementById('rules-modal').classList.add('show');
    });

    document.getElementById('close-rules').addEventListener('click', () => {
        document.getElementById('rules-modal').classList.remove('show');
    });
});


function generatePuzzle() {
    // Reset used letters when generating new puzzle
    usedLetters = new Set();
    enteredWords = [];
    lastWordLines = [];
    previousWordLines = [];
    currentWordLines = [];
    
    // Clear the word list display
    document.getElementById("word-list").innerHTML = '';
    
    fetch('http://generator.fly.dev/generate')
        .then(response => response.json())
        .then(puzzle => {
            const board = document.querySelector(".board");

            console.log(puzzle);
            
            // Clear existing board
            board.innerHTML = '';
            currentWord = [];
            currentLetter = null; 
            lastSide = null;
            document.querySelector("#current-word .word-text").textContent = "";

            // Create SVG overlay first
            const svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
            svg.setAttribute('class', 'line-overlay');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.zIndex = '1';
            board.appendChild(svg);

            // Create the containers
            const sides = ['north', 'east', 'south', 'west'];
            sides.forEach(side => {
                const sideEl = document.createElement('div');
                sideEl.className = side;
                board.appendChild(sideEl);
            });

            // Add center square
            const centerSquare = document.createElement('div');
            centerSquare.className = 'center-square';
            board.appendChild(centerSquare);
            
            // Get the new container references
            const north = board.querySelector(".north");
            const east = board.querySelector(".east");
            const south = board.querySelector(".south");
            const west = board.querySelector(".west");
            
            // Handle the layout data
            const layout = puzzle.layout;
            Object.entries(layout).forEach(([side, letters]) => {
                letters.forEach((letter) => {
                    // Create container for letter-circle pair
                    const container = document.createElement("div");
                    container.className = "letter-container";
                    
                    const letterEl = document.createElement("div");
                    letterEl.className = "letter";
                    letterEl.textContent = letter;
                    letterEl.setAttribute("data-side", side);
                    letterEl.setAttribute("data-letter", letter);
                    
                    const circle = document.createElement("button");
                    circle.className = "circle";
                    circle.setAttribute("data-side", side);
                    circle.setAttribute("data-letter", letter);
                    
                    // Add letter and circle to container
                    container.appendChild(letterEl);
                    container.appendChild(circle);
                    
                    // Add container to appropriate side
                    if (side === "north") {
                        north.appendChild(container);
                    } else if (side === "east") {
                        east.appendChild(container);
                    } else if (side === "south") {
                        south.appendChild(container);
                    } else if (side === "west") {
                        west.appendChild(container);
                    }
                });
            });

            // Move the event listener setup inside here, after creating the buttons
            document.querySelectorAll("button.circle").forEach((Circle) => {  
                Circle.addEventListener("click", () => {  
                    const selectedSide = Circle.getAttribute("data-side");  
                    const selectedLetter = Circle.getAttribute("data-letter");  
                
                    // Rule: Consecutive letters must be from different sides  
                    if (selectedSide !== lastSide) {  
                        // Remove active class from all circles and update letter colors
                        document.querySelectorAll("button.circle").forEach(c => {
                            c.classList.remove("active");
                            const letter = c.getAttribute("data-letter");
                            
                            // Add used class for letters in current word or previously used letters
                            // BUT not for the currently selected letter
                            if ((currentWord.includes(letter) || usedLetters.has(letter)) && letter !== selectedLetter) {
                                c.classList.add("used");
                                // Find and update all letter containers containing this letter
                                document.querySelectorAll(`.letter-container:has(button.circle[data-letter="${letter}"])`).forEach(container => {
                                    container.querySelector('.letter').style.color = 'var(--secondary-color)';
                                });
                            } else {
                                c.classList.remove("used");
                                // Reset letter color
                                document.querySelectorAll(`.letter-container:has(button.circle[data-letter="${letter}"])`).forEach(container => {
                                    container.querySelector('.letter').style.color = '';
                                });
                            }
                        });
                        
                        // Add active class to matching circles
                        document.querySelectorAll(`button.circle[data-letter="${selectedLetter}"]`).forEach(c => {
                            c.classList.add("active");
                            c.classList.remove("used");
                            // Update letter color for active circles
                            document.querySelectorAll(`.letter-container:has(button.circle[data-letter="${selectedLetter}"])`).forEach(container => {
                                container.querySelector('.letter').style.color = 'var(--secondary-color)';
                            });
                        });
                        
                        currentWord.push(selectedLetter);  
                        lastSide = selectedSide;
                        currentLetter = selectedLetter;
                        document.querySelector("#current-word .word-text").textContent = currentWord.join("");
                    }  
                    console.log(currentWord);
                    console.log(currentLetter);
                    updateLines();
                });  
            });
            
            updateWordCounter();
            updateLines();
        });
}

async function validateWord(word) {
    try {
        const response = await fetch(`https://generator.fly.dev/validate/${word}`);
        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error('Error validating word:', error);
        return false;
    }
}

async function submitWord() {
    if (currentWord.length > 0) {
        const word = currentWord.join("");
        console.log('Attempting to submit word:', word);
        
        // Check word length first
        if (word.length < 3) {
            console.log('Word too short:', word);
            const currentWordEl = document.querySelector("#current-word");
            currentWordEl.classList.add("invalid");
            setTimeout(() => {
                currentWordEl.classList.remove("invalid");
            }, 820);
            return;
        }
        
        // Validate the word against dictionary
        const isValid = await validateWord(word);
        console.log('Word validation result:', isValid);
        
        if (!isValid) {
            console.log('Invalid word:', word);
            const currentWordEl = document.querySelector("#current-word");
            currentWordEl.classList.add("invalid");
            setTimeout(() => {
                currentWordEl.classList.remove("invalid");
            }, 820);
            return;
        }

        console.log('Valid word submitted:', word);
        console.log('Current usedLetters before adding:', Array.from(usedLetters));
        
        // Add all letters from the word to usedLetters set
        currentWord.forEach(letter => {
            usedLetters.add(letter);
            console.log(`Added letter ${letter} to usedLetters`);
        });
        
        console.log('Current usedLetters after adding:', Array.from(usedLetters));
        
        // First add the word to our list
        enteredWords.push(word);
        updateWordList();
        updateWordCounter();
        
        // Then check win condition
        const hasWon = checkWinCondition();
        console.log('Win condition check result:', hasWon);
        
        if (hasWon) {
            console.log('WINNER! Showing modal...');
            showWinModal();
        }
        
        // Rest of the word submission logic...
        const lastLetter = currentWord[currentWord.length - 1];
        
        // Create lines for the completed word
        const wordLines = [];
        for (let i = 0; i < currentWord.length - 1; i++) {
            wordLines.push({
                start: currentWord[i],
                end: currentWord[i + 1]
            });
        }
        
        // Move last word lines to previous lines
        previousWordLines = [...previousWordLines, ...lastWordLines];
        // Set new last word lines
        lastWordLines = wordLines;
        
        // Reset current word to just the last letter
        currentWord = [lastLetter];
        document.querySelector("#current-word .word-text").textContent = lastLetter;
        
        // Reset lastSide based on the circle containing the last letter
        const lastLetterCircle = document.querySelector(`button.circle[data-letter="${lastLetter}"]`);
        if (lastLetterCircle) {
            lastSide = lastLetterCircle.getAttribute("data-side");
        }
        
        updateLines();
    }
}

function updateWordList() {
    const wordListEl = document.getElementById("word-list");
    wordListEl.innerHTML = enteredWords.map(word => `<div class="word">${word}</div>`).join("");
}

function updateWordCounter() {
    const counter = document.getElementById('word-counter');
    if (enteredWords.length === 0) {
        counter.textContent = '';
        counter.classList.remove('visible');
    } else {
        const wordText = enteredWords.length === 1 ? 'word' : 'words';
        counter.textContent = `${enteredWords.length} ${wordText}`;
        counter.classList.add('visible');
    }
}

function undoLastLetter() {
    if (currentWord.length > 0) {
        // If we're at the first letter of a new word (length 1) and there are previous words
        if (currentWord.length === 1 && enteredWords.length > 0) {
            // Get the last entered word
            const lastWord = enteredWords[enteredWords.length - 1];
            
            // Remove it from entered words
            enteredWords.pop();
            updateWordList();
            updateWordCounter();
            
            // Set currentWord to the full last word
            currentWord = lastWord.split('');
            
            // Reset the line arrays when going back to previous word
            previousWordLines = previousWordLines.slice(0, -lastWordLines.length);
            currentWordLines = [];
            lastWordLines = [];
            
            // Recalculate usedLetters from scratch based on all remaining words
            usedLetters = new Set();
            enteredWords.forEach(word => {
                word.split('').forEach(letter => usedLetters.add(letter));
            });

            // Add letters from current word (except last letter) to usedLetters
            currentWord.slice(0, -1).forEach(letter => usedLetters.add(letter));
        } else {
            // Remove the last letter from current word
            const removedLetter = currentWord[currentWord.length - 1];
            currentWord.pop();
            
            // If this letter only appears in the removed position, remove it from usedLetters
            if (!currentWord.includes(removedLetter) && !enteredWords.some(word => word.includes(removedLetter))) {
                usedLetters.delete(removedLetter);
            }
        }
        
        // Update the display
        document.querySelector("#current-word .word-text").textContent = currentWord.join("");
        
        // Reset all circle styles and letter colors
        document.querySelectorAll("button.circle").forEach(c => {
            const letter = c.getAttribute("data-letter");
            c.classList.remove("active");
            
            // Update circle and letter states
            if ((usedLetters.has(letter) || 
                (currentWord.length > 0 && currentWord.slice(0, -1).includes(letter))) && 
                letter !== currentWord[currentWord.length - 1]) {
                c.classList.add("used");
                // Update letter color for used letters
                document.querySelectorAll(`.letter-container:has(button.circle[data-letter="${letter}"])`).forEach(container => {
                    container.querySelector('.letter').style.color = 'var(--secondary-color)';
                });
            } else {
                c.classList.remove("used");
                // Reset letter color if not used or active
                if (!currentWord.includes(letter)) {
                    document.querySelectorAll(`.letter-container:has(button.circle[data-letter="${letter}"])`).forEach(container => {
                        container.querySelector('.letter').style.color = '';
                    });
                }
            }
        });
        
        // Update lastSide and currentLetter based on the new last letter
        if (currentWord.length > 0) {
            currentLetter = currentWord[currentWord.length - 1];
            const activeCircle = document.querySelector(`button.circle[data-letter="${currentLetter}"]`);
            lastSide = activeCircle.getAttribute("data-side");
            
            // Highlight circles and letters for current letter
            document.querySelectorAll(`button.circle[data-letter="${currentLetter}"]`).forEach(c => {
                c.classList.add("active");
                c.classList.remove("used");
            });
            document.querySelectorAll(`.letter-container:has(button.circle[data-letter="${currentLetter}"])`).forEach(container => {
                container.querySelector('.letter').style.color = 'var(--secondary-color)';
            });
        } else {
            // Reset if no letters remain
            lastSide = null;
            currentLetter = null;
            // Clear all line arrays when no letters remain
            lastWordLines = [];
            previousWordLines = [];
            currentWordLines = [];
        }

        updateLines();
    }
}

function clearBoard() {
    // Reset game state
    currentWord = [];
    lastSide = null;
    currentLetter = null;
    enteredWords = [];
    usedLetters = new Set();
    updateWordCounter();

    // Clear the word list display
    document.getElementById("word-list").innerHTML = '';
    
    // Clear the current word display
    document.querySelector("#current-word .word-text").textContent = "";

    // Reset all circle styles
    document.querySelectorAll("button.circle").forEach(c => {
        c.classList.remove("active");
        c.classList.remove("used");
    });

    lastWordLines = [];
    previousWordLines = [];
    currentWordLines = [];
    updateLines();

    // Hide modal if it's showing
    document.getElementById('win-modal').classList.remove('show');
}

function getCirclePosition(circle) {
    const circleRect = circle.getBoundingClientRect();
    const boardRect = document.querySelector('.board').getBoundingClientRect();
    const svgRect = document.querySelector('.line-overlay').getBoundingClientRect();
    
    // Calculate position relative to SVG
    return {
        x: circleRect.left - svgRect.left + (circleRect.width / 2),
        y: circleRect.top - svgRect.top + (circleRect.height / 2)
    };
}

function createSVGLine(start, end, type) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    
    // Set coordinates
    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    
    // Set common styles
    line.setAttribute("stroke", "var(--secondary-color)");
    line.setAttribute("stroke-linecap", "round");
    
    // Set type-specific styles and add animation class
    switch (type) {
        case 'current':
            line.setAttribute("stroke-dasharray", "4, 4");
            line.setAttribute("stroke-width", "3");
            line.setAttribute("opacity", "1");
            line.classList.add("line-animate");
            break;
        case 'last':
            line.setAttribute("stroke-width", "4");
            line.setAttribute("opacity", "0.8");
            line.classList.add("line-animate");
            break;
        default: // previous
            line.setAttribute("stroke-width", "2");
            line.setAttribute("opacity", "0.4");
    }
    
    return line;
}

function updateLines() {
    const svg = document.querySelector('.line-overlay');
    if (!svg) {
        console.warn('SVG overlay not found');
        return;
    }
    
    svg.innerHTML = '';
    
    console.log('Current Word:', currentWord);
    
    // Draw current word lines
    if (currentWord.length > 1) {
        for (let i = 0; i < currentWord.length - 1; i++) {
            // Remove the .active from the selector since we want any circle with the matching letter
            const startCircle = document.querySelector(`button.circle[data-letter="${currentWord[i]}"]`);
            const endCircle = document.querySelector(`button.circle[data-letter="${currentWord[i + 1]}"]`);
            
            if (!startCircle || !endCircle) {
                console.warn('Circle not found:', currentWord[i], currentWord[i + 1]);
                continue;
            }
            
            const startPos = getCirclePosition(startCircle);
            const endPos = getCirclePosition(endCircle);
            
            const line = createSVGLine(startPos, endPos, 'current');
            svg.appendChild(line);
        }
    }
    
    // Draw last word lines
    lastWordLines.forEach((line, index) => {
        const startCircle = document.querySelector(`button.circle[data-letter="${line.start}"]`);
        const endCircle = document.querySelector(`button.circle[data-letter="${line.end}"]`);
        
        if (!startCircle || !endCircle) {
            console.warn('Circle not found for last word line:', line);
            return;
        }
        
        const startPos = getCirclePosition(startCircle);
        const endPos = getCirclePosition(endCircle);
        
        svg.appendChild(createSVGLine(startPos, endPos, 'last'));
    });
    
    // Draw previous word lines
    previousWordLines.forEach((line, index) => {
        const startCircle = document.querySelector(`button.circle[data-letter="${line.start}"]`);
        const endCircle = document.querySelector(`button.circle[data-letter="${line.end}"]`);
        
        if (!startCircle || !endCircle) {
            console.warn('Circle not found for previous line:', line);
            return;
        }
        
        const startPos = getCirclePosition(startCircle);
        const endPos = getCirclePosition(endCircle);
        
        svg.appendChild(createSVGLine(startPos, endPos, 'previous'));
    });
}

// Add this helper function to update lines when window resizes
function addResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateLines, 100);
    });
}

function checkWinCondition() {
    console.log('Checking win condition...');
    
    // Get all unique letters from the board
    const allLetters = new Set();
    document.querySelectorAll('.letter').forEach(letterEl => {
        const letter = letterEl.getAttribute('data-letter');
        allLetters.add(letter);
        console.log(`Found letter on board: ${letter}`);
    });
    
    const allLettersArray = Array.from(allLetters);
    const usedLettersArray = Array.from(usedLetters);
    
    console.log('All letters on board:', allLettersArray);
    console.log('Used letters:', usedLettersArray);
    
    // Check if all letters have been used
    for (let letter of allLetters) {
        if (!usedLetters.has(letter)) {
            console.log(`Missing letter: ${letter}`);
            console.log(`Win condition failed - ${letter} not used yet`);
            return false;
        }
    }
    
    console.log('All letters have been used! Win condition met!');
    return true;
}

function showWinModal() {
    console.log('Showing win modal...');
    const modal = document.getElementById('win-modal');
    const wordCount = document.getElementById('word-count');
    const wordText = enteredWords.length === 1 ? 'word' : 'words';
    wordCount.textContent = `${enteredWords.length} ${wordText}`;
    modal.classList.add('show');
    console.log('Win modal should now be visible');
}