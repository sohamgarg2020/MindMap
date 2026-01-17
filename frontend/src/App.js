import React, { useState } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

import EditableNode from './EditableNode';

const nodeTypes = {
  editable: EditableNode,
};

export default function App() {
  const [nodes, setNodes] = useState([
    {
      id: 'C1',
      type: 'editable',
      data: {
        label: 'Gradient Descent',
        onChange: (val) =>
          setNodes((nds) =>
            nds.map((n) =>
              n.id === 'C1' ? { ...n, data: { ...n.data, label: val } } : n
            )
          ),
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'C2',
      type: 'editable',
      data: {
        label: 'Convexity Assumptions',
        onChange: (val) =>
          setNodes((nds) =>
            nds.map((n) =>
              n.id === 'C2' ? { ...n, data: { ...n.data, label: val } } : n
            )
          ),
      },
      position: { x: 250, y: -100 },
    },
    {
      id: 'C3',
      type: 'editable',
      data: {
        label: 'Learning Rate',
        onChange: (val) =>
          setNodes((nds) =>
            nds.map((n) =>
              n.id === 'C3' ? { ...n, data: { ...n.data, label: val } } : n
            )
          ),
      },
      position: { x: 250, y: 100 },
    },
  ]);

  const edges = [
    { id: 'e1', source: 'C1', target: 'C2', label: 'depends_on' },
    { id: 'e2', source: 'C1', target: 'C3', label: 'depends_on' },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
