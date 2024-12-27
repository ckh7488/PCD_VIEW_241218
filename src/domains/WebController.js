import { WebRenderer } from "./WebRenderer";
import * as THREE from "three";

export class WebController {
    constructor(container) {
        this.renderer = new WebRenderer(container);
        this.selectedPCDs = new Set();
        this.selectionHelpers = {};
        this.transformationMode = null; // 현재 Transformation 모드

        // transformation 시 필요한 정보
        this.originalTransforms = [];
        this.mouseStart = null;
    }

    init(controllerType = "orbit") {
        this.renderer.init(controllerType);
        this.renderer.animate();
    }

    dispose() {
        this.clearSelection();
        this.renderer.dispose();
    }

    /**
     * PCD 로드 및 추가
     */
    addPCD(name, pcd) {
        this.renderer.addPCD(name, pcd.getPoints());
        pcd.points.userData.name = name;
    }

    /**
     * 선택/하이라이트 관련
     */
    highlightPCD(name, points) {
        // points(THREE.Points)를 기준으로 BoxHelper를 생성
        const box = new THREE.BoxHelper(points, 0xffff00);
        box.material.transparent = true;
        box.material.opacity = 0.5;
        
        // 씬에 추가
        this.renderer.addObject(box);
        
        // selectionHelpers에 저장 (나중에 update용으로 참조)
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

    /**
     * PCD 선택 토글
     * @param {string} name
     * @param {THREE.Points} points
     * @param {boolean} [isMultiSelect=false]
     * @param {boolean} [isExclusiveSelect=false]
     */
    toggleSelection(name, points, isMultiSelect = false, isExclusiveSelect = false) {
        if (isExclusiveSelect) {
            this.clearSelection(); // 기존 선택 모두 해제
        }

        if (this.selectedPCDs.has(name)) {
            this.selectedPCDs.delete(name);
            this.removeHighlight(name);
        } else {
            if (!isMultiSelect) {
                // 단일 선택은 기존 선택 해제
                this.clearSelection();
            }
            this.selectedPCDs.add(name);
            this.highlightPCD(name, points);
        }
    }

    /**
     * 캔버스 클릭 시 레이캐스팅하여 PCD 선택
     * @param {MouseEvent} event
     * @param {boolean} [isMultiSelect=false]
     * @param {boolean} [isExclusiveSelect=false]
     */
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
            const { name } = selectedObject.userData;
            if (name) {
                this.toggleSelection(name, selectedObject, isMultiSelect, isExclusiveSelect);
            }
        }
    }

    /**
     * 현재 transformation 모드 확인
     * @returns {string|null}
     */
    getTransformationMode() {
        return this.transformationMode;
    }

    /**
     * 변환 시작
     * @param {string} mode - "translate" | "scale" | "rotate"
     * @returns {boolean} - 시작 가능 여부
     */
    startTransformation(mode = "translate") {
        if (this.selectedPCDs.size === 0) {
            console.warn("No PCD selected. Cannot start transformation.");
            return false;
        }

        // 모드 설정
        this.transformationMode = mode;
        console.log("Starting transformation. Mode:", this.transformationMode);

        // 선택된 오브젝트의 초기 위치/스케일/회전 등을 저장
        this.originalTransforms = [...this.selectedPCDs]
            .map((name) => {
                const object = this.renderer.getObjectByName(name);
                if (!object) return null;

                return {
                    name,
                    object,
                    position: object.position.clone(),
                    scale: object.scale.clone(),
                    rotation: object.rotation.clone(),
                };
            })
            .filter(Boolean);

        console.log("Original transforms initialized:", this.originalTransforms);
        return true;
    }

    /**
     * 변환 중 업데이트 (마우스 드래그 등)
     * @param {{ x: number, y: number }} mouseDelta
     */
    updateTransformation(mouseDelta) {
        if (!this.transformationMode || !this.originalTransforms) {
            console.warn("No active transformation or original transforms missing.");
            return;
        }

        // 간단하게 x축을 기준으로만 transform
        // 모드에 따라 간단하게 예시만 나눔
        // console.log("updateTransformation", this.transformationMode);
        switch (this.transformationMode) {
            case "translate": {
                const factor = mouseDelta.x * 100; // 간단한 예시
                this.originalTransforms.forEach(({ object, position }) => {
                    // position + factor
                    object.position.copy(position.clone().add(new THREE.Vector3(factor, 0, 0)));
                });
                break;
            }
            case "scale": {
                // scale은 예시로 x 방향 스케일만 변경
                const factor = 1 + mouseDelta.x * 100;
                this.originalTransforms.forEach(({ object, scale }) => {
                    object.scale.copy(scale.clone().multiply(new THREE.Vector3(factor, factor, factor)));
                });
                break;
            }
            case "rotate": {
                // 회전은 예시로 y축 회전만
                const angle = mouseDelta.x * Math.PI; // 드래그 비율에 따른 회전량
                this.originalTransforms.forEach(({ object, rotation }) => {
                    object.rotation.set(rotation.x, rotation.y + angle, rotation.z);
                });
                break;
            }
            default:
                break;
        }

        Object.values(this.selectionHelpers).forEach((helper) => {
            helper.update();
        });
    }

    /**
     * 변환 취소: 원래 상태로 되돌림
     */
    cancelTransformation() {
        if (!this.transformationMode || !this.originalTransforms) {
            console.warn("No active transformation to cancel.");
            return;
        }

        console.log("Transformation canceled.");

        // 원래 상태로 복원
        this.originalTransforms.forEach(({ object, position, scale, rotation }) => {
            object.position.copy(position);
            object.scale.copy(scale);
            object.rotation.copy(rotation);
        });

        this.transformationMode = null;
        this.originalTransforms = [];
        this.mouseStart = null;
    }

    /**
     * 변환 적용: 원상복구 정보를 비우고 모드 해제
     */
    applyTransformation() {
        if (!this.transformationMode) {
            return;
        }
        console.log("Transformation applied.");
        this.transformationMode = null;
        this.originalTransforms = [];
        this.mouseStart = null;
        
    }

    /**
     * 마우스 이벤트(React나 일반 DOM에서 직접 연결)
     */
    handleMouseDown(event) {
        // if (!this.transformationMode) {
        //     // transform 모드가 아닐 경우는 무시
        //     return;
        // }
        const rect = this.renderer.renderer.domElement.getBoundingClientRect();
        this.mouseStart = {
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
        };
    }

    handleMouseMove(event) {
        // console.log("handleMouseMove", this.transformationMode, this.mouseStart);
        if (!this.transformationMode || !this.mouseStart) {
            return;
        }
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
        // 현재 transform 모드면 적용
        if (this.transformationMode) {
            this.applyTransformation();
            this.transformationMode = null;
            fn(null);
        }
    }
}
