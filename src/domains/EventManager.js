import * as THREE from 'three';

export class EventManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.handlers = {};
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    init() {
        this.renderer.renderer.domElement.addEventListener("click", this.onClick.bind(this), false);
        window.addEventListener("keydown", this.onKeyDown.bind(this), false);
    }

    on(eventType, handler) {
        if (!this.handlers[eventType]) {
            this.handlers[eventType] = [];
        }
        this.handlers[eventType].push(handler);
    }

    emit(eventType, payload) {
        if (this.handlers[eventType]) {
            this.handlers[eventType].forEach(handler => handler(payload));
        }
    }

    onClick(event) {
        const rect = this.renderer.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.renderer.camera);
        const intersects = this.raycaster.intersectObjects(this.renderer.intersectableObjects, true);

        if (intersects.length > 0) {
            this.emit("objectClick", intersects[0].object);
        } else {
            this.emit("canvasClick", null);
        }
    }

    onKeyDown(event) {
        this.emit("keyPress", event.key.toLowerCase());
    }
}
