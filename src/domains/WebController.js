// src/domains/WebController.js
import * as THREE from "three";
import { WebRenderer } from "./WebRenderer";
import PCD from "./PCD";

/**
 * - G 키: translate (Blender식, 마우스 클릭으로 확정)
 * - R 키: rotate (이전엔 y축 고정이었는데, 이제 x/y/z 축 잠금 가능)
 * - X/Y/Z 키: 축 잠금 (translate/rotate 공통)
 * - 축 잠금 시, 씬에 3D 라인(LineHelper)을 표시
 */
export class WebController {
  constructor(container) {
    this.renderer = new WebRenderer(container);

    this.PCDs = new Map();
    this.selectedPCDs = new Set();
    this.selectionHelpers = {};

    // 상태 머신
    this.appState = "IDLE"; // "IDLE" | "TRANSFORM"
    this.transformationMode = null;  // "translate" | "rotate" | "scale" | null
    this.transformationAxis = null;  // "x"|"y"|"z"|null
    this.originalTransforms = [];

    // Blender G식 이동
    this.movePlane = new THREE.Plane();
    this.moveLine = null;
    this.startIntersection = null;
    this.transformData = new Map(); // { pcdName -> offset }

    // rotate/scale용 마우스 delta
    this._mouseStart2D = null;

    // 축 표시 라인 (axis line helper)
    this.axisLineHelper = null;
  }

  init(controllerType = "orbit") {
    this.renderer.init(controllerType, this);
    this.renderer.animate();
  }

  switchControlType(newType) {
    this.renderer.setController(newType);
  }

  addPCD(name, pcd) {
    this.PCDs.set(name, pcd);
    this.renderer.addPCD(name, pcd.getPoints());
  }

  /**
   * 회전 축 추가
   */
  addRotationAxisToPCD(fileName, axisPos, axisDir, speed) {
    const pcd = this.PCDs.get(fileName);
    if (!pcd) {
      console.warn(`PCD "${fileName}" not found.`);
      return;
    }
  
    pcd.addRotationAxis(axisPos, axisDir, speed);
    this.renderer.addToRotatingList(pcd);
  }
  
  /**
   * 회전 축 제거
   */
  removeRotationAxisFromPCD(fileName, index) {
    const pcd = this.PCDs.get(fileName);
    if (!pcd) {
      console.warn(`PCD "${fileName}" not found.`);
      return;
    }
  
    pcd.removeRotationAxis(index);
  
    // 모든 축이 제거되면 회전 목록에서 제거
    if (pcd.rotationData.length === 0) {
      this.renderer.removeFromRotatingList(pcd);
    }
    
  }  

  /**
   * 예전: 회전 속도 (지속회전)
   */
  setRotation(pcdNames, axis, speed) {
    pcdNames.forEach((pcdName) => {
      const pcd = this.PCDs.get(pcdName);
      if (pcd && pcd instanceof PCD) {
        pcd.setRotation(axis, speed);
        if (!this.renderer.getObjectByName(pcdName)) {
          this.renderer.registerObject(pcdName, pcd);
        }
        if (speed !== 0) {
          this.renderer.addToRotatingList(pcd);
        } else {
          this.renderer.removeFromRotatingList(pcd);
        }
      }
    });
  }

  unregisterObject(name) {
    this.PCDs.delete(name);
    this.renderer.unregisterObject(name);
  }

  toggleAxis(objNames) {
    this.renderer.toggleAxis(objNames);
  }

  // 선택된 PCD 헬퍼 추가
  highlightPCD(name, points) {
    const box = new THREE.BoxHelper(points, 0xffff00);
    box.material.transparent = true;
    box.material.opacity = 0.5;
    this.renderer.addObject(box);
    this.selectionHelpers[name] = box;
  }

  // 선택된 PCD 헬퍼 제거
  removeHighlight(name) {
    if (this.selectionHelpers[name]) {
      this.renderer.scene.remove(this.selectionHelpers[name]);
      delete this.selectionHelpers[name];
    }
  }

  // 선택된 PCD 헬퍼 업데이트
  updateHighlights() {
    Object.entries(this.selectionHelpers).forEach(([name, boxHelper]) => {
      const pcd = this.PCDs.get(name);
      if (pcd && boxHelper) {
        boxHelper.update(); // BoxHelper를 최신 상태로 업데이트
      }
    });
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

    const visibleObjects = this.renderer.getVisibleObjects();
    const intersects = raycaster.intersectObjects(visibleObjects, true);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      const { name } = selectedObject;
      if (name) {
        this.toggleSelection(name, selectedObject, isMultiSelect, isExclusiveSelect);
      }
    }
  }

  getTransformationMode() {
    return this.transformationMode;
  }

  /**
   * blender G/R/S
   */
  startTransformation(mode = "translate") {
    if (this.appState === "TRANSFORM") {
      return false;
    }
    if (this.selectedPCDs.size === 0) {
      console.warn("No PCD selected. Cannot start transformation.");
      return false;
    }
    this.appState = "TRANSFORM";
    this.transformationMode = mode;
    this.transformationAxis = null;
    this.originalTransforms = [...this.selectedPCDs].map((name) => {
      const pcd = this.PCDs.get(name);
      return {
        name,
        pcd,
        position: pcd.points.position.clone(),
        rotation: pcd.points.rotation.clone(),
        quaternion: pcd.points.quaternion.clone(),
        scale: pcd.points.scale.clone(),
      };
    });

    console.log("Starting transform mode:", mode);

    if (mode === "translate") {
      this.setupPlaneOrLine(); // 즉시 plane(축없음) or line(축있음) 설정
    }
    // rotate/scale는 mouseMove에서 delta.x/y로 진행
    return true;
  }

  setTransformationAxis(axis) {
    if (this.appState !== "TRANSFORM") return;
    // translate/rotate 모두 축 잠금을 허용
    this.transformationAxis = axis;
    console.log(`Transform Axis changed to: ${axis}`);

    // 혹시나 axisLineHelper가 이미 있으면 제거
    this.removeAxisLineHelper();

    if (this.transformationMode === "translate") {
      // plane->line or line->plane
      this.setupPlaneOrLine();
    } else if (this.transformationMode === "rotate") {
      // 회전 축 잠금 -> y축 회전 대신 x/y/z 회전
      // 아래: just do nothing here. 실제 회전 로직에서 axis check
      // 시각적으로 축 라인도 표시해주자
      this.createAxisLineHelper(axis);
    }
  }

  /**
   * translate용 plane or line
   */
  setupPlaneOrLine() {
    this.startIntersection = null;
    this.moveLine = null;
    this.movePlane = new THREE.Plane();
    this.transformData.clear();

    // 축 라인 제거 후, 만약 축이 있으면 축 라인 표시
    this.removeAxisLineHelper();
    if (this.transformationAxis) {
      this.createAxisLineHelper(this.transformationAxis);
    }

    // 마우스좌표
    const { mx, my } = this._lastMousePos || { mx: 0.5, my: 0.5 };
    const mouseVec2 = new THREE.Vector2(mx * 2 - 1, -(my * 2 - 1));
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseVec2, this.renderer.camera);

    // 첫번째 PCD
    const firstName = this.selectedPCDs.values().next().value;
    if (!firstName) return;
    const firstPCD = this.PCDs.get(firstName);
    const objWorldPos = new THREE.Vector3().setFromMatrixPosition(firstPCD.points.matrixWorld);

    if (this.transformationAxis) {
      // line
      const axisDir = new THREE.Vector3();
      switch (this.transformationAxis) {
        case "x": axisDir.set(1, 0, 0); break;
        case "y": axisDir.set(0, 1, 0); break;
        case "z": axisDir.set(0, 0, 1); break;
        default: axisDir.set(0, 0, 0); break;
      }
      this.moveLine = new THREE.Ray(objWorldPos, axisDir);

      const isect = this.rayLineIntersect(raycaster.ray, this.moveLine);
      if (!isect) return;
      this.startIntersection = isect.clone();
    } else {
      // plane
      const camDir = new THREE.Vector3();
      this.renderer.camera.getWorldDirection(camDir);
      camDir.normalize();
      this.movePlane.setFromNormalAndCoplanarPoint(camDir, objWorldPos);

      const planeIsect = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(this.movePlane, planeIsect)) return;
      this.startIntersection = planeIsect.clone();
    }

    // offset
    for (const selName of this.selectedPCDs) {
      const wPos = new THREE.Vector3().setFromMatrixPosition(
        this.PCDs.get(selName).points.matrixWorld
      );
      const offset = wPos.clone().sub(this.startIntersection);
      this.transformData.set(selName, offset);
    }
  }

  /**
   * 라인헬퍼(3D 선) 추가: 축 방향 시각화
   */
  createAxisLineHelper(axis) {
    if (!axis) return;
    // 길이 임의
    const size = 9999;
    let dirVec = new THREE.Vector3();
    switch (axis) {
      case "x": dirVec.set(1, 0, 0); break;
      case "y": dirVec.set(0, 1, 0); break;
      case "z": dirVec.set(0, 0, 1); break;
      default: dirVec.set(1, 0, 0); break;
    }

    const points = [];
    points.push(new THREE.Vector3().copy(dirVec).multiplyScalar(-size));
    points.push(new THREE.Vector3().copy(dirVec).multiplyScalar(size));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    // 축색: x=red, y=green, z=blue
    let color = 0xff0000;
    if (axis === "y") color = 0x00ff00;
    if (axis === "z") color = 0x0000ff;

    const material = new THREE.LineBasicMaterial({ color });
    this.axisLineHelper = new THREE.Line(geometry, material);

    // 첫번째 PCD 위치에 붙이기
    const firstName = this.selectedPCDs.values().next().value;
    if (firstName) {
      const firstPCD = this.PCDs.get(firstName);
      const objWorldPos = new THREE.Vector3().setFromMatrixPosition(firstPCD.points.matrixWorld);
      this.axisLineHelper.position.copy(objWorldPos);
    }

    this.renderer.scene.add(this.axisLineHelper);
  }

  removeAxisLineHelper() {
    if (this.axisLineHelper) {
      this.renderer.scene.remove(this.axisLineHelper);
      this.axisLineHelper = null;
    }
  }

  /**
   * 변환 취소
   */
  cancelTransformation() {
    if (this.appState !== "TRANSFORM") return;
    console.log("Transformation canceled.");

    this.originalTransforms.forEach(({ pcd, position, rotation, quaternion, scale }) => {
      pcd.points.position.copy(position);
      pcd.points.rotation.copy(rotation);
      pcd.points.quaternion.copy(quaternion);
      pcd.points.scale.copy(scale);
    });

    this.removeAxisLineHelper();
    this.appState = "IDLE";
    this.transformationMode = null;
    this.transformationAxis = null;
    this.startIntersection = null;
    this.moveLine = null;
    this.movePlane = new THREE.Plane();
    this.transformData.clear();
    this.originalTransforms = [];
    this._mouseStart2D = null;
  }

  /**
   * 변환 확정
   */
  applyTransformation() {
    if (this.appState !== "TRANSFORM") return;

    console.log("Transformation applied.");
    this.removeAxisLineHelper();
    this.appState = "IDLE";
    this.transformationMode = null;
    this.transformationAxis = null;
    this.startIntersection = null;
    this.moveLine = null;
    this.movePlane = new THREE.Plane();
    this.transformData.clear();
    this.originalTransforms = [];
    this._mouseStart2D = null;
  }

  /**
   * "Blender식" → G/R/S
   * G는 plane/line 따라 이동
   * R은 축 잠금 없으면 Y축 회전, 잠금 있으면 그 축 기준 회전
   */
  handleMouseMove(event) {
    // 항상 마우스 위치 저장
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    const my = (event.clientY - rect.top) / rect.height;
    this._lastMousePos = { mx, my };

    if (this.appState !== "TRANSFORM") return;
    if (!this.transformationMode) return;

    switch (this.transformationMode) {
      case "translate":
        this.handleMouseMove_Translate(event);
        break;
      case "rotate":
        this.handleMouseMove_Rotate(event);
        break;
      case "scale":
        this.handleMouseMove_Scale(event);
        break;
      default:
        break;
    }
  }

  handleMouseMove_Translate(event) {
    if (!this.originalTransforms) return;
  
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    const my = (event.clientY - rect.top) / rect.height;
    const mouseVec2 = new THREE.Vector2(mx * 2 - 1, -(my * 2 - 1));
  
    // G 키만 눌렀을 경우
    if (!this.transformationAxis) {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseVec2, this.renderer.camera);
  
      let currentIsect = null;
      if (this.transformationAxis) {
        if (!this.moveLine) return;
        currentIsect = this.rayLineIntersect(raycaster.ray, this.moveLine);
        if (!currentIsect) return;
      } else {
        const planeIsect = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(this.movePlane, planeIsect)) return;
        currentIsect = planeIsect;
      }
  
      // 모든 선택된 PCD 이동
      for (const selName of this.selectedPCDs) {
        const offset = this.transformData.get(selName);
        if (!offset) continue;
        const newPosWorld = currentIsect.clone().add(offset);
        this.PCDs.get(selName).points.position.copy(newPosWorld);
      }
    } else {
      // X/Y/Z 축이 눌렸을 경우
      if (!this._mouseStart2D) {
        this._mouseStart2D = { x: mx, y: my };
      }
      const dx = mx - this._mouseStart2D.x;
      const dy = my - this._mouseStart2D.y;
      
      // const dxy = mx**2 + my**2;
      this.originalTransforms.forEach(({ pcd, position }) => {
        const newPosition = position.clone();
  
        switch (this.transformationAxis) {
          case "x":
            newPosition.x += dx * 100; // X축 이동
            break;
          case "y":
            newPosition.y -= dx * 100; // Y축 이동
            break;
          case "z":
            newPosition.z += dx * 100; // Z축 이동
            break;
          default:
            break;
        }
  
        pcd.points.position.copy(newPosition);
      });
    }
  
    // 선택된 PCD의 헬퍼 업데이트
    Object.values(this.selectionHelpers).forEach((helper) => helper.update());
  }
  

  /**
   * 회전:
   * - 축 잠금 없으면 Y축 회전
   * - 축 잠금 있으면 해당 축 기준
   */
  handleMouseMove_Rotate(event) {
    if (!this.originalTransforms) return;

    // mouseDelta.x
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    const my = (event.clientY - rect.top) / rect.height;

    if (!this._mouseStart2D) {
      this._mouseStart2D = { x: mx, y: my };
    }
    const dx = mx - this._mouseStart2D.x;

    // angle
    const angle = dx * Math.PI * 10;

    this.originalTransforms.forEach(({ pcd, rotation, quaternion }) => {
      if (!this.transformationAxis) {
        // 기본: y축 회전
        pcd.points.rotation.set(rotation.x, rotation.y + angle, rotation.z);
      } else {
        // 특정 축 잠금
        const pivot = rotation.clone(); // Euler
        // 축이 x/y/z 중 하나
        if (this.transformationAxis === "x") {
          pcd.points.rotation.set(pivot.x + angle, pivot.y, pivot.z);
        } else if (this.transformationAxis === "y") {
          pcd.points.rotation.set(pivot.x, pivot.y + angle, pivot.z);
        } else if (this.transformationAxis === "z") {
          pcd.points.rotation.set(pivot.x, pivot.y, pivot.z + angle);
        }
      }
    });
    Object.values(this.selectionHelpers).forEach((helper) => helper.update());
  }

  handleMouseMove_Scale(event) {
    if (!this.originalTransforms) return;

    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    const my = (event.clientY - rect.top) / rect.height;

    if (!this._mouseStart2D) {
      this._mouseStart2D = { x: mx, y: my };
    }
    const dx = mx - this._mouseStart2D.x;

    const factor = 1 + dx * 100; //scale factor
    this.originalTransforms.forEach(({ pcd, scale }) => {
      pcd.points.scale.copy(scale.clone().multiplyScalar(factor));
    });
    Object.values(this.selectionHelpers).forEach((helper) => helper.update());
  }

  /**
   * ray-line 교차
   */
  rayLineIntersect(rayA, rayB) {
    const Apos = rayA.origin.clone();
    const Adir = rayA.direction.clone().normalize();

    const Bpos = rayB.origin.clone();
    const Bdir = rayB.direction.clone().normalize();

    const cross = new THREE.Vector3().crossVectors(Adir, Bdir);
    const denom = cross.lengthSq();
    if (denom < 1e-8) {
      return null; // 평행
    }

    const r = new THREE.Vector3().subVectors(Bpos, Apos);
    const crossAdir = new THREE.Vector3().crossVectors(Bdir, cross);
    const crossBdir = new THREE.Vector3().crossVectors(Adir, cross);

    const u = r.dot(crossAdir) / Adir.dot(crossAdir);
    const t = r.dot(crossBdir) / Bdir.dot(crossBdir);

    if (u < 0) return null; // RayA 뒤쪽
    if (t < 0) return null; // RayB 뒤쪽

    return Apos.add(Adir.multiplyScalar(u));
  }

  /**
   * 키보드
   * - g => translate
   * - s => scale
   * - r => rotate
   * - x/y/z => 축 잠금
   * - esc => 취소
   */
  handleKeyDown(event) {
    const key = event.key.toLowerCase();
    const isNoModifier = !event.ctrlKey && !event.altKey && !event.metaKey;
    const transformKeys = ["g", "s", "r", "x", "y", "z", "escape"];

    if (transformKeys.includes(key) && isNoModifier) {
      event.preventDefault();
    }

    // 이미 transform 중인 상태
    if (this.appState === "TRANSFORM") {
      switch (key) {
        case "x":
        case "y":
        case "z":
          this.setTransformationAxis(key);
          break;
        // case "escape":
        //   this.cancelTransformation();
        //   break;
        default:
          break;
      }
      return;
    }

    // IDLE
    switch (key) {
      case "g":
        this.startTransformation("translate");
        break;
      case "s":
        this.startTransformation("scale");
        break;
      case "r":
        this.startTransformation("rotate");
        break;
      case "escape":
        this.cancelTransformation();
        this.clearSelection();
        break;
      default:
        break;
    }
  }

  dispose() {
    this.clearSelection();
    this.renderer.dispose();
  }
}
