// src/components/WebViewer/RotationEditor.jsx
import React, { useState, useEffect } from "react";
import * as THREE from "three";

export default function RotationEditor({ fileName, index, rotation, onChange }) {
  const [pivot, setPivot] = useState([rotation.axisPos.x, rotation.axisPos.y, rotation.axisPos.z]);
  const [axis, setAxis] = useState([rotation.axisDir.x, rotation.axisDir.y, rotation.axisDir.z]);
  const [speed, setSpeed] = useState(rotation.speed);

  useEffect(() => {
    setPivot([rotation.axisPos.x, rotation.axisPos.y, rotation.axisPos.z]);
    setAxis([rotation.axisDir.x, rotation.axisDir.y, rotation.axisDir.z]);
    setSpeed(rotation.speed);
  }, [rotation.axisPos, rotation.axisDir, rotation.speed]);

  const handleUpdate = () => {
    const px = parseFloat(pivot[0]);
    const py = parseFloat(pivot[1]);
    const pz = parseFloat(pivot[2]);

    let ax = parseFloat(axis[0]);
    let ay = parseFloat(axis[1]);
    let az = parseFloat(axis[2]);
    const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
    ax /= len;
    ay /= len;
    az /= len;

    const sp = parseFloat(speed) || 0;

    onChange(fileName, index, {
      rotation: {
        axisPos: new THREE.Vector3(px, py, pz),
        axisDir: new THREE.Vector3(ax, ay, az),
        speed: sp,
        accumAngle: rotation.accumAngle || 0,
      },
    });
  };

  return (
    <div>
      <strong>Rotation</strong>
      <div>
        <label>Pivot (X,Y,Z): </label>
        <input
          type="number"
          step="0.1"
          value={pivot[0]}
          onChange={(e) => setPivot([e.target.value, pivot[1], pivot[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="0.1"
          value={pivot[1]}
          onChange={(e) => setPivot([pivot[0], e.target.value, pivot[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="0.1"
          value={pivot[2]}
          onChange={(e) => setPivot([pivot[0], pivot[1], e.target.value])}
          onBlur={handleUpdate}
        />
      </div>
      <div>
        <label>Axis (X,Y,Z): </label>
        <input
          type="number"
          step="0.1"
          value={axis[0]}
          onChange={(e) => setAxis([e.target.value, axis[1], axis[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="0.1"
          value={axis[1]}
          onChange={(e) => setAxis([axis[0], e.target.value, axis[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="0.1"
          value={axis[2]}
          onChange={(e) => setAxis([axis[0], axis[1], e.target.value])}
          onBlur={handleUpdate}
        />
      </div>
      <div>
        <label>Speed: </label>
        <input
          type="number"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(e.target.value)}
          onBlur={handleUpdate}
        />
      </div>
    </div>
  );
}
