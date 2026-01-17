import React, { useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [];
const initialEdges = [];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const strengthToOpacity = (s) => clamp(s / 10, .15, 1);

const CustomNode = ({ data }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    data.label = label;
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div
      style={{
        padding: '10px 15px',
        border: '1px solid #ddd',
        borderRadius: '3px',
        background: 'white',
        minWidth: '150px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#222',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Bottom} />
      <Handle type="source" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      {isEditing ? (
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '12px',
            textAlign: 'center',
          }}
        />
      ) : (
        <div onDoubleClick={handleEdit} style={{ cursor: 'pointer' }}>
          {label}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = (params) => setEdges((eds) => addEdge({ ...params, style: { strokeWidth: 2, opacity: 1 } }, eds));

  const addNode = () => {
    const id = `N${nodes.length + 1}`;
    setNodes((nds) =>
      nds.concat({
        id,
        type: 'custom',
        position: { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 },
        data: { label: `New Idea ${nds.length + 1}` },
      })
    );
  };

  const fetchData = async () => {
    try {
      const response = await fetch('/api/mindmap-data'); // Adjust this URL to match your backend endpoint
      const data = await response.json();
      // Assume data is { concepts: [...], edges: [...] } from validation agent
      const nodes = (data.concepts || []).map(concept => ({
        id: concept.id,
        type: 'custom',
        data: { label: concept.label },
        position: { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 }
      }));
      const styledEdges = (data.edges || []).map((edge, index) => ({
        id: `e${index}`,
        source: edge.from,
        target: edge.to,
        label: edge.relation,
        strength: 5, // Default strength, can be adjusted based on relation or other logic
        style: {
          strokeWidth: 2, // Default stroke width
          opacity: 1, // Full opacity, close to black
        }
      }));
      setNodes(nodes);
      setEdges(styledEdges);
    } catch (e) {
      console.error('Failed to fetch data from backend:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {}
      <button
        onClick={addNode}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          padding: '8px 12px',
          borderRadius: 6,
          border: 'none',
          background: '#575757',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        + Add Node
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
