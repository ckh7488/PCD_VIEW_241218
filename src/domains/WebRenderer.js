import * as THREE from "three";

export class WebRenderer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null; // OrbitControls 추가
        this.intersectableObjects = [];
    }

    init(controllerType = "orbit") {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.001, 100000000);
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

        switch (controllerType) {
            case "orbit":
                const { OrbitControls } = require("three/examples/jsm/controls/OrbitControls");
                this.controls = new OrbitControls(this.camera, this.renderer.domElement);
                break;
            default:
                console.warn(`Unknown controller type: ${controllerType}`);
        }

        if (this.controls) {
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

    addObject(object) {
        this.scene.add(object);
        this.intersectableObjects.push(object);
    }

    addPCD(name, points) {
        points.name = name;
        this.addObject(points);
    }

    getObjectByName(name) {
        return this.scene.getObjectByName(name); // Scene에서 이름으로 객체 검색
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        if (this.controls) {
            this.controls.update();
        }
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener("resize", this.onWindowResize.bind(this));
        if (this.controls) {
            this.controls.dispose();
        }
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
