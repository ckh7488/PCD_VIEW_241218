import * as THREE from "three";
import PCDGroup from "./PCDGroup";
import PCDEdit from "./PCDEdit";
import OrbitController from "./controllers/OrbitController";


// Web based Class!!
// use window and so-on. so, don't use it on other base.
export default class PCDViewer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controller = null; // 컨트롤러 추가
    this.animateId = null;

    this.pcdGroup = new PCDGroup();
    this.pcdEdit = null;

    this.init();
  }

  /**
   * Three.js 기본 설정 초기화
   */
  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    this.pcdEdit = new PCDEdit(this.pcdGroup, this.scene);

    // 컨트롤러 설정 (기본적으로 OrbitController 사용)
    this.setController(new OrbitController(this.camera, this.renderer.domElement));

    window.addEventListener("resize", this.onWindowResize.bind(this), false);
    this.animate();
  }

  /**
   * 컨트롤러 설정
   * @param {BaseController} controller - 사용할 컨트롤러
   */
  setController(controller) {
    if (this.controller) {
      this.controller.disable();
    }
    this.controller = controller;
    this.controller.enable();
  }

  /**
   * PCDEdit 반환
   * @returns {PCDEdit} - PCD 편집기
   */
  getEditor() {
    return this.pcdEdit;
  }

  /**
   * Three.js 화면 리사이즈 핸들러
   */
  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  /**
   * 애니메이션 루프
   */
  animate() {
    this.animateId = requestAnimationFrame(this.animate.bind(this));
    if (this.controller) {
      this.controller.update(); // 컨트롤러 업데이트
    }
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Viewer 정리
   */
  dispose() {
    cancelAnimationFrame(this.animateId);
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    this.controller?.disable();

    if (this.container && this.renderer) {
      this.container.removeChild(this.renderer.domElement);
    }

    if (this.renderer) this.renderer.dispose();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controller = null;
    this.pcdGroup = null;
    this.pcdEdit = null;
  }
}
