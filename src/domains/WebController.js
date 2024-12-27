// src/domains/WebController.js
import { WebRenderer } from "./WebRenderer";
import * as THREE from "three";
import PCD from "./PCD";

export class WebController {
  constructor(container) {
    this.renderer = new WebRenderer(container);
    this.PCDs = new Map();            // { name: PCD instance }
    this.selectedPCDs = new Set();    // 현재 선택된 PCD 이름들
    this.selectionHelpers = {};       // BoxHelper나 AxesHelper 등

    this.transformationMode = null;   // "translate" | "scale" | "rotate" | null
    this.originalTransforms = [];     // 변환 시작 시점의 position/scale/rotation 정보
    this.mouseStart = null;
  }

  init(controllerType = "orbit") {
    this.renderer.init(controllerType);
    this.renderer.animate();
  }

  /**
   * PCD 등록 (씬 + 내부맵)
   */
  addPCD(name, pcd) {
    this.PCDs.set(name, pcd);
    // 씬에 Points 등록
    this.renderer.addPCD(name, pcd.getPoints());
  }

  /**
   * (필요하다면) c 키로 회전 축/속도 설정
   */
  setRotation(pcdNames, axis, speed) {
    pcdNames.forEach((pcdName) => {
      const pcd = this.PCDs.get(pcdName);
      if (pcd && pcd instanceof PCD) {
        pcd.setRotation(axis, speed);
        // renderer에 등록되어 있어야 매 프레임 updateRotation()이 호출됨
        if (!this.renderer.CRobjects.has(pcdName)) {
          this.renderer.registerObject(pcdName, pcd);
        }
      } else {
        console.warn(`Object ${pcdName} not found or is not a valid PCD instance.`);
      }
    });
  }

  unregisterObject(name) {
    this.renderer.unregisterObject(name);
  }

  toggleAxis() {
    this.renderer.toggleAxis(this.selectedPCDs);
  }

  /**
   * 선택/하이라이트
   */
  highlightPCD(name, points) {
    const box = new THREE.BoxHelper(points, 0xffff00);
    box.material.transparent = true;
    box.material.opacity = 0.5;
    this.renderer.addObject(box);
    this.selectionHelpers[name] = box;
  }

  removeHighlight(name) {
    if (this.selectionHelpers[name]) {
      this.renderer.scene.remove(this.selectionHelpers[name]);
      delete this.selectionHelpers[name];
    }
  }

  clearSelection() {
    this.selectedPCDs.forEach((name) => this.removeHighlight(name));
    this.selectedPCDs.clear();
  }

  toggleSelection(name, points, isMultiSelect = false, isExclusiveSelect = false) {
    if (isExclusiveSelect) {
      this.clearSelection();
    }

    if (this.selectedPCDs.has(name)) {
      this.selectedPCDs.delete(name);
      this.removeHighlight(name);
    } else {
      if (!isMultiSelect) {
        this.clearSelection();
      }
      this.selectedPCDs.add(name);
      this.highlightPCD(name, points);
    }
  }

  handlePCDSelection(event, isMultiSelect = false, isExclusiveSelect = false) {
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.renderer.camera);
    const intersects = raycaster.intersectObjects(this.renderer.intersectableObjects, true);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      const { name } = selectedObject;
      if (name) {
        this.toggleSelection(name, selectedObject, isMultiSelect, isExclusiveSelect);
      }
    }
    // 선택 목록 동기화
  }

  /**
   * 변환 모드 확인
   */
  getTransformationMode() {
    return this.transformationMode;
  }

  /**
   * 변환 시작 (G/S/R)
   */
  startTransformation(mode = "translate") {
    if (this.selectedPCDs.size === 0) {
      console.warn("No PCD selected. Cannot start transformation.");
      return false;
    }

    this.transformationMode = mode;
    console.log("Starting transformation. Mode:", this.transformationMode);

    // 선택된 PCD들의 현재 position/scale/rotation을 저장
    this.originalTransforms = [...this.selectedPCDs]
      .map((name) => {
        const pcd = this.PCDs.get(name);
        if (!pcd) return null;
        const obj = pcd.points;
        return {
          name,
          pcd,
          position: obj.position.clone(),
          rotation: obj.rotation.clone(),      // Euler
          quaternion: obj.quaternion.clone(),  // Quaternion (대안)
          scale: obj.scale.clone(),
        };
      })
      .filter(Boolean);

    return true;
  }

  /**
   * 변환 업데이트 (마우스 드래그)
   */
  updateTransformation(mouseDelta) {
    if (!this.transformationMode || !this.originalTransforms) {
      return;
    }

    switch (this.transformationMode) {
      case "translate": {
        const factor = mouseDelta.x * 100; // 예시로 x방향만 이동
        this.originalTransforms.forEach(({ pcd, position }) => {
          pcd.points.position.copy(position.clone().add(new THREE.Vector3(factor, 0, 0)));
        });
        break;
      }
      case "scale": {
        const factor = 1 + mouseDelta.x * 100;
        this.originalTransforms.forEach(({ pcd, scale }) => {
          pcd.points.scale.copy(scale.clone().multiplyScalar(factor));
        });
        break;
      }
      case "rotate": {
        const angle = mouseDelta.x * Math.PI;
        this.originalTransforms.forEach(({ pcd, rotation }) => {
          pcd.points.rotation.set(rotation.x, rotation.y + angle, rotation.z);
        });
        break;
      }
      default:
        break;
    }

    // BoxHelper 업데이트
    Object.values(this.selectionHelpers).forEach((helper) => {
      helper.update();
    });
  }

  /**
   * 변환 취소
   */
  cancelTransformation() {
    if (!this.transformationMode) {
      console.warn("No active transformation to cancel.");
      return;
    }
    console.log("Transformation canceled.");

    // 원 상태로 복원
    this.originalTransforms.forEach(({ pcd, position, scale, rotation, quaternion }) => {
      pcd.points.position.copy(position);
      pcd.points.scale.copy(scale);
      pcd.points.rotation.copy(rotation);
      pcd.points.quaternion.copy(quaternion);
    });

    this.transformationMode = null;
    this.originalTransforms = [];
    this.mouseStart = null;
  }

  /**
   * 변환 적용
   */
  applyTransformation() {
    if (!this.transformationMode) {
      return;
    }
    console.log("Transformation applied.");

    // 이미 scene 상에 적용된 상태이므로, 별도 조치 없이 클리어
    this.transformationMode = null;
    this.originalTransforms = [];
    this.mouseStart = null;
  }

  /**
   * 마우스 이벤트
   */
  handleMouseDown(event) {
    // 변환 모드일 때만 좌표 저장
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    this.mouseStart = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  handleMouseMove(event) {
    if (!this.transformationMode || !this.mouseStart) return;
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mouseCurrent = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    const mouseDelta = {
      x: mouseCurrent.x - this.mouseStart.x,
      y: mouseCurrent.y - this.mouseStart.y,
    };
    this.updateTransformation(mouseDelta);
  }

  handleMouseUp(fn) {
    // 변환 모드 중이었으면 적용
    if (this.transformationMode) {
      this.applyTransformation();
      fn(null); // 예시: React useState 등 외부로 모드 상태를 넘길 수도 있음
    }
  }

  /**
   * 리소스 정리
   */
  dispose() {
    this.clearSelection();
    this.renderer.dispose();
  }
}
