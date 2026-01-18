import React, { useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [];
const initialEdges = [];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const fileInputRef = useRef(null);

  const onConnect = (params) =>
    setEdges((eds) =>
      addEdge({ ...params, style: { strokeWidth: 2, opacity: 1 } }, eds)
    );

  const addNode = () => {
    const id = `N${nodes.length + 1}`;
    setNodes((nds) =>
      nds.concat({
        id,
        position: {
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
        },
        data: { label: `New Idea ${nds.length + 1}` },
      })
    );
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
  };

  const onPickAudio = () => {
    fileInputRef.current?.click();
  };

  const onAudioSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so selecting the same file twice still triggers change
    e.target.value = '';

    // FRONTEND-ONLY placeholder: just log it for now.
    // Later you can POST it to your backend.
    console.log('Selected audio:', file.name, file.type, file.size);

    // Example POST (when backend is ready):
    // const formData = new FormData();
    // formData.append('audio', file);
    // const res = await fetch('/api/upload-audio', { method: 'POST', body: formData });
    // const data = await res.json();
    // then setNodes/setEdges based on response...
  };

  const fetchData = async () => {
    try {
      const response = await fetch('/api/mindmap-data');
      const data = await response.json();

      const newNodes = (data.concepts || []).map((concept) => ({
        id: concept.id,
        data: { label: concept.label },
        position: {
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
        },
      }));

      const newEdges = (data.edges || []).map((edge, index) => ({
        id: `e${index}`,
        source: edge.from,
        target: edge.to,
        label: edge.relation,
        style: { strokeWidth: 2, opacity: 1 },
      }));

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (e) {
      console.error('Failed to fetch data from backend:', e);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <div
        style={{
          width: 240,
          padding: 12,
          background: '#1f1f1f',
          color: 'white',
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          MindMap Tools
        </div>

        <button
          onClick={addNode}
          style={btnStyle}
        >
          + Add Node
        </button>

        <button
          onClick={onPickAudio}
          style={btnStyle}
        >
          Upload Audio
        </button>

        <button
          onClick={clearAll}
          style={{ ...btnStyle, background: '#3a1f1f' }}
        >
          Clear All
        </button>

        {/* hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={onAudioSelected}
          style={{ display: 'none' }}
        />

        <div style={{ marginTop: 'auto', fontSize: 12, opacity: 0.7 }}>
          Nodes: {nodes.length} • Edges: {edges.length}
        </div>
      </div>

      {/* Flow canvas */}
      <div style={{ flex: 1 }}>
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
    </div>
  );
}

const btnStyle = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #444',
  background: '#2b2b2b',
  color: 'white',
  cursor: 'pointer',
  textAlign: 'left',
};
