import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

export default function EditableNode({ data }) {
  const [label, setLabel] = useState(data.label);

  return (
    <div
      style={{
        padding: 10,
        border: '1px solid #777',
        borderRadius: 5,
        background: '#fff',
        minWidth: 150,
      }}
    >
      <Handle type="target" position={Position.Top} />

      <input
        value={label}
        onChange={(e) => {
          setLabel(e.target.value);
          data.onChange(e.target.value);
        }}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontSize: 14,
          textAlign: 'center',
        }}
      />

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
