import React, { useRef, useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

const API_BASE = 'http://localhost:5000/api';

// Custom node component with dynamic sizing and circular shape
const CustomNode = ({ data, id }) => {
  const connectionCount = data.connectionCount || 0;
  let size = 120;
  let fontSize = '14px';
  let padding = '20px';
  
  if (connectionCount >= 5) {
    size = 180;
    fontSize = '20px';
    padding = '40px';
  } else if (connectionCount >= 3) {
    size = 150;
    fontSize = '17px';
    padding = '30px';
  } else if (connectionCount >= 1) {
    size = 120;
    fontSize = '14px';
    padding = '20px';
  } else {
    size = 100;
    fontSize = '12px';
    padding = '16px';
  }
  
  const colors = [
    '#2563eb', '#10b981', '#f59e0b', '#06b6d4', 
    '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#f97316',
  ];
  
  const colorIndex = (connectionCount + data.label.length) % colors.length;
  const backgroundColor = data.isRoot ? '#5b7ee5' : colors[colorIndex];
  const textColor = 'white';
  const borderColor = 'rgba(255,255,255,0.3)';
  
  const isHighlighted = data.isHighlighted;
  const isFaded = data.isFaded;
  const opacity = isFaded ? 0.2 : 1;
  
  const handleStyle = {
    background: '#60a5fa',
    width: '12px',
    height: '12px',
    border: '2px solid white',
    opacity: 1,
  };
  
  return (
    <div style={{
      background: backgroundColor,
      color: textColor,
      borderRadius: '50%',
      width: `${size}px`,
      height: `${size}px`,
      border: `2px solid ${borderColor}`,
      boxShadow: connectionCount >= 3 ? '0 8px 24px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: padding,
      transition: 'all 0.3s ease',
      position: 'relative',
      opacity: opacity,
      transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
    }}>
      <Handle type="target" position={Position.Left} id="left" style={handleStyle} />
      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="target" position={Position.Right} id="right" style={handleStyle} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={handleStyle} />
      
      <div style={{ 
        fontWeight: connectionCount >= 3 ? '700' : '600', 
        fontSize: fontSize, 
        lineHeight: '1.3',
        wordWrap: 'break-word',
        textAlign: 'center',
        maxWidth: '100%',
        fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
      }}>
        {data.label}
      </div>
      
      <Handle type="source" position={Position.Left} id="left" style={handleStyle} />
      <Handle type="source" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const fileInputRef = useRef(null);

  const onConnect = (params) => {
    const isDuplicate = edges.some(edge => 
      (edge.source === params.source && edge.target === params.target) ||
      (edge.source === params.target && edge.target === params.source)
    );
    
    if (isDuplicate) return;
    
    setEdges((eds) => addEdge({ 
      ...params, 
      type: 'smoothstep',
      animated: false,
      markerEnd: {
        type: 'arrowclosed',
        color: '#94a3b8',
        width: 18,
        height: 18,
      },
      style: { 
        strokeWidth: 2.5, 
        stroke: '#94a3b8',
      },
    }, eds));
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === params.source || node.id === params.target) {
          const newCount = (node.data.connectionCount || 0) + 1;
          return {
            ...node,
            data: { ...node.data, connectionCount: newCount }
          };
        }
        return node;
      })
    );
  };

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setHighlightedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightedNodeId(null);
  }, []);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    
    const connectedEdges = edges.filter(
      (edge) => edge.source === selectedNode.id || edge.target === selectedNode.id
    );
    
    setNodes((nds) => {
      const remainingNodes = nds.filter((node) => node.id !== selectedNode.id);
      
      return remainingNodes.map((node) => {
        const wasConnected = connectedEdges.some(
          (edge) => edge.source === node.id || edge.target === node.id
        );
        
        if (wasConnected) {
          const newCount = Math.max(0, (node.data.connectionCount || 0) - 1);
          return {
            ...node,
            data: { ...node.data, connectionCount: newCount }
          };
        }
        return node;
      });
    });
    
    setEdges((eds) => 
      eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
    );
    
    setSelectedNode(null);
    setHighlightedNodeId(null);
  }, [selectedNode, edges, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNode) {
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
    setSelectedNode(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const addNode = () => {
    const id = `manual-${Date.now()}`;
    const randomX = Math.floor(Math.random() * 400);
    const randomY = Math.floor(Math.random() * 400);

    const newNode = {
      id,
      type: 'custom',
      position: { x: randomX, y: randomY },
      data: { label: `New Idea`, description: "Click to add details...", connectionCount: 0 },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const clearCanvas = () => {
    if (window.confirm("Clear the entire mind map?")) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setHighlightedNodeId(null);
    }
  };

  const limitConnections = (edgesData, maxConnections = 4) => {
    const outgoingEdges = new Map();
    const seenConnections = new Set();
    
    const uniqueEdges = edgesData.filter(edge => {
      const key = `${edge.from}-${edge.to}`;
      const reverseKey = `${edge.to}-${edge.from}`;
      
      if (seenConnections.has(key) || seenConnections.has(reverseKey)) {
        return false;
      }
      
      seenConnections.add(key);
      return true;
    });
    
    uniqueEdges.forEach(edge => {
      if (!outgoingEdges.has(edge.from)) {
        outgoingEdges.set(edge.from, []);
      }
      outgoingEdges.get(edge.from).push(edge);
    });
    
    const limitedEdges = [];
    outgoingEdges.forEach((edges, source) => {
      limitedEdges.push(...edges.slice(0, maxConnections));
    });
    
    return limitedEdges;
  };

  const getBestHandles = (sourcePos, targetPos) => {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    
    const angle = Math.atan2(dy, dx);
    
    let sourceHandle = 'right';
    if (angle > 3 * Math.PI / 4 || angle < -3 * Math.PI / 4) {
      sourceHandle = 'left';
    } else if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) {
      sourceHandle = 'bottom';
    } else if (angle > -3 * Math.PI / 4 && angle < -Math.PI / 4) {
      sourceHandle = 'top';
    }
    
    let targetHandle = 'left';
    if (angle > 3 * Math.PI / 4 || angle < -3 * Math.PI / 4) {
      targetHandle = 'right';
    } else if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) {
      targetHandle = 'top';
    } else if (angle > -3 * Math.PI / 4 && angle < -Math.PI / 4) {
      targetHandle = 'bottom';
    }
    
    return { sourceHandle, targetHandle };
  };

  // TRUE radial layout with multiple nodes per ring
  const calculateRadialLayout = (concepts, edgesData) => {
    const limitedEdges = limitConnections(edgesData, 4);
    
    const adjacencyList = new Map();
    const reverseAdjacency = new Map();
    
    concepts.forEach(concept => {
      adjacencyList.set(concept.id, []);
      reverseAdjacency.set(concept.id, []);
    });
    
    limitedEdges.forEach(edge => {
      adjacencyList.get(edge.from)?.push(edge.to);
      reverseAdjacency.get(edge.to)?.push(edge.from);
    });
    
    // Find center node
    const connectionCounts = new Map();
    concepts.forEach(concept => {
      const outgoing = adjacencyList.get(concept.id)?.length || 0;
      const incoming = reverseAdjacency.get(concept.id)?.length || 0;
      connectionCounts.set(concept.id, outgoing + incoming);
    });
    
    let centerNode = concepts[0];
    let maxConnections = 0;
    concepts.forEach(concept => {
      const count = connectionCounts.get(concept.id) || 0;
      if (count > maxConnections) {
        maxConnections = count;
        centerNode = concept;
      }
    });
    
    // Build rings using BFS
    const rings = [];
    const visited = new Set();
    const nodeRing = new Map();
    const queue = [{ id: centerNode.id, ring: 0 }];
    
    visited.add(centerNode.id);
    rings.push([centerNode.id]);
    nodeRing.set(centerNode.id, 0);
    
    while (queue.length > 0) {
      const { id, ring } = queue.shift();
      const neighbors = [...(adjacencyList.get(id) || []), ...(reverseAdjacency.get(id) || [])];
      
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const newRing = ring + 1;
          
          while (rings.length <= newRing) {
            rings.push([]);
          }
          
          rings[newRing].push(neighborId);
          nodeRing.set(neighborId, newRing);
          queue.push({ id: neighborId, ring: newRing });
        }
      });
    }
    
    // Handle disconnected nodes
    concepts.forEach(concept => {
      if (!visited.has(concept.id)) {
        const outerRing = rings.length;
        if (rings.length === outerRing) {
          rings.push([]);
        }
        rings[outerRing].push(concept.id);
        nodeRing.set(concept.id, outerRing);
      }
    });
    
    // Position nodes in concentric circles with LARGE spacing
    const positions = new Map();
    const baseRadius = 350; // LARGER first ring
    const radiusIncrement = 350; // MUCH LARGER spacing between rings
    
    rings.forEach((ring, ringIndex) => {
      if (ringIndex === 0) {
        // Center node
        positions.set(ring[0], { x: 0, y: 0 });
      } else {
        const radius = baseRadius + (ringIndex - 1) * radiusIncrement;
        const nodesInRing = ring.length;
        
        // Ensure minimum angular spacing to prevent overlap
        const minAngleSpacing = Math.max(0.5, (2 * Math.PI) / Math.max(nodesInRing, 6));
        
        ring.forEach((nodeId, index) => {
          // Distribute evenly around circle with some randomness for organic look
          const baseAngle = (index / nodesInRing) * 2 * Math.PI - Math.PI / 2;
          const jitter = (Math.random() - 0.5) * 0.2; // Small random offset for organic feel
          const angle = baseAngle + jitter;
          
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          
          positions.set(nodeId, { x, y });
        });
      }
    });
    
    const roots = [centerNode];
    
    // Create edges with smart routing
    const categorizedEdges = limitedEdges.map(edge => {
      const sourceRing = nodeRing.get(edge.from) || 0;
      const targetRing = nodeRing.get(edge.to) || 0;
      const ringDistance = Math.abs(targetRing - sourceRing);
      
      const sourcePos = positions.get(edge.from);
      const targetPos = positions.get(edge.to);
      const handles = getBestHandles(sourcePos, targetPos);
      
      // Straight for adjacent, smoothstep for long distance
      const isAdjacent = ringDistance === 1;
      
      return {
        ...edge,
        sourceRing,
        targetRing,
        ringDistance,
        isAdjacent,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
      };
    });
    
    return { positions, limitedEdges: categorizedEdges, roots };
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
        const { positions, limitedEdges, roots } = calculateRadialLayout(
          result.data.concepts, 
          result.data.edges
        );
        
        const connectionCounts = new Map();
        result.data.concepts.forEach(concept => {
          connectionCounts.set(concept.id, 0);
        });
        
        limitedEdges.forEach(edge => {
          connectionCounts.set(edge.from, (connectionCounts.get(edge.from) || 0) + 1);
          connectionCounts.set(edge.to, (connectionCounts.get(edge.to) || 0) + 1);
        });
        
        const newNodes = result.data.concepts.map((concept) => ({
          id: concept.id,
          type: 'custom',
          data: { 
            label: concept.label, 
            description: concept.description,
            isRoot: roots.some(r => r.id === concept.id),
            connectionCount: connectionCounts.get(concept.id) || 0,
          },
          position: positions.get(concept.id) || { x: 0, y: 0 },
        }));
        
        setNodes(newNodes);
        
        // Create edges: straight for adjacent, smoothstep curves around nodes for long distance
        setEdges(limitedEdges.map((e, i) => ({
          id: `e${i}`,
          source: e.from,
          target: e.to,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.isAdjacent ? 'straight' : 'smoothstep',
          animated: false,
          markerEnd: {
            type: 'arrowclosed',
            color: '#94a3b8',
            width: 18,
            height: 18,
          },
          style: { 
            strokeWidth: 2.5, 
            stroke: '#94a3b8',
          },
        })));
        setStatus(`Found ${limitedEdges.length} connections !!`);
      }
    } catch (error) {
      setStatus(`❌ Server Error`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      background: '#fdfefe',
      fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
      backgroundImage: `
        linear-gradient(#d5f4e6 0.5px, transparent 0.5px),
        linear-gradient(90deg, #d5f4e6 0.5px, transparent 0.5px)
      `,
      backgroundSize: '32px 32px',
    }}>
      <div style={sidebarStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Mind Map</h1>
          <button onClick={addNode} style={{ ...primaryBtnStyle, padding: '6px 12px', fontSize: '14px', width: 'auto', height: 'auto' }}>New Node | +</button>
        </div>

        {/* Actions */}
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...secondaryBtnStyle, width: '100%' }} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Upload Audio'}
          </button>
        </div>

        {/* Selected Node Card */}
        {selectedNode ? (
          <div style={cardStyle}>
            <h3 style={subHeaderStyle}>Selected node</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Title</label>
              <input
                style={inputStyle}
                value={selectedNode.data.label}
                onChange={(e) => updateNodeData('label', e.target.value)}
                placeholder="Enter title..."
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, height: '80px', resize: 'none' }}
                value={selectedNode.data.description}
                onChange={(e) => updateNodeData('description', e.target.value)}
                placeholder="Enter description..."
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Connected nodes</label>
              <div>
                {edges
                  .filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id)
                  .map(edge => {
                    const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                    const otherNode = nodes.find(n => n.id === otherId);
                    return otherNode ? (
                      <button
                        key={otherId}
                        style={{ ...secondaryBtnStyle, marginBottom: '4px', width: '100%', textAlign: 'left' }}
                        onClick={() => {
                          setSelectedNode(otherNode);
                          setHighlightedNodeId(otherId);
                        }}
                      >
                        {otherNode.data.label}
                      </button>
                    ) : null;
                  })}
                {edges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id).length === 0 && (
                  <div style={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic' }}>No connections</div>
                )}
              </div>
            </div>

            {/* Card Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
              <button onClick={deleteSelectedNode} style={{ ...destructiveBtnStyle, color: '#EF4444' }}>Delete</button>
              <button onClick={() => setShowConfirmClear(true)} style={{ ...destructiveBtnStyle, color: '#EF4444' }}>Clear all</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', padding: '40px 20px' }}>
            Click on node to view details.
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
          {status}
        </div>

        <input 
          ref={fileInputRef} 
          type="file" 
          accept="audio/*"
          onChange={onAudioSelected} 
          style={{ display: 'none' }} 
        />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes.map(node => {
            if (!highlightedNodeId) {
              return node;
            }
            
            if (node.id === highlightedNodeId) {
              return {
                ...node,
                data: { ...node.data, isHighlighted: true, isFaded: false }
              };
            }
            
            const isConnected = edges.some(edge => 
              (edge.source === highlightedNodeId && edge.target === node.id) ||
              (edge.target === highlightedNodeId && edge.source === node.id)
            );
            
            if (isConnected) {
              return {
                ...node,
                data: { ...node.data, isHighlighted: false, isFaded: false }
              };
            }
            
            return {
              ...node,
              data: { ...node.data, isHighlighted: false, isFaded: true }
            };
          })}
          edges={edges.map(edge => {
            if (!highlightedNodeId) {
              return edge;
            }
            
            const isConnected = edge.source === highlightedNodeId || edge.target === highlightedNodeId;
            
            return {
              ...edge,
              style: {
                ...edge.style,
                opacity: isConnected ? 1 : 0.2,
              }
            };
          })}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, minZoom: 0.2, maxZoom: 0.8 }}
          minZoom={0.1}
          maxZoom={1.2}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: 'arrowclosed',
              color: '#94a3b8',
              width: 18,
              height: 18,
            },
          }}
        >
          <Background 
            color="rgba(0, 0, 0, 0.03)" 
            gap={32} 
            size={0.5}
            style={{ background: 'transparent' }}
          />
          <Controls 
            style={{ 
              background: 'rgba(255, 255, 255, 0.9)', 
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '10px',
              backdropFilter: 'blur(10px)',
            }}
          />
        </ReactFlow>
      </div>

      {/* Confirm Clear Modal */}
      {showConfirmClear && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <p style={{ marginBottom: '20px', color: '#111827', fontSize: '16px' }}>Clear the entire mind map?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmClear(false)} style={secondaryBtnStyle}>Cancel</button>
              <button onClick={() => { clearCanvas(); setShowConfirmClear(false); }} style={{ ...destructiveBtnStyle, background: '#EF4444', color: 'white', padding: '8px 16px' }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const sidebarStyle = { 
  width: 340, 
  padding: '20px', 
  background: '#FAFAFA', 
  color: '#111827', 
  display: 'flex', 
  flexDirection: 'column',
  minHeight: '100vh',
  borderRight: '1px solid #E5E7EB',
  boxShadow: 'inset -1px 0 0 #E5E7EB',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const cardStyle = {
  background: 'white',
  border: '1px solid #E5E7EB',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '16px',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const primaryBtnStyle = {
  background: '#3B82F6',
  color: 'white',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  height: '32px',
  transition: 'background-color 0.2s ease',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const secondaryBtnStyle = {
  background: 'white',
  color: '#111827',
  border: '1px solid #E5E7EB',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  height: '32px',
  transition: 'border-color 0.2s ease, background-color 0.2s ease',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const destructiveBtnStyle = {
  background: 'transparent',
  color: '#6B7280',
  border: 'none',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'color 0.2s ease',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const labelStyle = {
  fontSize: '12px',
  color: '#6B7280',
  fontWeight: '500',
  marginBottom: '4px',
  display: 'block',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const subHeaderStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '12px',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  background: 'white',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '400px',
  width: '90%',
  textAlign: 'center',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const btnStyle = { 
  padding: '10px 0', 
  borderRadius: '1px', 
  border: 'none', 
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  background: 'transparent', 
  color: '#5e709b', 
  cursor: 'pointer', 
  fontWeight: '400', 
  fontSize: '15px',
  transition: 'color 0.2s ease',
  textAlign: 'left',
  display: 'block',
  width: '100%',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const infoPanelStyle = { 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '20px',
  width: '100%',
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};

const inputStyle = { 
  background: 'white', 
  border: '1px solid #E5E7EB', 
  color: '#111827', 
  padding: '8px 12px', 
  borderRadius: '8px', 
  fontSize: '14px', 
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  width: '100%',
  boxSizing: 'border-box',
  ':focus': { borderColor: '#3B82F6', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)' },
  fontFamily: 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif',
};
