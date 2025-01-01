// src/domains/WebController.js
import * as THREE from "three";
import { WebRenderer } from "./WebRenderer";
import PCD from "./PCD";

export class WebController {
  constructor(container) {
    this.renderer = new WebRenderer(container);

    this.PCDs = new Map();
    this.selectedPCDs = new Set();
    this.selectionHelpers = {};

    // 상태 머신
    this.appState = "IDLE"; // "IDLE" | "TRANSFORM"
    this.transformationMode = null; // "translate" | "rotate" | "scale" | null
    this.transformationAxis = null; // "x"|"y"|"z"|null
    this.originalTransforms = [];

    // Blender G식 이동
    this.movePlane = new THREE.Plane();
    this.moveLine = null;
    this.startIntersection = null;
    this.transformData = new Map(); // { pcdName -> offset }

    this._mouseStart2D = null;
    this.axisLineHelper = null;

    // transformationModIndices
    this.transformationModIndices = new Map(); 
  }

  init(controllerType = "orbit") {
    this.renderer.init(controllerType, this);
    this.renderer.animate();
  }

  switchControlType(newType) {
    this.renderer.setController(newType);
  }

addPCD(name, pcdInstance) {
  this.PCDs.set(name, pcdInstance);
  this.renderer.addPCD(name, pcdInstance); // ← 여기서 pcdInstance를 직접 넘김
}

  unregisterObject(name) {
    this.PCDs.delete(name);
    this.renderer.unregisterObject(name);
  }

  toggleAxis(objNames) {
    this.renderer.toggleAxis(objNames);
  }

  /**
   * Modifier
   */
  addModifierToPCD(name, modifier) {
    const pcd = this.PCDs.get(name);
    if (!pcd) {
      console.warn(`PCD "${name}" not found.`);
      return;
    }
    pcd.addModifier(modifier);
  }

  removeModifierFromPCD(name, index) {
    const pcd = this.PCDs.get(name);
    if (!pcd) {
      console.warn(`PCD "${name}" not found.`);
      return;
    }
    pcd.removeModifier(index);
  }

  clearModifiersFromPCD(name) {
    const pcd = this.PCDs.get(name);
    if (!pcd) {
      console.warn(`PCD "${name}" not found.`);
      return;
    }
    pcd.clearModifiers();
  }

  addModifierToSelectedPCDs(modifier) {
    this.selectedPCDs.forEach((fileName) => {
      this.addModifierToPCD(fileName, modifier);
    });
  }

  removeModifierFromSelectedPCDs(index) {
    this.selectedPCDs.forEach((fileName) => {
      this.removeModifierFromPCD(fileName, index);
    });
  }

  clearModifiersFromSelectedPCDs() {
    this.selectedPCDs.forEach((fileName) => {
      this.clearModifiersFromPCD(fileName);
    });
  }

  /**
   * 회전 축 (rotation) -> 실제로는 Modifier의 rotation 형태
   */
  addRotationAxisToPCD(fileName, axisPos, axisDir, speed) {
    const pcd = this.PCDs.get(fileName);
    if (!pcd) {
      console.warn(`PCD "${fileName}" not found.`);
      return;
    }
    pcd.addRotationAxis(axisPos, axisDir, speed);
  }

  removeRotationAxisFromPCD(fileName, index) {
    const pcd = this.PCDs.get(fileName);
    if (!pcd) {
      console.warn(`PCD "${fileName}" not found.`);
      return;
    }
    pcd.removeRotationAxis(index);
  }

  // 구형 API (지속 회전 등), 필요시 수정
  setRotation(pcdNames, axis, speed) {
    pcdNames.forEach((pcdName) => {
      const pcd = this.PCDs.get(pcdName);
      if (pcd) {
        // 예: pcd.setRotation(axis, speed) 라는 별도 메서드가 있다면 사용
        // (혹은 addRotationAxis 등으로 대체)
      }
    });
  }

  /**
   * 선택
   */
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

  clearSelection() {
    this.selectedPCDs.forEach((fileName) => {
      this.removeHighlight(fileName);
    });
    this.selectedPCDs.clear();
  }

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

  updateHighlights() {
    Object.entries(this.selectionHelpers).forEach(([name, boxHelper]) => {
      const pcd = this.PCDs.get(name);
      if (pcd && boxHelper) {
        boxHelper.update();
      }
    });
  }

  /**
   * 클릭으로 PCD 선택
   */
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

  /**
   * Blender식 Transform
   */
  getTransformationMode() {
    return this.transformationMode;
  }

  startTransformation(mode = "translate") {
    if (this.appState === "TRANSFORM") return false;
    if (this.selectedPCDs.size === 0) {
      console.warn("No PCD selected.");
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
  
    // 1) 각 선택된 PCD에 임시 transformation modifier 추가
    //    (matrix는 일단 identity로 시작)
    const transformationMod = { transformation: { matrix: new THREE.Matrix4().identity() } };
  
    // 생성된 modifier를 각 PCD에 add → 인덱스 기록
    this.selectedPCDs.forEach((name) => {
      const pcd = this.PCDs.get(name);
      // 기록하기 전에, "몇 번 인덱스"인지 알아내기
      const modIndex = pcd.modifiers.length; // 추가 직전이니 length가 곧 새 인덱스
      pcd.addModifier(transformationMod);
      this.transformationModIndices.set(name, modIndex);
    });
  
    // 만약 plane or line 초기화
    if (mode === "translate") {
      this.setupPlaneOrLine();
    }
    return true;
  }
  


  setTransformationAxis(axis) {
    if (this.appState !== "TRANSFORM") return;
    this.transformationAxis = axis;
    this.removeAxisLineHelper();
    if (this.transformationMode === "translate") {
      this.setupPlaneOrLine();
    } else if (this.transformationMode === "rotate") {
      this.createAxisLineHelper(axis);
    }
  }

  setupPlaneOrLine() {
    this.startIntersection = null;
    this.moveLine = null;
    this.movePlane = new THREE.Plane();
    this.transformData.clear();

    this.removeAxisLineHelper();
    if (this.transformationAxis) {
      this.createAxisLineHelper(this.transformationAxis);
    }

    const { mx, my } = this._lastMousePos || { mx: 0.5, my: 0.5 };
    const mouseVec2 = new THREE.Vector2(mx * 2 - 1, -(my * 2 - 1));
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseVec2, this.renderer.camera);

    const firstName = this.selectedPCDs.values().next().value;
    if (!firstName) return;
    const firstPCD = this.PCDs.get(firstName);
    const objWorldPos = new THREE.Vector3().setFromMatrixPosition(
      firstPCD.points.matrixWorld
    );

    if (this.transformationAxis) {
      const axisDir = new THREE.Vector3();
      switch (this.transformationAxis) {
        case "x":
          axisDir.set(1, 0, 0);
          break;
        case "y":
          axisDir.set(0, 1, 0);
          break;
        case "z":
          axisDir.set(0, 0, 1);
          break;
        default:
          break;
      }
      this.moveLine = new THREE.Ray(objWorldPos, axisDir);
      const isect = this.rayLineIntersect(raycaster.ray, this.moveLine);
      if (!isect) return;
      this.startIntersection = isect.clone();
    } else {
      // plane
      const camDir = new THREE.Vector3();
      this.renderer.camera.getWorldDirection(camDir);
      this.movePlane.setFromNormalAndCoplanarPoint(camDir, objWorldPos);
      const planeIsect = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(this.movePlane, planeIsect)) return;
      this.startIntersection = planeIsect.clone();
    }

    for (const selName of this.selectedPCDs) {
      const wPos = new THREE.Vector3().setFromMatrixPosition(
        this.PCDs.get(selName).points.matrixWorld
      );
      const offset = wPos.clone().sub(this.startIntersection);
      this.transformData.set(selName, offset);
    }
  }

  createAxisLineHelper(axis) {
    if (!axis) return;
    const size = 9999;
    let dirVec = new THREE.Vector3();
    switch (axis) {
      case "x":
        dirVec.set(1, 0, 0);
        break;
      case "y":
        dirVec.set(0, 1, 0);
        break;
      case "z":
        dirVec.set(0, 0, 1);
        break;
      default:
        dirVec.set(1, 0, 0);
        break;
    }

    const points = [];
    points.push(dirVec.clone().multiplyScalar(-size));
    points.push(dirVec.clone().multiplyScalar(size));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    let color = 0xff0000;
    if (axis === "y") color = 0x00ff00;
    if (axis === "z") color = 0x0000ff;
    const material = new THREE.LineBasicMaterial({ color });

    this.axisLineHelper = new THREE.Line(geometry, material);

    const firstName = this.selectedPCDs.values().next().value;
    if (firstName) {
      const firstPCD = this.PCDs.get(firstName);
      const objWorldPos = new THREE.Vector3().setFromMatrixPosition(
        firstPCD.points.matrixWorld
      );
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

  cancelTransformation() {
    if (this.appState !== "TRANSFORM") return;
    console.log("Transformation canceled.");
  
    // 임시 Modifier 제거
    this.selectedPCDs.forEach((selName) => {
      const pcd = this.PCDs.get(selName);
      const modIndex = this.transformationModIndices.get(selName);
      if (typeof modIndex === "number") {
        pcd.removeModifier(modIndex);
      }
    });
    this.transformationModIndices.clear();
  
    // 나머지 정리
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

  applyTransformation() {
    if (this.appState !== "TRANSFORM") return;
    console.log("Transformation applied.");
    // 여기서는 굳이 modifier를 빼지 않고 그대로 두면 = 적용 완료
    // 만약 "확정"과 동시에 stack에 더 이상 임시가 아닌 "영구 Modifier"로 남길 거면,
    // 별도의 플래그 업데이트만 하거나, 혹은 아무것도 안 해도 됩니다.
  
    // 선택적으로 transformationModIndices를 비워주면,
    // "임시" 개념은 없애고, 이제부터는 "영구" modifier가 됨
    this.transformationModIndices.clear();
  
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

  resetTransformState() {
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

  handleMouseMove(event) {
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
    if (this.originalTransforms.length == 0) {
      console.warn("this.origianTransforms empty.")
      return;
    }
    
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    const my = (event.clientY - rect.top) / rect.height;
    const mouseVec2 = new THREE.Vector2(mx * 2 - 1, -(my * 2 - 1));
  
    if (!this.transformationAxis) {
      // Plane 이동 (planeIsect - startIntersection)
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseVec2, this.renderer.camera);
      let currentIsect = null;
      if (this.transformationAxis && this.moveLine) {
        currentIsect = this.rayLineIntersect(raycaster.ray, this.moveLine);
      } else {
        const planeIsect = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(this.movePlane, planeIsect)) return;
        currentIsect = planeIsect;
      }
      if (!currentIsect) return;
  
      // newPosWorld = currentIsect + offset
      // delta = newPosWorld - originalPos
      // 최종 translation matrix
      console.log(this.originalTransforms)
      this.selectedPCDs.forEach((selName) => {
        const offset = this.transformData.get(selName);
        if (!offset) return;
        const newPosWorld = currentIsect.clone().add(offset);
  
        // originalPos는 this.originalTransforms에 있음
        const orig = this.originalTransforms.find((o) => o.name === selName);
        console.log(orig ,this.originalTransforms, this.selectedPCDs)
        if (!orig) return;
        const delta = newPosWorld.clone().sub(orig.position);
  
        // 1) 임시 transformation modifier 찾기
        const pcd = this.PCDs.get(selName);
        const modIndex = this.transformationModIndices.get(selName);
        const mod = pcd.modifiers[modIndex];
        console.log(mod)
        if (!mod?.transformation) return;
  
        // 2) matrix 갱신
        const mat = new THREE.Matrix4().makeTranslation(delta.x, delta.y, delta.z);
        console.log(mat)
        mod.transformation.matrix.copy(mat);
      });
    }  else {
      // 축 이동
      if (!this._mouseStart2D) {
        this._mouseStart2D = { x: mx, y: my };
      }
      const dx = mx - this._mouseStart2D.x;
  
      // 축이 x/y/z이면, dx * 100 만큼 이동
      this.selectedPCDs.forEach((selName) => {
        const orig = this.originalTransforms.find((o) => o.name === selName);
        if (!orig) return;
  
        let deltaVec = new THREE.Vector3();
        switch (this.transformationAxis) {
          case "x": deltaVec.set(dx * 100, 0, 0); break;
          case "y": deltaVec.set(0, -dx * 100, 0); break;
          case "z": deltaVec.set(0, 0, dx * 100); break;
        }
        const finalPos = orig.position.clone().add(deltaVec);
  
        // 실제 matrix는 (finalPos - orig.position) 만큼만 translation
        const translation = finalPos.clone().sub(orig.position);
  
        // 임시 transformation modifier
        const pcd = this.PCDs.get(selName);
        const modIndex = this.transformationModIndices.get(selName);
        const mod = pcd.modifiers[modIndex];
        if (!mod?.transformation) return;
  
        const mat = new THREE.Matrix4().makeTranslation(
          translation.x,
          translation.y,
          translation.z
        );
        console.log(mat)
        mod.transformation.matrix.copy(mat);
      });
    }
  
    // 헬퍼 업데이트
    Object.values(this.selectionHelpers).forEach((helper) => helper.update());
  }
  

  handleMouseMove_Rotate(event) {
    if (!this.originalTransforms) return;
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    if (!this._mouseStart2D) {
      this._mouseStart2D = { x: mx, y: 0 };
    }
    const dx = mx - this._mouseStart2D.x;
    const angle = dx * Math.PI * 10;

    this.originalTransforms.forEach(({ pcd, rotation }) => {
      if (!this.transformationAxis) {
        pcd.points.rotation.set(rotation.x, rotation.y + angle, rotation.z);
      } else {
        if (this.transformationAxis === "x") {
          pcd.points.rotation.set(rotation.x + angle, rotation.y, rotation.z);
        } else if (this.transformationAxis === "y") {
          pcd.points.rotation.set(rotation.x, rotation.y + angle, rotation.z);
        } else if (this.transformationAxis === "z") {
          pcd.points.rotation.set(rotation.x, rotation.y, rotation.z + angle);
        }
      }
    });
    Object.values(this.selectionHelpers).forEach((helper) => helper.update());
  }

  handleMouseMove_Scale(event) {
    if (!this.originalTransforms) return;
    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    if (!this._mouseStart2D) {
      this._mouseStart2D = { x: mx, y: 0 };
    }
    const dx = mx - this._mouseStart2D.x;
    const factor = 1 + dx * 100;

    this.originalTransforms.forEach(({ pcd, scale }) => {
      pcd.points.scale.copy(scale.clone().multiplyScalar(factor));
    });
    Object.values(this.selectionHelpers).forEach((helper) => helper.update());
  }

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

    if (u < 0) return null;
    if (t < 0) return null;
    return Apos.add(Adir.multiplyScalar(u));
  }

  handleKeyDown(event) {
    const key = event.key.toLowerCase();
    const isNoModifier = !event.ctrlKey && !event.altKey && !event.metaKey;
    const transformKeys = ["g", "s", "r", "x", "y", "z", "escape"];

    if (transformKeys.includes(key) && isNoModifier) {
      event.preventDefault();
    }

    if (this.appState === "TRANSFORM") {
      if (["x", "y", "z"].includes(key)) {
        this.setTransformationAxis(key);
      }
      return;
    }

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
