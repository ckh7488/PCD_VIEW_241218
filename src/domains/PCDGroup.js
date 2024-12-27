import * as THREE from "three";
import PCD from "./PCD";

export default class PCDGroup extends PCD {
  constructor(name) {
    super(name); // PCD 기본 속성 상속
    this.children = []; // 자식 PCD 또는 PCDGroup 리스트
  }

  // Update rotation for the group and its children
  updateRotation(deltaTime=0.01) {
    super.updateRotation(deltaTime); // Apply group-level rotation

    // Update rotation for all children
    this.children.forEach((child) => {
      if (child.updateRotation) {
        child.updateRotation(deltaTime);
      }
    });
  }

  // PCD 추가
  addPCD(pcd) {
    pcd.setParent(this); // 부모 설정
    this.children.push(pcd);
  }

  // PCD 제거
  removePCD(pcd) {
    const index = this.children.indexOf(pcd);
    if (index !== -1) {
      this.children.splice(index, 1);
      pcd.setParent(null); // 부모 제거
    }
  }

  // 모든 자식 PCD 반환
  getAll() {
    return this.children;
  }

  // 로컬 변환 업데이트
  updateLocalTransform() {
    super.updateLocalTransform(); // 부모 클래스의 로컬 변환 업데이트
    this.updateWorldTransform(); // 자식으로 전파
  }

  // 글로벌 변환 업데이트
  updateWorldTransform() {
    if (this.parent) {
      // 부모의 월드 변환 매트릭스를 결합
      this.matrix_world.multiplyMatrices(this.parent.matrix_world, this.matrix_local);
    } else {
      this.matrix_world.copy(this.matrix_local);
    }
  
    // 자식에게 월드 변환 전파
    for (const child of this.children) {
      child.updateWorldTransform();
    }
  }
  

  // 가시성 설정
  setVisibility(isVisible) {
    this.children.forEach((child) => {
      if (child instanceof PCDGroup) {
        child.setVisibility(isVisible); // 재귀적으로 적용
      } else {
        child.setVisibility(isVisible);
      }
    });
  }

  // 크기 설정
  setSize(size) {
    this.children.forEach((child) => {
      if (child instanceof PCDGroup) {
        child.setSize(size); // 재귀적으로 적용
      } else {
        child.setSize(size);
      }
    });
  }

  // 색상 설정
  setColor(color) {
    this.children.forEach((child) => {
      if (child instanceof PCDGroup) {
        child.setColor(color); // 재귀적으로 적용
      } else {
        child.setColor(color);
      }
    });
  }
}
