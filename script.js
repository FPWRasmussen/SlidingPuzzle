// Game configuration
const GRID_SIZE = 4;
const IMAGE_PATH = 'images/qr.png';

// Derive empty tile index and position from grid size (always bottom-right)
const EMPTY_INDEX = GRID_SIZE * GRID_SIZE - 1;
function getInitialEmptyPosition() {
    return { row: GRID_SIZE - 1, col: GRID_SIZE - 1 };
}

// Game state
let pieces = [];
let emptyPosition = getInitialEmptyPosition();
let moveCount = 0;
let startTime = null;
let timerInterval = null;
let isGameWon = false;
let isShuffling = false;
let musicStarted = false;

// Helper to calculate percentages based on grid size
// For a 3x3 grid: 0->0%, 1->50%, 2->100%
function getBackgroundPosition(index) {
    return index * (100 / (GRID_SIZE - 1));
}

// Helper for Width/Height/Top/Left
function getGridPercentage() {
    return 100 / GRID_SIZE;
}

// Initialize the puzzle
function initPuzzle() {
    const container = document.getElementById('puzzle-container');
    container.innerHTML = '';
    pieces = [];
    
    const sizePct = getGridPercentage();
    
    // Create pieces
    for (let row = 0; row < GRID_SIZE; row++) {
        pieces[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            const pieceNum = row * GRID_SIZE + col;
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            
            // Responsive sizing
            piece.style.width = `${sizePct}%`;
            piece.style.height = `${sizePct}%`;
            
            piece.dataset.row = row;
            piece.dataset.col = col;
            piece.dataset.correctRow = row;
            piece.dataset.correctCol = col;
            
            if (pieceNum === EMPTY_INDEX) {
                // This is the empty space
                piece.classList.add('empty');
                piece.dataset.pieceNum = '8';
            } else {
                // Set background image for this piece
                piece.style.backgroundImage = `url('${IMAGE_PATH}')`;
                
                // Scale background to cover the hypothetical full grid size
                // For 3x3, the image needs to be 300% the size of a single piece
                piece.style.backgroundSize = `${GRID_SIZE * 100}%`;
                
                // Calculate position in percentages
                piece.style.backgroundPosition = `${getBackgroundPosition(col)}% ${getBackgroundPosition(row)}%`;
                piece.dataset.pieceNum = pieceNum;
            }
            
            // Position the piece in the grid
            piece.style.left = `${col * sizePct}%`;
            piece.style.top = `${row * sizePct}%`;
            
            piece.addEventListener('click', handlePieceClick);
            // Add touch support for better mobile response
            piece.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling when tapping puzzle
                handlePieceClick(e);
            }, { passive: false });
            
            pieces[row][col] = piece;
            container.appendChild(piece);
        }
    }
    
    shufflePuzzle();
}

// Start background music (called on first user interaction)
function startMusic() {
    if (!musicStarted) {
        const audio = document.getElementById('backgroundMusic');
        audio.volume = 0.3; // Set to 30% volume
        audio.play().then(() => {
            musicStarted = true;
            console.log('Musik startet');
        }).catch(e => {
            console.log('Kunne ikke afspille musik:', e);
        });
    }
}

// Handle click on a piece
function handlePieceClick(event) {
    const piece = event.target;
    // On touch events, target might differ slightly depending on browser handling
    if (!piece.dataset.row) return; 
    
    const currentRow = parseInt(piece.dataset.row);
    const currentCol = parseInt(piece.dataset.col);
    movePiece(currentRow, currentCol);
}

// Move a piece if it's adjacent to the empty space
function movePiece(row, col, isShuffleMove = false) {
    if (isGameWon && !isShuffleMove) return;
    
    const rowDiff = Math.abs(row - emptyPosition.row);
    const colDiff = Math.abs(col - emptyPosition.col);
    
    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        // Start timer and music on first player move
        if (moveCount === 0 && !startTime && !isShuffleMove) {
            startTimer();
            startMusic();
        }
        
        // Swap the piece with the empty space
        const piece = pieces[row][col];
        const emptyPiece = pieces[emptyPosition.row][emptyPosition.col];
        
        // Swap positions in DOM (using styles set during init)
        const tempLeft = piece.style.left;
        const tempTop = piece.style.top;
        piece.style.left = emptyPiece.style.left;
        piece.style.top = emptyPiece.style.top;
        emptyPiece.style.left = tempLeft;
        emptyPiece.style.top = tempTop;
        
        // Swap data attributes
        const tempRow = piece.dataset.row;
        const tempCol = piece.dataset.col;
        piece.dataset.row = emptyPiece.dataset.row;
        piece.dataset.col = emptyPiece.dataset.col;
        emptyPiece.dataset.row = tempRow;
        emptyPiece.dataset.col = tempCol;
        
        // Swap in array
        pieces[row][col] = emptyPiece;
        pieces[emptyPosition.row][emptyPosition.col] = piece;
        
        // Update empty position
        emptyPosition = { row: row, col: col };
        
        // Only increment move count and check for win if not shuffling
        if (!isShuffleMove) {
            moveCount++;
            document.getElementById('moveCount').textContent = moveCount;
            
            // Check for win
            if (checkWin() && !isShuffling) {
                handleWin();
            }
        }
    }
}

// Shuffle the puzzle
function shufflePuzzle() {
    isShuffling = true;
    
    // Make random valid moves to shuffle
    const shuffleMoves = 150;
    for (let i = 0; i < shuffleMoves; i++) {
        const adjacentPieces = getAdjacentPieces();
        if (adjacentPieces.length > 0) {
            const randomPiece = adjacentPieces[Math.floor(Math.random() * adjacentPieces.length)];
            movePiece(randomPiece.row, randomPiece.col, true);
        }
    }
    
    // Ensure puzzle is not solved after shuffle
    if (checkWin()) {
        for (let i = 0; i < 10; i++) {
            const adjacentPieces = getAdjacentPieces();
            if (adjacentPieces.length > 0) {
                const randomPiece = adjacentPieces[Math.floor(Math.random() * adjacentPieces.length)];
                movePiece(randomPiece.row, randomPiece.col, true);
            }
        }
    }
    
    isShuffling = false;
    
    // Reset move count after shuffling
    moveCount = 0;
    document.getElementById('moveCount').textContent = moveCount;
}

// Get pieces adjacent to the empty space
function getAdjacentPieces() {
    const adjacent = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dRow, dCol] of directions) {
        const newRow = emptyPosition.row + dRow;
        const newCol = emptyPosition.col + dCol;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            adjacent.push({ row: newRow, col: newCol });
        }
    }
    
    return adjacent;
}

// Check if the puzzle is solved
function checkWin() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const piece = pieces[row][col];
            if (piece.dataset.correctRow != row || piece.dataset.correctCol != col) {
                return false;
            }
        }
    }
    return true;
}

// Handle winning the game
function handleWin() {
    isGameWon = true;
    stopTimer();
    
    // Reveal the last piece
    const emptyPiece = pieces[GRID_SIZE-1][GRID_SIZE-1];
    emptyPiece.classList.remove('empty');
    emptyPiece.style.backgroundImage = `url('${IMAGE_PATH}')`;
    emptyPiece.style.backgroundSize = `${GRID_SIZE * 100}%`;
    // 100% 100% corresponds to the bottom-right corner
    emptyPiece.style.backgroundPosition = '100% 100%';
    
    // Add visual feedback for completion
    const container = document.getElementById('puzzle-container');
    container.classList.add('completed');
    container.classList.add('celebration');
    
    // Highlight both info items as completed
    document.querySelectorAll('.info-item').forEach(item => {
        item.classList.add('completed');
    });
    
    // Start snow effect
    startSnowEffect();
}

// Snow effect
function startSnowEffect() {
    // Create snowflakes at intervals
    setInterval(createSnowflake, 100);
}

function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.innerHTML = '❄';
    snowflake.style.left = Math.random() * 100 + 'vw';
    
    const duration = Math.random() * 3 + 2; // 2-5 seconds
    snowflake.style.animationDuration = duration + 's';
    
    snowflake.style.opacity = Math.random();
    snowflake.style.fontSize = Math.random() * 10 + 10 + 'px';

    document.body.appendChild(snowflake);

    // Remove after animation ends to keep DOM clean
    setTimeout(() => {
        snowflake.remove();
    }, duration * 1000);
}

// Debug helper to instantly solve the puzzle
function debugSolve() {
    if (isGameWon) return;

    const container = document.getElementById('puzzle-container');
    container.innerHTML = '';
    pieces = [];
    emptyPosition = getInitialEmptyPosition();
    
    const sizePct = getGridPercentage();

    for (let row = 0; row < GRID_SIZE; row++) {
        pieces[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            const pieceNum = row * GRID_SIZE + col;
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            
            // Responsive sizing
            piece.style.width = `${sizePct}%`;
            piece.style.height = `${sizePct}%`;
            
            piece.dataset.row = row;
            piece.dataset.col = col;
            piece.dataset.correctRow = row;
            piece.dataset.correctCol = col;

            if (pieceNum === EMPTY_INDEX) {
                piece.classList.add('empty');
                piece.dataset.pieceNum = '8';
            } else {
                piece.style.backgroundImage = `url('${IMAGE_PATH}')`;
                piece.style.backgroundSize = `${GRID_SIZE * 100}%`;
                piece.style.backgroundPosition = `${getBackgroundPosition(col)}% ${getBackgroundPosition(row)}%`;
                piece.dataset.pieceNum = pieceNum;
            }

            piece.style.left = `${col * sizePct}%`;
            piece.style.top = `${row * sizePct}%`;

            pieces[row][col] = piece;
            container.appendChild(piece);
        }
    }

    moveCount = 0;
    document.getElementById('moveCount').textContent = moveCount;
    handleWin();
}

// Timer functions
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timer').textContent = display;
    }
}

function stopTimer() {
    clearInterval(timerInterval);
}

// Initialize game on load
window.addEventListener('DOMContentLoaded', () => {
    initPuzzle();
    
    // Also try to start music on any click anywhere on the page (for mobile)
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('touchstart', startMusic, { once: true });
});