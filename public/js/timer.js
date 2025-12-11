// The goal is to record elapsed time, so we start at zero.
let timeElapsed = 0; 
const timeDisplay = document.getElementById('time-display');
const startButton = document.getElementById('start-timer');
let timerInterval;
let isRunning = false;

// Function to format seconds into MM:SS
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function updateStopwatch() {
    timeElapsed++;
    timeDisplay.textContent = formatTime(timeElapsed);
}

function startTimer() {
    if (isRunning) {
        // If already running, do nothing (no pause functionality)
        return; 
    }
    
    // START logic
    timerInterval = setInterval(updateStopwatch, 1000);
    startButton.textContent = "Recording...";
    startButton.disabled = true; // Disable Start button while running
    isRunning = true;
}

function resetTimer() {
    clearInterval(timerInterval);
    timeElapsed = 0; // Reset to zero for a new attempt
    isRunning = false;
    timeDisplay.textContent = formatTime(timeElapsed);
    startButton.textContent = "Start Recording"; // Button text reflects the recording purpose
    startButton.disabled = false; // Enable Start button
}

// --- Setup ---

// Create and append the Reset button
const timerWidget = document.getElementById('timer-widget');
const resetButton = document.createElement('button');
resetButton.textContent = "Stop / Reset"; // Renamed to better reflect action
resetButton.id = "reset-timer";
timerWidget.appendChild(resetButton);

// Event Listeners
startButton.addEventListener('click', startTimer);
resetButton.addEventListener('click', resetTimer);

// Initial setup: Display 0:00 immediately.
timeDisplay.textContent = formatTime(timeElapsed);
startButton.textContent = "Start Recording"; // Set initial button text