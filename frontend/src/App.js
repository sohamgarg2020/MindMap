import React from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  {
    id: 'C1',
    data: { label: 'Gradient Descent' },
    position: { x: 0, y: 0 },
  },
  {
    id: 'C2',
    data: { label: 'Convexity Assumptions' },
    position: { x: 250, y: -100 },
  },
  {
    id: 'C3',
    data: { label: 'Learning Rate' },
    position: { x: 250, y: 100 },
  },
];

const initialEdges = [
  {
    id: 'e1',
    source: 'C1',
    target: 'C2',
    label: 'depends_on',
  },
  {
    id: 'e2',
    source: 'C1',
    target: 'C3',
    label: 'depends_on',
  },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = (params) =>
    setEdges((eds) => addEdge(params, eds));

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
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
