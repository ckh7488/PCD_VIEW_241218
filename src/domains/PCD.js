// src/domains/PCD.js
import * as THREE from "three";

export default class PCD {
  constructor(name) {
    this.name = name;
    this.visible = true;
    this.size = 1;
    this.color = new THREE.Color(0xffffff);

    // Three.js Points
    this.geometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.Float32BufferAttribute([], 3);
    positionAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", positionAttr);

    const colorAttr = new THREE.Float32BufferAttribute([], 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("color", colorAttr);

    this.material = new THREE.PointsMaterial({
      size: this.size,
      color: this.color,
      transparent: true,
      opacity: 1,
      vertexColors: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = this.name;

    // 통합 Modifier 스택
    // - { transformation: { matrix: THREE.Matrix4 } }
    // - { rotation: { axisPos, axisDir, speed } }
    this.modifiers = [];

    // 기본 상태, 최종 누적 상태
    this.baseMatrix = new THREE.Matrix4().identity();
    this.currentMatrix = new THREE.Matrix4().identity();
  }

  /**
   * 통합 Modifier
   */
  addModifier(modifier) {
    this.modifiers.push(modifier);
  }

  removeModifier(index) {
    if (index >= 0 && index < this.modifiers.length) {
      this.modifiers.splice(index, 1);
    }
  }

  clearModifiers() {
    this.modifiers = [];
  }

  /**
   * applyModifiers():
   *  1) baseMatrix에서 시작
   *  2) transformation -> multiply
   *  3) rotation -> accumAngle 이용해 축 회전 매트릭스 곱
   *  4) 최종 행렬 currentMatrix로 저장
   *  5) Three.js Points에 반영(position, quaternion, scale)
   */
  applyModifiers() {
    let resultMatrix = this.baseMatrix.clone();

    for (const mod of this.modifiers) {
      if (mod.transformation) {
        // 행렬 그대로 누적
        resultMatrix.multiply(mod.transformation.matrix);
      } else if (mod.rotation) {
        const { axisPos, axisDir, accumAngle } = mod.rotation;
        if (!axisDir) continue;

        // (pivot -> 회전 -> pivot 복원)
        const pivotT = new THREE.Matrix4().makeTranslation(-axisPos.x, -axisPos.y, -axisPos.z);
        const pivotTInv = new THREE.Matrix4().makeTranslation(axisPos.x, axisPos.y, axisPos.z);
        const rotMat = new THREE.Matrix4().makeRotationAxis(axisDir, accumAngle || 0);

        resultMatrix = pivotTInv.clone().multiply(rotMat).multiply(pivotT).multiply(resultMatrix);
      }
    }

    this.currentMatrix.copy(resultMatrix);

    // Decompose to position/quaternion/scale
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    this.currentMatrix.decompose(position, quaternion, scale);

    this.points.position.copy(position);
    this.points.quaternion.copy(quaternion);
    this.points.scale.copy(scale);
  }

 /**
   * updateRotation(deltaTime):
   *  - rotation Modifier의 accumAngle += speed * deltaTime
   *  - "직접 points 수정"은 하지 않음(누적각도만 갱신)
   */
 updateRotation(deltaTime = 0.016) {
    for (const mod of this.modifiers) {
      if (!mod.rotation) continue;
      const r = mod.rotation;
      if (r.speed === 0) continue;

      r.accumAngle = (r.accumAngle || 0) + r.speed * deltaTime;
    }
  }

  // 회전 축 관련 Helper
  addRotationAxis(axisPos, axisDir, speed) {
    this.modifiers.push({
      rotation: {
        axisPos: axisPos.clone(),
        axisDir: axisDir.clone().normalize(),
        speed,
        accumAngle: 0, // 초기에 0
      },
    });
  }

  removeRotationAxis(index) {
    if (index < 0 || index >= this.modifiers.length) return;
    const mod = this.modifiers[index];
    if (!mod.rotation) return;
    this.removeModifier(index);
  }

  updateRotationAxis(index, axisPos, axisDir, speed) {
    if (index < 0 || index >= this.modifiers.length) return;
    const mod = this.modifiers[index];
    if (!mod.rotation) return;
    mod.rotation.axisPos = axisPos.clone();
    mod.rotation.axisDir = axisDir.clone().normalize();
    mod.rotation.speed = speed;
    // accumAngle은 기존값 유지
  }

  getRotationAxes() {
    return this.modifiers
      .map((mod, i) => {
        if (mod.rotation) {
          return {
            index: i,
            axisPos: mod.rotation.axisPos.clone(),
            axisDir: mod.rotation.axisDir.clone(),
            speed: mod.rotation.speed,
            accumAngle: mod.rotation.accumAngle || 0,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  /**
   * 점군 추가/삭제/조회 등
   */
  addPoints(pointArray) {
    const positions = Array.from(this.geometry.attributes.position.array);
    const colors = Array.from(this.geometry.attributes.color.array);

    pointArray.forEach(([x, y, z, color]) => {
      positions.push(x, y, z);
      const r = ((color >> 16) & 255) / 255;
      const g = ((color >> 8) & 255) / 255;
      const b = (color & 255) / 255;
      colors.push(r, g, b);
    });

    const posAttr = new THREE.Float32BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", posAttr);

    const colAttr = new THREE.Float32BufferAttribute(colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("color", colAttr);

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

    const posAttr = new THREE.Float32BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", posAttr);

    const colAttr = new THREE.Float32BufferAttribute(colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("color", colAttr);

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  getPoints() {
    return this.points;
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
   * 크기
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
