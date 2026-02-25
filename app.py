import os
import json
from flask import Flask, render_template, request, jsonify
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# We'll use a model known to have a robust free endpoint on Hugging Face right now.
MODEL_ID = "mistralai/Mistral-7B-Instruct-v0.2"

hf_token = os.environ.get("HUGGINGFACE_API_KEY")
client = InferenceClient(model=MODEL_ID, token=hf_token)

def generate_prompt(data):
    """Constructs the prompt for the AI based on student input."""
    interests = ", ".join(data.get('interests', []))
    strengths = ", ".join(data.get('strengths', []))
    work_style = data.get('workStyle', 'Unknown')
    values = ", ".join(data.get('values', []))

    prompt = f"""
You are an expert AI Career Counselor. Analyze this student's profile:
- Interests: {interests}
- Strengths: {strengths}
- Preferred Work Style: {work_style}
- Core Values: {values}

Based on this profile, suggest 3 highly suitable and distinct career paths. For each career, provide:
1. "title": The name of the career.
2. "match_score": A percentage (e.g., "95%") indicating how well it matches their profile.
3. "description": A short, engaging sentence describing why it's a good fit.
4. "roadmap": An array of 3-4 distinct actionable steps (short strings) the student can take starting today to pursue this path.
5. "resource_link": A URL string. Create a Google search query specifically for beginner resources or roadmaps for this career. (e.g., "https://www.google.com/search?q=how+to+become+a+data+scientist+roadmap"). Format spaces with '+'.

**CRITICAL INSTRUCTION:** Your response MUST be valid JSON in this exact structure:
[
  {{
    "title": "...",
    "match_score": "...",
    "description": "...",
    "roadmap": ["...", "...", "..."],
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

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/analyze', methods=['POST'])
def analyze():
    if not hf_token or hf_token == "your_hugging_face_api_key_here":
         return jsonify({"error": "Hugging Face API Key is missing or invalid. Please check your .env file."}), 500

    try:
        data = request.json
        prompt = generate_prompt(data)

        # Create the messages array required by chat_completion
        messages = [
            {"role": "user", "content": prompt}
        ]

        # Use chat_completion instead of text_generation
        response = client.chat_completion(
            messages=messages,
            max_tokens=1024,
            temperature=0.3,
            top_p=0.9,
            seed=42
        )
        
        # Extract the content from the first choice
        raw_text = response.choices[0].message.content.strip()
        
        # Cleanup common markdown code blocks if the model ignored the instructions
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        
        
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
         # Specifically catch permission errors if a model needs access granted
        if "403 Client Error" in str(e):
             return jsonify({"error": "Access denied to the HF model. You may need to visit the model page on Hugging Face and accept the terms of use, or verify your API key permissions."}), 500
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
