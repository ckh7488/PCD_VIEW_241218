import {
    EditManager,
    TranslateStrategy,
    RotateStrategy,
    ScaleStrategy,
    ColorChangeStrategy,
    DeleteStrategy,
    DuplicateStrategy,
    GlobalRotationStrategy,
    LocalRotationStrategy,
  } from "../domains/EditManager";
import SelectionManager from "../domains/SelectionManager";
import PCD from "../domains/PCD";
import * as THREE from "three";

describe("EditManager Class", () => {
  let editManager, selectionManager, pcd1, pcd2;

  beforeEach(() => {
    editManager = new EditManager();
    selectionManager = new SelectionManager();
    pcd1 = new PCD("PCD1");
    pcd2 = new PCD("PCD2");

    selectionManager.select(pcd1);
    selectionManager.select(pcd2);
  });

  it("should apply global rotation to selected PCDs", () => {
    const axis = new THREE.Vector3(0, 1, 0); // Y-axis
    const speed = Math.PI / 4; // 45 degrees
    const rotationStrategy = new GlobalRotationStrategy(axis, speed);

    editManager.setStrategy(rotationStrategy);
    editManager.applyEdit(selectionManager.getSelectedItems());

    const expectedQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, speed);
    const epsilon = 1e-6; // 허용 오차

    selectionManager.getSelectedItems().forEach((item) => {
        const currentQuaternion = new THREE.Quaternion().setFromEuler(item.rotation);
        expect(currentQuaternion.angleTo(expectedQuaternion)).toBeLessThan(epsilon);
    });
});

it("should apply local rotation to selected PCDs", () => {
    const axis = new THREE.Vector3(1, 0, 0); // X-axis
    const speed = Math.PI / 6; // 30 degrees
    const rotationStrategy = new LocalRotationStrategy(axis, speed);

    editManager.setStrategy(rotationStrategy);
    editManager.applyEdit(selectionManager.getSelectedItems());

    const epsilon = 1e-6; // 허용 오차

    selectionManager.getSelectedItems().forEach((item) => {
        // 새 로컬 회전 생성
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, speed);

        // 초기 쿼터니언 가져오기
        const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)); // 초기값 0

        // 예상 쿼터니언 계산
        const expectedQuaternion = initialQuaternion.clone().multiply(rotationQuaternion);

        // 현재 적용된 쿼터니언 가져오기
        const currentQuaternion = new THREE.Quaternion().setFromEuler(item.rotation);

        // 각도 차이를 비교
        expect(currentQuaternion.angleTo(expectedQuaternion)).toBeLessThan(epsilon);
    });
});





  it("should apply translation to selected PCDs", () => {
    const translation = new THREE.Vector3(1, 0, 0);
    const translateStrategy = new TranslateStrategy(translation);

    editManager.setStrategy(translateStrategy);
    editManager.applyEdit(selectionManager.getSelectedItems());

    expect(pcd1.location).toEqual(new THREE.Vector3(1, 0, 0));
    expect(pcd2.location).toEqual(new THREE.Vector3(1, 0, 0));
  });

  it("should apply rotation to selected PCDs", () => {
    const rotation = new THREE.Euler(0, Math.PI / 4, 0);
    const rotateStrategy = new RotateStrategy(rotation);

    editManager.setStrategy(rotateStrategy);
    editManager.applyEdit(selectionManager.getSelectedItems());

    expect(pcd1.rotation).toEqual(rotation);
    expect(pcd2.rotation).toEqual(rotation);
  });

  it("should apply scaling to selected PCDs", () => {
    const scale = new THREE.Vector3(2, 2, 2);
    const scaleStrategy = new ScaleStrategy(scale);

    editManager.setStrategy(scaleStrategy);
    editManager.applyEdit(selectionManager.getSelectedItems());

    expect(pcd1.scale).toEqual(scale);
    expect(pcd2.scale).toEqual(scale);
  });

  it("should change color of selected PCDs", () => {
    const newColor = 0xff0000; // Red
    const colorChangeStrategy = new ColorChangeStrategy(newColor);

    editManager.setStrategy(colorChangeStrategy);
    editManager.applyEdit(selectionManager.getSelectedItems());

    expect(pcd1.color.getHex()).toBe(newColor);
    expect(pcd2.color.getHex()).toBe(newColor);
  });

  it("should delete selected PCDs", () => {
    const deleteStrategy = new DeleteStrategy();

    editManager.setStrategy(deleteStrategy);
    editManager.applyEdit(selectionManager.getSelectedItems());

    // Ensure pcd1 and pcd2 are removed from their parent
    expect(pcd1.parent).toBeNull();
    expect(pcd2.parent).toBeNull();
  });

  it("should throw error if no strategy is set", () => {
    expect(() => editManager.applyEdit(selectionManager.getSelectedItems())).toThrow("No edit strategy set");
  });
});
