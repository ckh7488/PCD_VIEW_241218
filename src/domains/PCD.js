// src/domains/PCD.js
import * as THREE from "three";

/**
 * PCD 클래스
 * - Three.js의 position, rotation, scale을 직접 사용하는 버전
 */
export default class PCD {
  constructor(name) {
    this.name = name;
    this.visible = true;
    this.size = 1;
    this.color = new THREE.Color(0xffffff);

    // Three.js Points Object
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: this.size,
      color: this.color,
      transparent: true,
      opacity: 1,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = name; // 씬에서 탐색 가능하도록 네임 태그

    // 회전 관련
    this.rotationAxis = new THREE.Vector3(0, 1, 0);
    this.rotationSpeed = 0;
  }

  /**
   * 지속 회전(continuous rotation) 설정
   */
  setRotation(axis, speed) {
    this.rotationAxis.copy(axis);
    this.rotationSpeed = speed;
  }

  /**
   * 회전 속도/축 제거
   */
  clearRotation() {
    this.rotationAxis.set(0, 0, 0);
    this.rotationSpeed = 0;
  }

  /**
   * 매 프레임 호출되어 누적 회전 반영
   */
  updateRotation(deltaTime = 0.016) {
    if (this.rotationSpeed !== 0) {
      const angle = this.rotationSpeed * deltaTime;
      const deltaQ = new THREE.Quaternion().setFromAxisAngle(this.rotationAxis, angle);
      this.points.quaternion.multiply(deltaQ);
    }
  }

  /**
   * 포인트 추가
   * pointArray = [[x, y, z, color], [x,y,z,color], ...]
   */
  addPoints(pointArray) {
    const positions = this.geometry.attributes.position
      ? Array.from(this.geometry.attributes.position.array)
      : [];
    const colors = this.geometry.attributes.color
      ? Array.from(this.geometry.attributes.color.array)
      : [];

    pointArray.forEach(([x, y, z, color]) => {
      positions.push(x, y, z);
      // color는 0xRRGGBB 형태로 들어온다고 가정
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

  /**
   * 포인트들(Three.js Points) 반환
   */
  getPoints() {
    return this.points;
  }

  /**
   * 인덱스를 이용해 특정 포인트 제거
   */
  removePointsByIndices(indices) {
    if (!Array.isArray(indices)) {
      throw new Error("Indices must be provided as an array.");
    }

    const positions = Array.from(this.geometry.attributes.position.array);
    const colors = Array.from(this.geometry.attributes.color.array);

    // 중복 제거 후 내림차순 정렬
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

  /**
   * 가시성
   */
  setVisibility(isVisible) {
    this.visible = isVisible;
    this.points.visible = isVisible;
  }

  toggleVisibility() {
    this.setVisibility(!this.visible);
  }

  /**
   * 포인트 크기
   */
  setSize(size) {
    this.size = size;
    this.material.size = size;
    this.material.needsUpdate = true;
  }

  /**
   * 색상
   */
  setColor(color) {
    this.color.set(color);
    this.material.color.set(color);
    this.material.needsUpdate = true;
  }
}
