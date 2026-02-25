/* =========================================================================
   FutureMe - Application Logic
   ========================================================================= */

// --- Global State ---
const userProfile = {
    interests: [],
    strengths: [],
    workStyle: "",
    values: []
};

// --- DOM Elements ---
const heroSection = document.getElementById('hero-section');
const assessmentSection = document.getElementById('assessment-section');
const progressBar = document.getElementById('progress-bar');
const currentStepDisplay = document.getElementById('current-step-display');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Total steps in the assessment form
const totalSteps = 4;

// --- Initialize Event Listeners for Quiz Options ---
document.addEventListener('DOMContentLoaded', () => {
    // Setting up selection logic for multi-select and single-select grids
    setupSelectionGrid('interests-grid', 'interests', true, 3);
    setupSelectionGrid('strengths-grid', 'strengths', true, 3);
    setupSelectionGrid('work-style-grid', 'workStyle', false, 1);
    setupSelectionGrid('values-grid', 'values', true, 2);
});

/**
 * Attaches click event listeners to option cards within a grid.
 * @param {string} gridId - DOM ID of the container grid
 * @param {string} stateKey - Key in userProfile to update
 * @param {boolean} isMulti - True if multiple selections are allowed
 * @param {number} maxLimit - Maximum selections allowed (if multi)
 */
function setupSelectionGrid(gridId, stateKey, isMulti, maxLimit) {
    const grid = document.getElementById(gridId);
    if (!grid) return; // In case we are on dashboard page

    const cards = grid.querySelectorAll('.option-card');
    
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const value = card.getAttribute('data-value');
            
            if (isMulti) {
                // Multi-select logic
                if (card.classList.contains('selected')) {
                    // Deselect
                    card.classList.remove('selected');
                    userProfile[stateKey] = userProfile[stateKey].filter(item => item !== value);
                } else {
                    // Select (enforce limit)
                    if (userProfile[stateKey].length < maxLimit) {
                        card.classList.add('selected');
                        userProfile[stateKey].push(value);
                    } else {
                        // Optional: Provide visual feedback that limit is reached.
                        // For a smooth experience, maybe shake the container or show a toast.
                         card.style.transform = 'translateX(5px)';
                         setTimeout(() => card.style.transform = 'none', 100);
                    }
                }
            } else {
                // Single-select logic
                // Remove selected class from all siblings
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                userProfile[stateKey] = value;
            }
        });
    });
}

// --- Navigation Functions ---

function startAssessment() {
    heroSection.classList.add('hidden');
    assessmentSection.classList.remove('hidden');
    updateProgressBar(1);
}

function nextStep(currentStep) {
    // Simple Validation before proceeding
    let canProceed = false;
    if (currentStep === 1 && userProfile.interests.length > 0) canProceed = true;
    if (currentStep === 2 && userProfile.strengths.length > 0) canProceed = true;
    if (currentStep === 3 && userProfile.workStyle !== "") canProceed = true;

    if (!canProceed) {
        alert(`Please select at least one option before proceeding.`);
        return;
    }

    const currentDiv = document.getElementById(`step-${currentStep}`);
    const nextDiv = document.getElementById(`step-${currentStep + 1}`);
    
    if (currentDiv && nextDiv) {
        currentDiv.classList.remove('active');
        currentDiv.classList.add('hidden'); // Hide the old step
        
        nextDiv.classList.remove('hidden'); 
        // Small delay to allow display to change before animating opacity
        setTimeout(() => nextDiv.classList.add('active'), 10); 
        
        updateProgressBar(currentStep + 1);
    }
}

function prevStep(currentStep) {
    const currentDiv = document.getElementById(`step-${currentStep}`);
    const prevDiv = document.getElementById(`step-${currentStep - 1}`);
    
    if (currentDiv && prevDiv) {
        currentDiv.classList.remove('active');
        currentDiv.classList.add('hidden');
        
        prevDiv.classList.remove('hidden');
        setTimeout(() => prevDiv.classList.add('active'), 10);
        
        updateProgressBar(currentStep - 1);
    }
}

function updateProgressBar(step) {
    if (currentStepDisplay) currentStepDisplay.textContent = step;
    if (progressBar) {
        const percentage = (step / totalSteps) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

// --- Submit & API Interaction ---

async function submitAssessment() {
    // Final Validation
    if (userProfile.values.length === 0) {
        alert("Please select your core values.");
        return;
    }

    // Show Loading Overlay
    loadingOverlay.classList.remove('hidden');
    
    // Cycle loading texts to keep user engaged
    const texts = [
        "Analyzing interests and strengths...",
        "Evaluating preferred work style...",
        "Matching with global career trends...",
        "Architecting your optimal roadmap..."
    ];
    
    let textIdx = 0;
    const intervalId = setInterval(() => {
        textIdx = (textIdx + 1) % texts.length;
        if (loadingText) loadingText.textContent = texts[textIdx];
    }, 2500);

    try {
        // Build payload
        const payload = {
             interests: userProfile.interests,
             strengths: userProfile.strengths,
             workStyle: userProfile.workStyle,
             values: userProfile.values
        };

        // Make API call to our Flask backend
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        // Ensure response is JSON
        if (!response.ok) {
            // Try to parse error message if backend sent one
            let errorMsg = "Network response was not ok.";
            try {
                 const errData = await response.json();
                 if(errData.error) errorMsg = errData.error;
            } catch(e) {}
            throw new Error(errorMsg);
        }

        const aiData = await response.json();
        
        // Save the results to sessionStorage so dashboard.html can read them
        sessionStorage.setItem('futureMe_ai_analysis', JSON.stringify(aiData));
        
        clearInterval(intervalId);
        
        // Redirect to Dashboard
        window.location.href = '/dashboard';

    } catch (error) {
        console.error("Error generating AI profile:", error);
        clearInterval(intervalId);
        
        // Store the error object to show on dashboard
        sessionStorage.setItem('futureMe_ai_analysis', JSON.stringify({error: error.message}));
        window.location.href = '/dashboard';
    }
}
