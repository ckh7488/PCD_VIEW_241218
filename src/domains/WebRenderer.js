// src/domains/WebRenderer.js
import * as THREE from "three";
import PCD from "./PCD";

export class WebRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // 이곳에 회전해야 할 객체(PCD)들을 저장
    this.CRobjects = new Map();

    // 축 표시용
    this.axisHelpers = [];

    // 레이캐스팅 대상
    this.intersectableObjects = [];
  }

  init(controllerType = "orbit") {
    this.scene = new THREE.Scene();
    // 간단한 배경색
    this.scene.background = new THREE.Color(0x222222);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.001,
      100000
    );
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    this.setController(controllerType);

    window.addEventListener("resize", this.onWindowResize.bind(this), false);
  }

  setController(controllerType) {
    if (this.controls) {
      this.controls.dispose();
    }
    if (controllerType === "orbit") {
      const { OrbitControls } = require("three/examples/jsm/controls/OrbitControls");
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.update();
    }
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  /**
   * 씬에 등록
   */
  registerObject(name, pcdInstance) {
    if (this.CRobjects.has(name)) {
      console.warn(`Object ${name} is already registered.`);
      return;
    }
    this.CRobjects.set(name, pcdInstance);
    this.scene.add(pcdInstance.points);
  }

  unregisterObject(name) {
    const object = this.CRobjects.get(name);
    if (object) {
      this.scene.remove(object.points);
      this.CRobjects.delete(name);
    } else {
      console.warn(`Object ${name} not found in CRobjects.`);
    }
  }

  /**
   * 로테이션 대상을 필터링
   */
  getRotationTargets() {
    return Array.from(this.CRobjects.values()).filter(
      (obj) => obj instanceof PCD && obj.rotationSpeed !== 0
    );
  }

  /**
   * 매 프레임, 회전 대상 업데이트
   */
  updateRotation(deltaTime = 0.016) {
    this.getRotationTargets().forEach((object) => {
      object.updateRotation(deltaTime);
    });
  }

  /**
   * 축 표시
   */
  showAxis(objs) {
    // 씬의 중심축
    const centerAxis = new THREE.AxesHelper(200);
    this.scene.add(centerAxis);
    this.axisHelpers.push(centerAxis);

    // 선택된 객체별 축
    objs.forEach((objName) => {
      const object = this.getObjectByName(objName);
      if (!object) {
        console.warn(`Object ${objName} not found`);
        return;
      }
      const axis = new THREE.AxesHelper(200);
      // 축 위치를 객체 위치로 이동
      axis.position.copy(object.position);
      this.scene.add(axis);
      this.axisHelpers.push(axis);
    });
  }

  clearAxis() {
    this.axisHelpers.forEach((axis) => {
      this.scene.remove(axis);
    });
    this.axisHelpers = [];
  }

  toggleAxis(objs) {
    if (this.axisHelpers.length > 0) {
      this.clearAxis();
    } else {
      this.showAxis(objs);
    }
  }

  /**
   * 씬에 일반 Object3D or Points 추가 (포인트 클릭용 Raycast)
   */
  addObject(threeObj) {
    this.scene.add(threeObj);
    this.intersectableObjects.push(threeObj);
  }

  /**
   * PCD를 씬에 추가 (레이캐스트용 intersectableObjects 등록)
   */
  addPCD(name, pcdPoints) {
    pcdPoints.name = name;
    this.addObject(pcdPoints);
  }

  /**
   * 씬에서 name으로 오브젝트 가져오기
   */
  getObjectByName(name) {
    return this.scene.getObjectByName(name);
  }

  /**
   * 렌더 루프
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // 회전 업데이트
    this.updateRotation();

    // 컨트롤 업데이트
    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 리소스 정리
   */
  dispose() {
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    if (this.controls) {
      this.controls.dispose();
    }
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
