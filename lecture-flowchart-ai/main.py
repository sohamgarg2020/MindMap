from audio_detection import audio_to_text
from agents.concept_agent import extract_concepts
from agents.dependency_agent import (
    extract_dependencies, 
    extract_conceptual_dependencies,
    ensure_full_connectivity
)
from agents.validator_agent import validate_edges


def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 500):
    """
    Split text into overlapping chunks by character count.
    
    Args:
        text: The text to chunk
        chunk_size: Target size of each chunk in characters
        overlap: Number of characters to overlap between chunks
    """
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # If this isn't the last chunk, try to break at a sentence
        if end < len(text):
            # Look for sentence endings in the last 200 chars of the chunk
            search_start = max(start, end - 200)
            last_period = text.rfind('.', search_start, end)
            last_question = text.rfind('?', search_start, end)
            last_exclamation = text.rfind('!', search_start, end)
            
            best_break = max(last_period, last_question, last_exclamation)
            if best_break > start:
                end = best_break + 1
        
        chunks.append(text[start:end])
        start = end - overlap  # Move back by overlap amount
        
    return chunks



def build_lecture_graph(audio_path: str):
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
    
    # Print popularity distribution
    pop_dist = {}
    for c in concepts:
        pop = c.get("popularity", 3)
        pop_dist[pop] = pop_dist.get(pop, 0) + 1
    print(f"  Popularity distribution: {dict(sorted(pop_dist.items()))}")

    # IMPROVED: Multi-pass edge extraction with popularity awareness
    print("\n[5] Extracting dependencies (popularity-aware)...")
    all_edges = []
    
    # Pass 1: Thematic relationships
    print("  Pass 1: Thematic relationships...")
    thematic_edges = extract_dependencies(
        concepts, 
        lecture_text[:8000],
        focus="thematic"
    )
    all_edges.extend(thematic_edges)
    print(f"    Found {len(thematic_edges)} thematic edges")
    
    # Pass 2: Concept-to-concept relationships
    print("  Pass 2: Concept interdependencies...")
    concept_edges = extract_conceptual_dependencies(concepts)
    all_edges.extend(concept_edges)
    print(f"    Found {len(concept_edges)} conceptual edges")
    
    # Validate intermediate edges
    print("  Validating intermediate edges...")
    validated_edges = validate_edges(all_edges, concepts)
    print(f"    Valid edges after initial passes: {len(validated_edges)}")
    
    # Pass 3: Ensure full connectivity
    print("  Pass 3: Ensuring all concepts are connected...")
    connectivity_edges = ensure_full_connectivity(concepts, validated_edges)
    all_edges.extend(connectivity_edges)
    
    print(f"  Total raw edges: {len(all_edges)}")

    print("\n[6] Final validation...")
    edges = validate_edges(all_edges, concepts)
    print(f"Final validated edges: {len(edges)}")
    
    # Verify connectivity
    connected_ids = set()
    for edge in edges:
        connected_ids.add(edge.get("from"))
        connected_ids.add(edge.get("to"))
    
    all_ids = {c["id"] for c in concepts}
    still_isolated = all_ids - connected_ids
    
    if still_isolated:
        print(f"  ⚠️  Warning: {len(still_isolated)} concepts still isolated: {sorted(still_isolated)}")
    else:
        print(f"  ✓ All {len(concepts)} concepts are connected!")
    
    # Print edge statistics by popularity
    print("\n  Edge statistics by popularity:")
    edge_counts = {c["id"]: 0 for c in concepts}
    for edge in edges:
        edge_counts[edge["from"]] += 1
        edge_counts[edge["to"]] += 1
    
    for pop in [5, 4, 3, 2, 1]:
        pop_concepts = [c for c in concepts if c.get("popularity") == pop]
        if pop_concepts:
            avg_edges = sum(edge_counts[c["id"]] for c in pop_concepts) / len(pop_concepts)
            print(f"    Popularity {pop}: {len(pop_concepts)} concepts, avg {avg_edges:.1f} edges each")

    return {
        "concepts": concepts,
        "edges": edges
    }


if __name__ == "__main__":
    AUDIO_FILE = "videoplayback.mp4"

    try:
        graph = build_lecture_graph(AUDIO_FILE)

        print("\n=== FINAL GRAPH SUMMARY ===")
        print(f"Total concepts: {len(graph['concepts'])}")
        print(f"Total edges: {len(graph['edges'])}")
        print(f"Average edges per concept: {len(graph['edges']) * 2 / len(graph['concepts']):.1f}")
        
        # Show sample high-popularity concepts with their edges
        print("\n=== HIGH-POPULARITY CONCEPTS ===")
        high_pop = sorted(
            [c for c in graph['concepts'] if c.get('popularity', 0) >= 4],
            key=lambda x: x.get('popularity', 0),
            reverse=True
        )[:10]
        
        for c in high_pop:
            edges_from = [e for e in graph['edges'] if e['from'] == c['id']]
            edges_to = [e for e in graph['edges'] if e['to'] == c['id']]
            print(f"{c['id']}: {c['label']} (pop: {c['popularity']}) - {len(edges_from)} outgoing, {len(edges_to)} incoming")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()