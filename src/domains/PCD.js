import * as THREE from "three";

export default class PCD {
  constructor(name) {
    this.name = name;
    this.visible = true; // 가시성
    this.size = 1; // 기본 포인트 크기
    this.color = new THREE.Color(0xffffff); // 기본 색상 (흰색)

    // Transform Properties
    this._location = new THREE.Vector3(0, 0, 0);
    this._rotation = new THREE.Euler(0, 0, 0, 'XYZ');
    this._scale = new THREE.Vector3(1, 1, 1);

    // Parent-Child Relationships
    this.parent = null;
    this.children = [];

    // Transform Matrices
    this.matrix_local = new THREE.Matrix4();
    this.matrix_world = new THREE.Matrix4();

    // Three.js Points Object
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: this.size,
      color: this.color,
      transparent: true,
      opacity: 1,
    });
    this.points = new THREE.Points(this.geometry, this.material);

    // Rotation state
    this.rotationAxis = new THREE.Vector3(0, 1, 0); // Default: Y-axis
    this.rotationSpeed = 0; // Default: No rotation

    // Update matrix_local on initialization
    this.updateLocalTransform();
  }

  // continous rotaiton property
  setRotation(axis, speed) {
    this.rotationAxis.copy(axis);
    this.rotationSpeed = speed;
  }

  // Disable rotation (set speed to 0)
  clearRotation() {
    this.rotationAxis.set(0, 0, 0); // Clear axis (optional)
    this.rotationSpeed = 0;
  }

  updateRotation(deltaTime = 0.01) {
    if (this.rotationSpeed !== 0) {
      const angle = this.rotationSpeed * deltaTime;
      const quaternion = new THREE.Quaternion().setFromAxisAngle(this.rotationAxis, angle);
      this._rotation.setFromQuaternion(quaternion); // Euler 업데이트
      this.updateLocalTransform();
      this.updateWorldTransform();
    }
  }

  // Location
  get location() {
    return this._location;
  }

  set location(value) {
    this._location.copy(value);
    this.updateLocalTransform();
    this.updateWorldTransform(); // Propagate to children
  }

  // Rotation
  get rotation() {
    return this._rotation;
  }

  set rotation(value) {
    this._rotation.copy(value);
    this.updateLocalTransform();
    this.updateWorldTransform(); // Propagate to children
  }

  // Scale
  get scale() {
    return this._scale;
  }

  set scale(value) {
    this._scale.copy(value);
    this.updateLocalTransform();
    this.updateWorldTransform(); // Propagate to children
  }

  // Update Local Transform
  updateLocalTransform() {
    this.matrix_local.compose(
      this._location,
      new THREE.Quaternion().setFromEuler(this._rotation),
      this._scale
    );
  }

  // Update World Transform
  updateWorldTransform() {
    if (this.parent) {
      this.matrix_world.multiplyMatrices(this.parent.matrix_world, this.matrix_local);
    } else {
      this.matrix_world.copy(this.matrix_local);
    }

    // Propagate to children
    for (const child of this.children) {
      child.updateWorldTransform();
    }
  }

  // Parent Management
  setParent(parent) {
    if (this.parent) {
      const index = this.parent.children.indexOf(this);
      if (index !== -1) {
        this.parent.children.splice(index, 1);
      }
    }

    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }

    // Update transforms
    this.updateWorldTransform();
  }

  addChild(child) {
    child.setParent(this);
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      child.updateWorldTransform();
    }
  }

  // Points Management
  addPoints(pointArray) {
    const positions = this.geometry.attributes.position
      ? Array.from(this.geometry.attributes.position.array)
      : [];
    const colors = this.geometry.attributes.color
      ? Array.from(this.geometry.attributes.color.array)
      : [];

    pointArray.forEach(([x, y, z, color]) => {
      positions.push(x, y, z);

      const r = ((color >> 16) & 255) / 255;
      const g = ((color >> 8) & 255) / 255;
      const b = (color & 255) / 255;
      colors.push(r, g, b);
    });

    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  getPoints() {
    return this.points;
}

  removePointsByIndices(indices) {
    if (!Array.isArray(indices)) {
      throw new Error("Indices must be provided as an array.");
    }
  
    const positions = Array.from(this.geometry.attributes.position.array);
    const colors = Array.from(this.geometry.attributes.color.array);
  
    // 중복 제거 및 내림차순 정렬 (뒤에서부터 삭제해야 인덱스가 꼬이지 않음)
    const uniqueSortedIndices = [...new Set(indices)].sort((a, b) => b - a);
  
    uniqueSortedIndices.forEach((index) => {
      const startIdx = index * 3; // 각 포인트는 3개의 좌표(x, y, z)로 구성
      if (startIdx < positions.length) {
        positions.splice(startIdx, 3);
        colors.splice(startIdx, 3);
      }
    });
  
    // Geometry 업데이트
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );
  
    // Three.js에서 변경 사항 반영
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
  
    // 가시성 설정
    setVisibility(isVisible) {
      this.visible = isVisible;
      this.points.visible = isVisible; // Three.js Mesh에 적용
    }
  
    toggleVisibility() {
      this.setVisibility(!this.visible);
    }
  
    // 크기 설정
    setSize(size) {
      this.size = size;
      this.material.size = size; // Three.js Material에 적용
      this.material.needsUpdate = true; // 업데이트 반영
    }
  
    // 색상 설정
    setColor(color) {
      this.color.set(color); // Three.js Color로 설정
      this.material.color.set(color); // Three.js Material에 적용
      this.material.needsUpdate = true; // 업데이트 반영
    }

}
