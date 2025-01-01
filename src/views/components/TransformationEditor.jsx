// src/components/WebViewer/TransformationEditor.jsx
import React, { useState, useEffect } from "react";
import * as THREE from "three";

export default function TransformationEditor({
  fileName,
  index,
  transformation,
  onChange,
}) {
  // transformation.matrix -> P/R/S 분해
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  transformation.matrix.decompose(pos, quat, scl);

  const euler = new THREE.Euler().setFromQuaternion(quat, "XYZ");
  const [position, setPosition] = useState([pos.x, pos.y, pos.z]);
  const [rotation, setRotation] = useState([
    THREE.MathUtils.radToDeg(euler.x),
    THREE.MathUtils.radToDeg(euler.y),
    THREE.MathUtils.radToDeg(euler.z),
  ]);
  const [scale, setScale] = useState([scl.x, scl.y, scl.z]);

  useEffect(() => {
    // 부모로부터 업데이트된 행렬이 오면, 다시 분해
    transformation.matrix.decompose(pos, quat, scl);
    const e = new THREE.Euler().setFromQuaternion(quat, "XYZ");
    setPosition([pos.x, pos.y, pos.z]);
    setRotation([
      THREE.MathUtils.radToDeg(e.x),
      THREE.MathUtils.radToDeg(e.y),
      THREE.MathUtils.radToDeg(e.z),
    ]);
    setScale([scl.x, scl.y, scl.z]);
    // eslint-disable-next-line
  }, [transformation.matrix]);

  const handleUpdate = () => {
    const px = parseFloat(position[0]);
    const py = parseFloat(position[1]);
    const pz = parseFloat(position[2]);

    const rx = THREE.MathUtils.degToRad(parseFloat(rotation[0]));
    const ry = THREE.MathUtils.degToRad(parseFloat(rotation[1]));
    const rz = THREE.MathUtils.degToRad(parseFloat(rotation[2]));

    const sx = parseFloat(scale[0]) || 1;
    const sy = parseFloat(scale[1]) || 1;
    const sz = parseFloat(scale[2]) || 1;

    const newPos = new THREE.Vector3(px, py, pz);
    const newEuler = new THREE.Euler(rx, ry, rz, "XYZ");
    const newQuat = new THREE.Quaternion().setFromEuler(newEuler);

    const newMat = new THREE.Matrix4().compose(newPos, newQuat, new THREE.Vector3(sx, sy, sz));

    onChange(fileName, index, { transformation: { matrix: newMat } });
  };

  return (
    <div>
      <strong>Transformation</strong>
      <div>
        <label>Position: </label>
        <input
          type="number"
          step="0.1"
          value={position[0]}
          onChange={(e) => setPosition([e.target.value, position[1], position[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="0.1"
          value={position[1]}
          onChange={(e) => setPosition([position[0], e.target.value, position[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="0.1"
          value={position[2]}
          onChange={(e) => setPosition([position[0], position[1], e.target.value])}
          onBlur={handleUpdate}
        />
      </div>
      <div>
        <label>Rotation(deg): </label>
        <input
          type="number"
          step="1"
          value={rotation[0]}
          onChange={(e) => setRotation([e.target.value, rotation[1], rotation[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="1"
          value={rotation[1]}
          onChange={(e) => setRotation([rotation[0], e.target.value, rotation[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="1"
          value={rotation[2]}
          onChange={(e) => setRotation([rotation[0], rotation[1], e.target.value])}
          onBlur={handleUpdate}
        />
      </div>
      <div>
        <label>Scale: </label>
        <input
          type="number"
          step="0.1"
          value={scale[0]}
          onChange={(e) => setScale([e.target.value, scale[1], scale[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="0.1"
          value={scale[1]}
          onChange={(e) => setScale([scale[0], e.target.value, scale[2]])}
          onBlur={handleUpdate}
        />
        <input
          type="number"
          step="0.1"
          value={scale[2]}
          onChange={(e) => setScale([scale[0], scale[1], e.target.value])}
          onBlur={handleUpdate}
        />
      </div>
    </div>
  );
}
