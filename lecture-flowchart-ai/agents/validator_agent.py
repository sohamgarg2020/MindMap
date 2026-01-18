def validate_edges(concepts, edges):
    valid_ids = {c["id"] for c in concepts}
    allowed_relations = {"depends_on", "leads_to", "example_of", "derived_from"}

    cleaned_edges = []
    seen = set()

    for edge in edges:
        src = edge.get("from")
        dst = edge.get("to")
        rel = edge.get("relation")

        # Rule 1: IDs must exist
        if src not in valid_ids or dst not in valid_ids:
            continue

        # Rule 2: No self loops
        if src == dst:
            continue

        # Rule 3: Valid relation
        if rel not in allowed_relations:
            continue

        # Rule 4: Normalize common patterns
        src_type = next(c["type"] for c in concepts if c["id"] == src)
        dst_type = next(c["type"] for c in concepts if c["id"] == dst)

        if src_type == "algorithm" and dst_type == "parameter":
            rel = "depends_on"

        key = (src, dst, rel)
        if key in seen:
            continue

        seen.add(key)
        cleaned_edges.append({
            "from": src,
            "to": dst,
            "relation": rel
        })

    return cleaned_edges

