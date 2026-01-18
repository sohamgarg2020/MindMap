# validator_agent.py

def validate_edges(raw_edges, concepts):  # Fixed parameter order
    """
    Validate that edges only reference existing concept IDs.
    
    Args:
        raw_edges: List of edge dictionaries from dependency extraction
        concepts: List of concept dictionaries
    """
    # Build valid IDs with safety check
    valid_ids = set()
    for c in concepts:
        if isinstance(c, dict) and "id" in c:
            valid_ids.add(c["id"])
        else:
            print(f"Warning: Concept missing 'id' field: {c}")
    
    if not valid_ids:
        print("Error: No valid concept IDs found!")
        return []
    
    print(f"  Valid concept IDs ({len(valid_ids)}): {sorted(valid_ids)}")
    
    allowed_relations = {"depends_on", "leads_to", "example_of", "derived_from"}

    cleaned_edges = []
    seen = set()
    
    skipped_invalid_id = 0
    skipped_self_loop = 0
    skipped_invalid_relation = 0
    skipped_duplicate = 0

    for edge in raw_edges:
        if not isinstance(edge, dict):
            print(f"Warning: Invalid edge format: {edge}")
            continue
            
        src = edge.get("from")
        dst = edge.get("to")
        rel = edge.get("relation")

        # Rule 1: IDs must exist
        if src not in valid_ids or dst not in valid_ids:
            skipped_invalid_id += 1
            continue

        # Rule 2: No self loops
        if src == dst:
            skipped_self_loop += 1
            continue

        # Rule 3: Valid relation
        if rel not in allowed_relations:
            skipped_invalid_relation += 1
            continue

        # Rule 4: Normalize common patterns
        try:
            src_concept = next(c for c in concepts if c.get("id") == src)
            dst_concept = next(c for c in concepts if c.get("id") == dst)
            
            src_type = src_concept.get("type")
            dst_type = dst_concept.get("type")

            if src_type == "algorithm" and dst_type == "parameter":
                rel = "depends_on"
        except StopIteration:
            print(f"Warning: Could not find concept for edge {src} -> {dst}")
            continue

        # Rule 5: No duplicates
        key = (src, dst, rel)
        if key in seen:
            skipped_duplicate += 1
            continue

        seen.add(key)
        cleaned_edges.append({
            "from": src,
            "to": dst,
            "relation": rel
        })

    # Print validation summary
    print(f"  Validation summary:")
    print(f"    - Invalid IDs: {skipped_invalid_id}")
    print(f"    - Self-loops: {skipped_self_loop}")
    print(f"    - Invalid relations: {skipped_invalid_relation}")
    print(f"    - Duplicates: {skipped_duplicate}")
    print(f"    - Valid edges: {len(cleaned_edges)}")

    return cleaned_edges