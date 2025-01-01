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

    // DynamicDrawUsage로 설정해두면, 빈 속성이라도 이후 추가/삭제에 최적화됨
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
      vertexColors: true, // color Attribute를 사용하기 위해 활성화
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = name; // 씬에서 탐색 가능하도록 네임 태그

    // realtiem rotation 관련
    this.rotationData = []; // { axisPos: Vector3, axisDir: Vector3, speed: number }    // ?

    // Modifier 기능 추가
    // 기본 상태: Identity Matrix
    this.baseMatrix = new THREE.Matrix4().identity();
    this.modifiers = []; // [{ transformation: { matrix: Matrix4 } }, { rotation: { axisPos, axisDir, speed } }]
    // 현재 상태
    this.currentMatrix = new THREE.Matrix4().identity();
  }

  // Modifier 추가
  addModifier(modifier) {
    this.modifiers.push(modifier);
    this.applyModifiers(); // 상태 재계산
  }

  // Modifier 제거
  removeModifier(index) {
    if (index >= 0 && index < this.modifiers.length) {
      this.modifiers.splice(index, 1);
    }
    this.applyModifiers(); // 상태 재계산
  }

  // Modifier 스택을 순회하며 상태 계산
  applyModifiers() {
    let resultMatrix = this.baseMatrix.clone();
  
    this.modifiers.forEach((modifier) => {
      if (modifier.transformation) {
        // Transformation Modifier 적용
        resultMatrix.multiply(modifier.transformation.matrix);
      } else if (modifier.rotation) {
        // Modifier 회전 상태는 누적하지 않음 (실시간 회전은 별도로 처리)
      }
    });
  
    this.currentMatrix.copy(resultMatrix);
  
    // 상태를 Three.js Points 객체에 반영
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    this.currentMatrix.decompose(position, quaternion, scale);
  
    this.points.position.copy(position);
    this.points.quaternion.copy(quaternion);
    this.points.scale.copy(scale);
  }
  
  

  // 모든 Modifier 제거
  clearModifiers() {
    this.modifiers = [];
    this.applyModifiers(); // 기본 상태로 복원
  }


  /**
   * 회전 축 반환
   */
  getRotationAxes() {
    return this.rotationData.map((data) => ({
      axisPos: data.axisPos.clone(),
      axisDir: data.axisDir.clone(),
      speed: data.speed,
    }));
  }
  
  // **새로운 회전 축 업데이트 메서드**
  updateRotationAxis(index, axisPos, axisDir, speed) {
    if (index < 0 || index >= this.rotationData.length) {
      throw new Error("Invalid rotation axis index");
    }

    // 업데이트할 축 데이터 변경
    const rotationAxis = this.rotationData[index];
    rotationAxis.axisPos = axisPos.clone();
    rotationAxis.axisDir = axisDir.clone().normalize();
    rotationAxis.speed = speed;
  }

  /**
 * 회전 축 추가
 * @param {THREE.Vector3} axisPos - 축의 기준점
 * @param {THREE.Vector3} axisDir - 축의 방향 벡터
 * @param {number} speed - 회전 속도 (라디안/초)
 */
  addRotationAxis(axisPos, axisDir, speed) {
    this.rotationData.push({
      axisPos: axisPos.clone(),
      axisDir: axisDir.clone().normalize(),
      speed,
    });
  }

  /**
   * 특정 회전 축 제거
   * @param {number} index - 제거할 축의 인덱스
   */
  removeRotationAxis(index) {
    if (index >= 0 && index < this.rotationData.length) {
      this.rotationData.splice(index, 1);
    }
  }

  /**
   * 모든 회전 축 제거
   */
  clearRotation() {
    this.rotationData = [];
  }

  /**
   * 매 프레임 호출되어 누적 회전 반영
   */
  updateRotation(deltaTime = 0.016) {
    if (this.rotationData.length === 0) return;
  
    this.rotationData.forEach(({ axisPos, axisDir, speed }) => {
      if (speed === 0) return;
  
      // 각도 계산
      const angle = speed * deltaTime;
  
      // 회전 쿼터니언 생성
      const deltaQ = new THREE.Quaternion().setFromAxisAngle(axisDir, angle);
  
      // 중심을 기준으로 이동한 뒤 회전 적용
      const currentPos = this.points.position.clone();
      const relativePos = currentPos.sub(axisPos);
      relativePos.applyQuaternion(deltaQ);
      const newPos = axisPos.clone().add(relativePos);
  
      // 회전 적용
      this.points.position.copy(newPos);
      this.points.quaternion.multiply(deltaQ);
    });
  }
  

  /**
   * 포인트 추가
   * pointArray = [[x, y, z, color], [x,y,z,color], ...]
   * color는 0xRRGGBB 형태
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

    const posAttr = new THREE.Float32BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", posAttr);

    const colAttr = new THREE.Float32BufferAttribute(colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("color", colAttr);

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
