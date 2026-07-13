/* =========================================================================
   FutureMe - Quiz/Assessment Controller
   ========================================================================= */

// --- Global State ---
const userProfile = {
    interests: [],
    strengths: [],
    workStyle: "",
    values: [],
    educationLevel: "",
    existingSkills: []
};

// --- DOM Elements ---
const progressBar = document.getElementById('progress-bar');
const currentStepDisplay = document.getElementById('current-step-display');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Total steps in the assessment form
const totalSteps = 5;

// --- Initialize Event Listeners for Quiz Options ---
document.addEventListener('DOMContentLoaded', () => {
    setupSelectionGrid('interests-grid', 'interests', true, 3);
    setupSelectionGrid('strengths-grid', 'strengths', true, 3);
    setupSelectionGrid('work-style-grid', 'workStyle', false, 1);
    setupSelectionGrid('values-grid', 'values', true, 2);
    setupSelectionGrid('education-grid', 'educationLevel', false, 1);
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
    if (!grid) return;

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
                        // Shake card effect for feedback
                        card.style.transform = 'translateX(5px)';
                        setTimeout(() => card.style.transform = 'none', 100);
                    }
                }
            } else {
                // Single-select logic
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                userProfile[stateKey] = value;
            }
        });
    });
}

// --- Navigation Functions ---

function nextStep(currentStep) {
    let canProceed = false;
    if (currentStep === 1 && userProfile.interests.length > 0) canProceed = true;
    if (currentStep === 2 && userProfile.strengths.length > 0) canProceed = true;
    if (currentStep === 3 && userProfile.workStyle !== "") canProceed = true;
    if (currentStep === 4 && userProfile.values.length > 0) canProceed = true;

    if (!canProceed) {
        alert("Please select at least one option before proceeding.");
        return;
    }

    const currentDiv = document.getElementById(`step-${currentStep}`);
    const nextDiv = document.getElementById(`step-${currentStep + 1}`);
    
    if (currentDiv && nextDiv) {
        currentDiv.classList.remove('active');
        currentDiv.classList.add('hidden');
        
        nextDiv.classList.remove('hidden'); 
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
    if (!userProfile.educationLevel) {
        alert("Please select your education or career stage.");
        return;
    }

    // Process skills input
    const skillsInput = document.getElementById('existing-skills-input');
    let skillsArray = [];
    if (skillsInput && skillsInput.value.trim() !== "") {
        skillsArray = skillsInput.value.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
    userProfile.existingSkills = skillsArray;

    // Show Loading Overlay
    loadingOverlay.classList.remove('hidden');
    
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
        const payload = {
             interests: userProfile.interests,
             strengths: userProfile.strengths,
             workStyle: userProfile.workStyle,
             values: userProfile.values,
             educationLevel: userProfile.educationLevel,
             existingSkills: userProfile.existingSkills
        };

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMsg = "Network response was not ok.";
            try {
                 const errData = await response.json();
                 if(errData.error) errorMsg = errData.error;
            } catch(e) {}
            throw new Error(errorMsg);
        }

        const aiData = await response.json();
        
        clearInterval(intervalId);
        sessionStorage.setItem('futureMe_ai_analysis', JSON.stringify(aiData));
        window.location.href = '/dashboard';

    } catch (error) {
        console.error("Error generating AI profile:", error);
        clearInterval(intervalId);
        sessionStorage.setItem('futureMe_ai_analysis', JSON.stringify({error: error.message}));
        window.location.href = '/dashboard';
    }
}
