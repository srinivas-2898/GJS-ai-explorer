import os
from PyPDF2 import PdfReader
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) # Enable CORS for all routes

# Configure Gemini API
API_KEY = "AIzaSyD5QBnpktlpu_ysjmaHgfVMdL729Az7QXA"
genai.configure(api_key=API_KEY)

# Use the requested model version
MODEL_NAME = "gemini-2.5-flash" 

# Global state for simple PDF RAG (In-memory context)
# For production, this should be in a session or database
pdf_context = {
    "text": "",
    "filename": ""
}

@app.route('/')
def index():
    """Serve the index.html file."""
    return app.send_static_file('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle PDF file uploads and extract text."""
    global pdf_context
    if 'file' not in request.files:
        return jsonify({"error": "No file part", "success": False}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file", "success": False}), 400

    if file and file.filename.endswith('.pdf'):
        try:
            reader = PdfReader(file)
            extracted_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
            
            pdf_context["text"] = extracted_text
            pdf_context["filename"] = file.filename
            
            return jsonify({
                "success": True, 
                "filename": file.filename,
                "message": f"Successfully extracted text from {file.filename}"
            })
        except Exception as e:
            return jsonify({"error": str(e), "success": False}), 500
    else:
        return jsonify({"error": "Only PDF files allowed", "success": False}), 400

@app.route('/clear_context', methods=['POST'])
def clear_context():
    """Clear the stored PDF context."""
    global pdf_context
    pdf_context = {"text": "", "filename": ""}
    return jsonify({"success": True})

@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat requests with PDF RAG augmentation."""
    data = request.json
    user_prompt = data.get('prompt', '')
    
    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    # Simple RAG: Augment prompt if PDF context exists
    final_prompt = user_prompt
    if pdf_context["text"]:
        final_prompt = f"""
        [STUDY CONTEXT FROM PDF: {pdf_context["filename"]}]
        {pdf_context["text"]}
        
        [USER QUESTION]
        {user_prompt}
        
        Please answer the question ONLY based on the context provided above. 
        If the information is not in the context, say "I couldn't find that in the uploaded document." 
        Keep your response concise and structured.
        """

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(final_prompt)
        
        return jsonify({
            "response": response.text,
            "success": True,
            "using_rag": bool(pdf_context["text"])
        })
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok", 
        "model": MODEL_NAME, 
        "rag_context": bool(pdf_context["text"]),
        "doc": pdf_context["filename"]
    })

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
