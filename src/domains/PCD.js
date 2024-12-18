import * as THREE from "three";

export default class PCD {
  constructor(name) {
    this.name = name;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.1, // 초기 포인트 사이즈
      vertexColors: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.visible = true;

    // 회전 관련 속성
    this.originRotationAxis = new THREE.Vector3(0, 1, 0); // 월드 회전 축
    this.originRotationSpeed = 0; // 월드 회전 속도

    this.localRotationAxis = new THREE.Vector3(1, 0, 0); // 로컬 회전 축
    this.localRotationSpeed = 0; // 로컬 회전 속도
  }

  addPoints(pointArray) {
    if (!Array.isArray(pointArray)) {
      throw new Error("Point data must be provided as an array.");
    }

    const positions = this.geometry.attributes.position
      ? Array.from(this.geometry.attributes.position.array)
      : [];
    const colors = this.geometry.attributes.color
      ? Array.from(this.geometry.attributes.color.array)
      : [];

    for (let i = 0; i < pointArray.length; i += 4) {
      const [x, y, z, color] = [
        pointArray[i] || 0,
        pointArray[i + 1] || 0,
        pointArray[i + 2] || 0,
        pointArray[i + 3] || 0xffffff,
      ];

      positions.push(x, y, z);

      const r = ((color >> 16) & 255) / 255;
      const g = ((color >> 8) & 255) / 255;
      const b = (color & 255) / 255;
      colors.push(r, g, b);
    }

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

  removePointsByIndices(indices) {
    if (!Array.isArray(indices)) {
      throw new Error("Indices must be provided as an array.");
    }

    const positions = Array.from(this.geometry.attributes.position.array);
    const colors = Array.from(this.geometry.attributes.color.array);

    const uniqueSortedIndices = [...new Set(indices)].sort((a, b) => b - a);

    uniqueSortedIndices.forEach((index) => {
      const startIdx = index * 3;
      if (startIdx < positions.length) {
        positions.splice(startIdx, 3);
        colors.splice(startIdx, 3);
      }
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

  getSummary() {
    return {
      name: this.name,
      pointCount: this.geometry.attributes.position
        ? this.geometry.attributes.position.count
        : 0,
    };
  }

  getPoints() {
    return this.points;
  }

  setVisibility(isVisible) {
    this.visible = isVisible;
    this.points.visible = isVisible;
  }

  setAllPointsColor(color) {
    if (!this.geometry.attributes.color) return;
    const count = this.geometry.attributes.color.count;
    const colors = [];
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    for (let i = 0; i < count; i++) {
      colors.push(r, g, b);
    }

    this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.geometry.attributes.color.needsUpdate = true;
  }

  // 월드 좌표를 기준으로 회전 축과 속도 설정
  setOriginRotation(axis, speed) {
    this.originRotationAxis = axis.clone().normalize(); // 축 정규화
    this.originRotationSpeed = speed;
  }

  // 로컬 좌표를 기준으로 회전 축과 속도 설정
  setLocalRotation(axis, speed) {
    this.localRotationAxis = axis.clone().normalize(); // 축 정규화
    this.localRotationSpeed = speed;
  }

  // 포인트 사이즈 변경
  setPointSize(size) {
    if (size <= 0) {
      throw new Error("Point size must be greater than 0.");
    }
    this.material.size = size; // 포인트 사이즈 업데이트
  }
}
