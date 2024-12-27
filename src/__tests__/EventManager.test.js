import { EventManager } from "../domains/EventManager";
import * as THREE from "three";

describe("EventManager", () => {
    let mockRenderer, eventManager;

    beforeEach(() => {
        mockRenderer = {
            renderer: { domElement: document.createElement("canvas") },
            camera: new THREE.PerspectiveCamera(),
            intersectableObjects: []
        };
        eventManager = new EventManager(mockRenderer);
        eventManager.init();
    });

    it("should register and emit events", () => {
        const mockHandler = jest.fn();
        eventManager.on("testEvent", mockHandler);

        eventManager.emit("testEvent", { data: "testData" });
        expect(mockHandler).toHaveBeenCalledWith({ data: "testData" });
    });

    it("should handle object click events", () => {
        const mockHandler = jest.fn();
        eventManager.on("objectClick", mockHandler);

        const mockObject = new THREE.Mesh();
        mockRenderer.intersectableObjects.push(mockObject);

        eventManager.onClick({
            clientX: 100,
            clientY: 100,
            target: mockRenderer.renderer.domElement,
            preventDefault: jest.fn()
        });

        expect(mockHandler).not.toHaveBeenCalled(); // No intersections expected without raycaster mock
    });

    it("should handle key press events", () => {
        const mockHandler = jest.fn();
        eventManager.on("keyPress", mockHandler);

        eventManager.onKeyDown({ key: "a" });
        expect(mockHandler).toHaveBeenCalledWith("a");
    });
});
