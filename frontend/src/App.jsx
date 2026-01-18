import React, { useRef, useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);

  const fileInputRef = useRef(null);

  const onConnect = (params) =>
    setEdges((eds) => addEdge({ ...params, style: { strokeWidth: 2 } }, eds));

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // DELETE FUNCTION: Removes the currently selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // Keyboard shortcut for deletion
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNode) {
        // Only delete if we aren't typing in an input or textarea
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          deleteSelectedNode();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, deleteSelectedNode]);

  const updateNodeData = (field, value) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const newData = { ...node.data, [field]: value };
          return { ...node, data: newData };
        }
        return node;
      })
    );
    // Sync local selected state
    setSelectedNode(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const addNode = () => {
    const id = `manual-${Date.now()}`;
    const randomX = Math.floor(Math.random() * 400);
    const randomY = Math.floor(Math.random() * 400);

    const newNode = {
      id,
      position: { x: randomX, y: randomY },
      data: { label: `New Idea`, description: "Click to add details..." },
      style: {
        background: '#4b5563', color: 'white', borderRadius: 8, padding: 10,
        width: 180, fontSize: '12px', textAlign: 'center', border: '1px solid #6b7280'
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const clearCanvas = () => {
    if (window.confirm("Clear the entire mind map?")) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  };

  const onAudioSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setStatus(`Processing ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      const response = await fetch(`${API_BASE}/upload-audio`, { method: 'POST', body: formData });
      const result = await response.json();

      if (response.ok && result.success) {
        const newNodes = result.data.concepts.map((concept, idx) => ({
          id: concept.id,
          data: { label: concept.label, description: concept.description },
          position: { x: (idx % 5) * 250, y: Math.floor(idx / 5) * 150 },
          style: { background: '#2563eb', color: 'white', borderRadius: 8, padding: 10, width: 180 },
        }));
        setNodes(newNodes);
        setEdges(result.data.edges.map((e, i) => ({
          id: `e${i}`, source: e.from, target: e.to, label: e.relation, animated: true
        })));
        setStatus('✅ Generated!');
      }
    } catch (error) {
      setStatus(`❌ Server Error`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#121212', fontFamily: 'sans-serif' }}>
      <div style={sidebarStyle}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 15, color: '#60a5fa' }}>AI MindMapper</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={addNode} style={btnStyle}>+ New Idea</button>
          <button onClick={() => fileInputRef.current?.click()} style={btnStyle} disabled={isProcessing}>
            {isProcessing ? '⏳ Processing...' : '🎵 Upload Audio'}
          </button>
          <button onClick={clearCanvas} style={{ ...btnStyle, background: '#450a0a', border: '1px solid #7f1d1d' }}>🗑️ Clear All</button>
        </div>

        <input ref={fileInputRef} type="file" onChange={onAudioSelected} style={{ display: 'none' }} />
        <hr style={{ border: '0.5px solid #333', margin: '20px 0' }} />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {selectedNode ? (
            <div style={infoPanelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Editor</label>
                <button onClick={deleteSelectedNode} style={delBtnStyle}>Delete Node</button>
              </div>

              <input
                style={inputStyle}
                value={selectedNode.data.label}
                onChange={(e) => updateNodeData('label', e.target.value)}
                placeholder="Title"
              />

              <textarea
                style={{ ...inputStyle, height: '150px', resize: 'none' }}
                value={selectedNode.data.description}
                onChange={(e) => updateNodeData('description', e.target.value)}
                placeholder="Description"
              />
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#555', textAlign: 'center' }}>Select a node to edit or delete.</div>
          )}
        </div>
        <div style={{ fontSize: '10px', color: '#444' }}>{status}</div>
      </div>

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes.map(n => ({
            ...n,
            data: {
              ...n.data,
              label: (
                <div style={{ pointerEvents: 'none' }}>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}>{n.data.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>{n.data.description}</div>
                </div>
              )
            }
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
        >
          <Background color="#333" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

// Styles
const sidebarStyle = { width: 300, padding: '20px', background: '#18181b', color: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid #27272a' };
const btnStyle = { padding: '10px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' };
const delBtnStyle = { background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' };
const infoPanelStyle = { display: 'flex', flexDirection: 'column', gap: '10px' };
const labelStyle = { fontSize: '11px', color: '#60a5fa', fontWeight: 'bold' };
const inputStyle = { background: '#27272a', border: '1px solid #3f3f46', color: 'white', padding: '10px', borderRadius: '4px', fontSize: '14px', outline: 'none' };