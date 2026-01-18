from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
from pathlib import Path

from audio_detection import audio_to_text
from agents.concept_agent import extract_concepts
from agents.dependency_agent import (
    extract_dependencies, 
    extract_conceptual_dependencies,
    ensure_full_connectivity
)
from agents.validator_agent import validate_edges

app = Flask(__name__, static_folder='build', static_url_path='')

# Simple CORS - allow all origins for development
CORS(app, origins="*", supports_credentials=False)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'mp4', 'wav', 'ogg', 'm4a', 'flac'}
Path(UPLOAD_FOLDER).mkdir(exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Store the latest graph in memory
current_graph = {
    "concepts": [],
    "edges": []
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 500):
    """Split text into overlapping chunks by character count."""
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        if end < len(text):
            search_start = max(start, end - 200)
            last_period = text.rfind('.', search_start, end)
            last_question = text.rfind('?', search_start, end)
            last_exclamation = text.rfind('!', search_start, end)
            
            best_break = max(last_period, last_question, last_exclamation)
            if best_break > start:
                end = best_break + 1
        
        chunks.append(text[start:end])
        start = end - overlap
        
    return chunks


def build_lecture_graph(audio_path: str):
    """Build the concept graph from audio file."""
    print("\n[1] Transcribing audio...")
    lecture_text = audio_to_text(audio_path)

    if not lecture_text or len(lecture_text.strip()) == 0:
        raise ValueError("Transcription failed or returned empty text.")

    print(f"Transcript length: {len(lecture_text)} characters")

    print("\n[2] Chunking lecture text...")
    chunks = chunk_text(lecture_text, chunk_size=4000, overlap=500)
    print(f"Created {len(chunks)} chunks")

    print("\n[3] Extracting concepts per chunk...")
    concepts = []
    seen_labels = {}
    
    for i, chunk in enumerate(chunks):
        print(f"  Processing chunk {i+1}/{len(chunks)}...")
        chunk_concepts = extract_concepts(chunk)
        
        for c in chunk_concepts:
            label_key = c["label"].lower().strip()
            normalized = label_key.replace("the ", "").replace("'s ", " ")
            
            is_duplicate = False
            for existing_label in seen_labels.keys():
                words1 = set(normalized.split())
                words2 = set(existing_label.split())
                if len(words1 & words2) / max(len(words1), len(words2)) > 0.8:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                c["id"] = f"C{len(concepts) + 1}"
                concepts.append(c)
                seen_labels[normalized] = c["id"]
        
        print(f"    Found {len(chunk_concepts)} concepts, {len(concepts)} total unique")

    if not concepts:
        raise ValueError("No concepts extracted after chunking.")

    print(f"\n[4] Extracted {len(concepts)} unique concepts total")
    
    pop_dist = {}
    for c in concepts:
        pop = c.get("popularity", 3)
        pop_dist[pop] = pop_dist.get(pop, 0) + 1
    print(f"  Popularity distribution: {dict(sorted(pop_dist.items()))}")

    print("\n[5] Extracting dependencies (popularity-aware)...")
    all_edges = []
    
    print("  Pass 1: Thematic relationships...")
    thematic_edges = extract_dependencies(concepts, lecture_text[:8000], focus="thematic")
    all_edges.extend(thematic_edges)
    print(f"    Found {len(thematic_edges)} thematic edges")
    
    print("  Pass 2: Concept interdependencies...")
    concept_edges = extract_conceptual_dependencies(concepts)
    all_edges.extend(concept_edges)
    print(f"    Found {len(concept_edges)} conceptual edges")
    
    print("  Validating intermediate edges...")
    validated_edges = validate_edges(all_edges, concepts)
    print(f"    Valid edges after initial passes: {len(validated_edges)}")
    
    print("  Pass 3: Ensuring all concepts are connected...")
    connectivity_edges = ensure_full_connectivity(concepts, validated_edges)
    all_edges.extend(connectivity_edges)
    
    print(f"  Total raw edges: {len(all_edges)}")

    print("\n[6] Final validation...")
    edges = validate_edges(all_edges, concepts)
    print(f"Final validated edges: {len(edges)}")

    return {
        "concepts": concepts,
        "edges": edges
    }


# API Routes

@app.route('/')
def serve_react():
    """Serve the React app."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/mindmap-data', methods=['GET'])
def get_mindmap_data():
    """Get the current mindmap data."""
    return jsonify(current_graph)


@app.route('/api/upload-audio', methods=['POST'])
def upload_audio():
    """Handle audio file upload and process it."""
    global current_graph
    
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: mp3, mp4, wav, ogg, m4a, flac'}), 400
    
    try:
        # Save the uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        print(f"\n{'='*60}")
        print(f"Processing uploaded file: {filename}")
        print(f"{'='*60}")
        
        # Process the audio file
        graph = build_lecture_graph(filepath)
        
        # Update the current graph
        current_graph = graph
        
        # Clean up the uploaded file (optional)
        # os.remove(filepath)
        
        print(f"\n{'='*60}")
        print(f"Processing complete!")
        print(f"Concepts: {len(graph['concepts'])}, Edges: {len(graph['edges'])}")
        print(f"{'='*60}\n")
        
        return jsonify({
            'success': True,
            'message': f'Processed {filename} successfully',
            'filename': filename,
            'filepath': filepath,
            'stats': {
                'concepts': len(graph['concepts']),
                'edges': len(graph['edges'])
            },
            'data': graph,
            'concepts': graph['concepts'],
            'edges': graph['edges']
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"\n❌ Error processing audio: {e}")
        print(error_trace)
        return jsonify({
            'error': str(e),
            'trace': error_trace
        }), 500


@app.route('/api/clear', methods=['POST'])
def clear_data():
    """Clear the current mindmap data."""
    global current_graph
    current_graph = {"concepts": [], "edges": []}
    return jsonify({'success': True, 'message': 'Data cleared'})


if __name__ == '__main__':
    print("\n🚀 Starting Flask server...")
    print("📍 API endpoints:")
    print("   - GET  /api/mindmap-data   (get current graph)")
    print("   - POST /api/upload-audio   (upload audio file)")
    print("   - POST /api/clear          (clear data)")
    print("\n⚠️  Server running on PORT 5000")
    print("   Make sure your frontend connects to http://localhost:5000\n")
    app.run(debug=True, port=5000, host='0.0.0.0')