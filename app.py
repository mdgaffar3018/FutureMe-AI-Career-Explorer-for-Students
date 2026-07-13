import os
import json
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# We'll use Gemini 2.5 Flash via standard REST calls for high speed and platform reliability.
MODEL_ID = "gemini-2.5-flash"
gemini_key = os.environ.get("GEMINI_API_KEY")

def generate_prompt(data):
    """Constructs the prompt for the AI based on student input."""
    interests = ", ".join(data.get('interests', []))
    strengths = ", ".join(data.get('strengths', []))
    work_style = data.get('workStyle', 'Unknown')
    values = ", ".join(data.get('values', []))
    education_level = data.get('educationLevel', 'Unknown')
    existing_skills = ", ".join(data.get('existingSkills', [])) if data.get('existingSkills') else "None listed yet"

    prompt = f"""
You are an expert AI Career Counselor. Analyze this student's profile:
- Interests: {interests}
- Strengths: {strengths}
- Preferred Work Style: {work_style}
- Core Values: {values}
- Current Education / Career Stage: {education_level}
- Existing Skills / Hobbies: {existing_skills}

Based on this profile, suggest 3 highly suitable and distinct career paths. For each career, provide:
1. "title": The name of the career.
2. "match_score": A percentage (e.g., "95%") indicating how well it matches their profile.
3. "description": A short, engaging sentence describing why it's a good fit.
4. "roadmap": An array of 3-4 distinct actionable steps (short strings) the student can take starting today to pursue this path. Tailor these steps based on their current education level and existing skills.
5. "salary_range": The average annual salary range in USD (e.g., "$80,000 - $120,000").
6. "job_outlook": Projected growth outlook (e.g., "15% growth (Much faster than average)").
7. "required_skills": An array of 4 key technical or soft skills needed for this role.
8. "education_needed": Suggested minimum credentials or path (e.g., "Bachelor's Degree or Industry Certification").
9. "resource_link": A URL string. Create a Google search query specifically for beginner resources or roadmaps for this career. (e.g., "https://www.google.com/search?q=how+to+become+a+data+scientist+roadmap"). Format spaces with '+'.

**CRITICAL INSTRUCTION:** Your response MUST be valid JSON in this exact structure:
[
  {{
    "title": "...",
    "match_score": "...",
    "description": "...",
    "roadmap": ["...", "...", "..."],
    "salary_range": "...",
    "job_outlook": "...",
    "required_skills": ["...", "...", "..."],
    "education_needed": "...",
    "resource_link": "..."
  }},
  ...
]

Do NOT wrap the JSON in markdown blocks (like ```json), DO NOT provide any introductory or concluding conversational text. ONLY output raw JSON.
"""
    return prompt

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/quiz')
def quiz():
    return render_template('quiz.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/api/analyze', methods=['POST'])
def analyze():
    if not gemini_key or gemini_key == "your_gemini_api_key_here":
         return jsonify({"error": "Gemini API Key is missing or invalid. Please check your .env file."}), 500

    try:
        data = request.json
        prompt = generate_prompt(data)

        # Query Google Gemini REST API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": gemini_key
        }
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3
            }
        }

        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", "Unknown error from Gemini API.")
            except:
                error_msg = response.text
            print(f"Gemini API Error: {error_msg}")
            return jsonify({"error": f"Gemini API Error: {error_msg}"}), response.status_code

        res_json = response.json()
        
        # Verify response matches expected structure
        if 'candidates' not in res_json or len(res_json['candidates']) == 0:
             return jsonify({"error": "Gemini returned an empty response. Please try again."}), 500

        raw_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()

        # Robustly extract JSON block by finding first [ and last ]
        start_idx = raw_text.find('[')
        end_idx = raw_text.rfind(']')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            raw_text = raw_text[start_idx:end_idx + 1]

        try:
            parsed_data = json.loads(raw_text.strip())
            return jsonify(parsed_data)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON. Raw response from model:\n{raw_text}")
            return jsonify({
                "error": "The AI provided an incorrectly formatted response.",
                "details": str(e),
                "raw_response": raw_text
            }), 500

    except Exception as e:
        print(f"Error during AI analysis: {e}")
        err_str = str(e)
        if "NameResolutionError" in err_str or "MaxRetryError" in err_str or "Failed to resolve" in err_str:
            return jsonify({"error": "Network Connection Error: Unable to reach Gemini API. Please verify that your computer is connected to the internet and has DNS access."}), 500
        return jsonify({"error": err_str}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
