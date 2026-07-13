/* =========================================================================
   FutureMe - Dashboard/Results Controller
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const analysisDataStr = sessionStorage.getItem('futureMe_ai_analysis');
    const resultsContainer = document.getElementById('results-container');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const template = document.getElementById('career-card-template');

    if (!analysisDataStr) {
        // Redirect back to quiz if no data is present
        window.location.href = '/quiz';
        return;
    }

    try {
        const results = JSON.parse(analysisDataStr);
        resultsContainer.innerHTML = '';

        if (results.error) {
            resultsContainer.classList.add('hidden');
            errorContainer.classList.remove('hidden');
            errorMessage.textContent = results.error;
            return;
        }

        if (Array.isArray(results)) {
            results.forEach((career, index) => {
                const clone = template.content.cloneNode(true);

                // Basic Details
                clone.querySelector('.career-title').textContent = career.title;
                
                const scoreVal = career.match_score || "95%";
                const progressNumeric = parseInt(scoreVal.replace('%', '')) || 95;
                const meter = clone.querySelector('.conic-meter');
                if (meter) {
                    meter.style.setProperty('--progress', `${progressNumeric}%`);
                }
                clone.querySelector('.score-value').textContent = scoreVal;
                
                clone.querySelector('.career-description').textContent = career.description;

                // Advanced Details (Metrics)
                clone.querySelector('.career-salary').textContent = career.salary_range || "$80,000 - $120,000";
                clone.querySelector('.career-outlook').textContent = career.job_outlook || "Stable growth";
                clone.querySelector('.career-education').textContent = career.education_needed || "Bachelor's Degree";

                // Skills tags
                const tagsCloud = clone.querySelector('.skills-tag-cloud');
                tagsCloud.innerHTML = '';
                if (career.required_skills && Array.isArray(career.required_skills)) {
                    career.required_skills.forEach(skill => {
                        const span = document.createElement('span');
                        span.className = 'skill-tag';
                        span.textContent = skill;
                        tagsCloud.appendChild(span);
                    });
                } else {
                    tagsCloud.innerHTML = '<span class="skill-tag">General Tech Skills</span>';
                }

                // Interactive Roadmap Steps
                const roadmapList = clone.querySelector('.roadmap-list');
                roadmapList.innerHTML = '';
                
                // Build unique storage keys for checkboxes
                const storageKeyBase = `futureme_roadmap_${career.title.replace(/\s+/g, '_').toLowerCase()}`;

                if (career.roadmap && Array.isArray(career.roadmap)) {
                    career.roadmap.forEach((step, idx) => {
                        const li = document.createElement('li');
                        
                        const label = document.createElement('label');
                        label.className = 'roadmap-item';
                        
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        
                        // Restore from localStorage
                        const savedState = localStorage.getItem(`${storageKeyBase}_step_${idx}`);
                        if (savedState === 'true') {
                            checkbox.checked = true;
                            label.classList.add('completed');
                        }

                        checkbox.addEventListener('change', () => {
                            if (checkbox.checked) {
                                label.classList.add('completed');
                                localStorage.setItem(`${storageKeyBase}_step_${idx}`, 'true');
                            } else {
                                label.classList.remove('completed');
                                localStorage.removeItem(`${storageKeyBase}_step_${idx}`);
                            }
                        });

                        const customCheck = document.createElement('span');
                        customCheck.className = 'custom-checkbox';
                        
                        const stepText = document.createElement('span');
                        stepText.className = 'step-text';
                        stepText.textContent = step;

                        label.appendChild(checkbox);
                        label.appendChild(customCheck);
                        label.appendChild(stepText);
                        li.appendChild(label);
                        roadmapList.appendChild(li);
                    });
                }

                // Dynamic Job Search / Courses links
                const queryName = encodeURIComponent(career.title);
                const exploreLink = clone.querySelector('.explore-link');
                const searchJobsLink = clone.querySelector('.search-jobs-link');
                const searchCoursesLink = clone.querySelector('.search-courses-link');

                if (exploreLink) exploreLink.href = career.resource_link || `https://www.google.com/search?q=how+to+become+a+${queryName}`;
                if (searchJobsLink) searchJobsLink.href = `https://www.linkedin.com/jobs/search/?keywords=${queryName}`;
                if (searchCoursesLink) searchCoursesLink.href = `https://www.coursera.org/search?query=${queryName}`;

                resultsContainer.appendChild(clone);
            });
        }
    } catch (e) {
        console.error("Error displaying assessment dashboard:", e);
        resultsContainer.classList.add('hidden');
        errorContainer.classList.remove('hidden');
        errorMessage.textContent = "We encountered a parsing error when loading your dashboard. Please try again.";
    }
});
