import PCDGroup from "../domains/PCDGroup";
import PCD from "../domains/PCD";
import * as THREE from "three";

describe("PCDGroup Class", () => {
    let group, pcd1, pcd2, subGroup, pcd3;

  beforeEach(() => {
    group = new PCDGroup("MainGroup");
    pcd1 = new PCD("PCD1");
    pcd2 = new PCD("PCD2");
    subGroup = new PCDGroup("SubGroup");
    pcd3 = new PCD("PCD3");

    group.addPCD(pcd1);
    group.addPCD(pcd2);
    subGroup.addPCD(pcd3);
    group.addPCD(subGroup);
  });

  it("should reflect parent's rotation in child's world transform", () => {
    const parentGroup = new PCDGroup("ParentGroup");
    const child = new PCD("Child");
  
    parentGroup.addPCD(child);
  
    // Apply parent transformations
    parentGroup.location = new THREE.Vector3(5, 0, 0);
    parentGroup.rotation = new THREE.Euler(0, Math.PI / 4, 0, 'XYZ');
    parentGroup.updateWorldTransform();
  
    // Set child local position
    child.location = new THREE.Vector3(1, 0, 0);
    child.updateWorldTransform();
  
    // Calculate expected world position
    const expectedWorldPosition = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(parentGroup.rotation);
    const translationMatrix = new THREE.Matrix4().makeTranslation(5, 0, 0);
  
    const combinedMatrix = new THREE.Matrix4().multiplyMatrices(translationMatrix, rotationMatrix);
    expectedWorldPosition.setFromMatrixPosition(
      new THREE.Matrix4().multiplyMatrices(combinedMatrix, child.matrix_local)
    );
  
    const childWorldPosition = new THREE.Vector3().setFromMatrixPosition(child.matrix_world);
    expect(childWorldPosition.distanceTo(expectedWorldPosition)).toBeLessThan(0.001);
  });
  
  


  it("should update child world position after parent rotation and translation", () => {
    const parentGroup = new PCDGroup("ParentGroup");
    const child = new PCD("Child");
  
    parentGroup.addPCD(child);
  
    // Apply parent transformations
    parentGroup.location = new THREE.Vector3(5, 0, 0);
    parentGroup.rotation = new THREE.Euler(0, Math.PI / 2, 0, 'XYZ');
    parentGroup.updateWorldTransform();
  
    // Set child local position
    child.location = new THREE.Vector3(1, 0, 0);
    child.updateWorldTransform();
  
    // Verify final world position
    const childWorldPosition = new THREE.Vector3().setFromMatrixPosition(child.matrix_world);
    expect(childWorldPosition).toEqual(new THREE.Vector3(5, 0, -1)); // Rotated around Y-axis
  });
  

  it("should propagate rotations to nested children", () => {
    const parentGroup = new PCDGroup("ParentGroup");
    const childGroup = new PCDGroup("ChildGroup");
    const pcd = new PCD("ChildPCD");
  
    parentGroup.addPCD(childGroup);
    childGroup.addPCD(pcd);
  
    // 부모와 자식의 회전 설정
    parentGroup.rotation = new THREE.Euler(0, Math.PI / 2, 0, 'XYZ');
    childGroup.rotation = new THREE.Euler(Math.PI / 4, 0, 0, 'XYZ');
    parentGroup.updateWorldTransform();
  
    // 부모와 자식의 회전을 결합
    const parentQuaternion = new THREE.Quaternion().setFromEuler(parentGroup.rotation);
    const childQuaternion = new THREE.Quaternion().setFromEuler(childGroup.rotation);
    const expectedWorldRotation = parentQuaternion.clone().multiply(childQuaternion);
  
    // PCD의 월드 회전 확인
    const childWorldRotation = new THREE.Quaternion();
    pcd.matrix_world.decompose(new THREE.Vector3(), childWorldRotation, new THREE.Vector3());
  
    // 디버깅 출력
    console.log("Child World Rotation:", childWorldRotation);
    console.log("Expected World Rotation:", expectedWorldRotation);
  
    // 각도로 비교
    const epsilon = 1e-6; // 허용 오차
    expect(childWorldRotation.angleTo(expectedWorldRotation)).toBeLessThan(epsilon);
  });
  
  
  

  it("should initialize with the correct name", () => {
    expect(group.name).toBe("MainGroup");
    expect(group.children).toContain(pcd1);
    expect(group.children).toContain(pcd2);
    expect(group.children).toContain(subGroup);
  });

  it("should add and remove PCDs correctly", () => {
    const child1 = new PCD("Child1");
    const child2 = new PCD("Child2");

    // Add PCDs
    group.addPCD(child1);
    group.addPCD(child2);

    expect(group.children).toContain(child1);
    expect(group.children).toContain(child2);

    // Remove a PCD
    group.removePCD(child1);
    expect(group.children).not.toContain(child1);
    expect(group.children).toContain(child2);
  });

  it("should update children's world transform when group's transform changes", () => {
    const child1 = new PCD("Child1");
    group.addPCD(child1);

    // Change group's location
    group.location = new THREE.Vector3(10, 0, 0);

    // Child's world position should reflect group's transform
    const worldPosition = new THREE.Vector3().setFromMatrixPosition(child1.matrix_world);
    expect(worldPosition).toEqual(new THREE.Vector3(10, 0, 0));
  });

  it("should update nested group transforms correctly, including rotation", () => {
    const rootGroup = new PCDGroup("RootGroup");
    const parentGroup = new PCDGroup("ParentGroup");
    const childGroup = new PCDGroup("ChildGroup");
    const pcd = new PCD("ChildPCD");
  
    rootGroup.addPCD(parentGroup);
    parentGroup.addPCD(childGroup);
    childGroup.addPCD(pcd);
  
    // Change parent's location
    parentGroup.location = new THREE.Vector3(5, 0, 0);
  
    // Change child's location and rotation
    childGroup.location = new THREE.Vector3(3, 0, 0);
    childGroup.rotation = new THREE.Euler(Math.PI / 2, 0, 0); // Rotate 90 degrees around X-axis
  
    // Update transforms
    rootGroup.updateWorldTransform();
  
    // Final PCD position should reflect both group transforms
    const childWorldPosition = new THREE.Vector3().setFromMatrixPosition(pcd.matrix_world);
    expect(childWorldPosition).toEqual(new THREE.Vector3(8, 0, 0)); // 5 + 3
  
    const childLocalPosition = new THREE.Vector3().setFromMatrixPosition(childGroup.matrix_local);
    expect(childLocalPosition).toEqual(new THREE.Vector3(3, 0, 0));
  
    const parentLocalPosition = new THREE.Vector3().setFromMatrixPosition(parentGroup.matrix_local);
    expect(parentLocalPosition).toEqual(new THREE.Vector3(5, 0, 0));
  
    // Rotation verification
    const childLocalRotation = new THREE.Quaternion();
    childGroup.matrix_local.decompose(new THREE.Vector3(), childLocalRotation, new THREE.Vector3());
    const expectedLocalRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    expect(childLocalRotation.equals(expectedLocalRotation)).toBe(true);
  
    const childWorldRotation = new THREE.Quaternion();
    pcd.matrix_world.decompose(new THREE.Vector3(), childWorldRotation, new THREE.Vector3());
    expect(childWorldRotation.equals(expectedLocalRotation)).toBe(true); // Matches local rotation because parent has no rotation
  });
  

  it("should handle visibility changes for all children", () => {
    const child1 = new PCD("Child1");
    const child2 = new PCD("Child2");

    group.addPCD(child1);
    group.addPCD(child2);

    // Set visibility
    group.setVisibility(false);
    expect(child1.points.visible).toBe(false);
    expect(child2.points.visible).toBe(false);

    group.setVisibility(true);
    expect(child1.points.visible).toBe(true);
    expect(child2.points.visible).toBe(true);
  });

  it("should propagate changes to nested children", () => {
    const parentGroup = new PCDGroup("ParentGroup");
    const childGroup = new PCDGroup("ChildGroup");
    const pcd = new PCD("ChildPCD");

    parentGroup.addPCD(childGroup);
    childGroup.addPCD(pcd);

    // Change parent group's scale
    parentGroup.scale = new THREE.Vector3(2, 2, 2);

    // Verify nested child's world scale
    const worldScale = new THREE.Vector3();
    pcd.matrix_world.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale);
    expect(worldScale).toEqual(new THREE.Vector3(2, 2, 2));
  });


  it("should set visibility for all PCDs in the group", () => {
    group.setVisibility(false);

    expect(pcd1.visible).toBe(false);
    expect(pcd2.visible).toBe(false);
    expect(pcd3.visible).toBe(false);

    group.setVisibility(true);

    expect(pcd1.visible).toBe(true);
    expect(pcd2.visible).toBe(true);
    expect(pcd3.visible).toBe(true);
  });

  it("should set size for all PCDs in the group", () => {
    group.setSize(5);

    expect(pcd1.size).toBe(5);
    expect(pcd2.size).toBe(5);
    expect(pcd3.size).toBe(5);
  });

  it("should set color for all PCDs in the group", () => {
    const newColor = 0x00ff00; // 초록색
    group.setColor(newColor);

    expect(pcd1.color.getHex()).toBe(newColor);
    expect(pcd2.color.getHex()).toBe(newColor);
    expect(pcd3.color.getHex()).toBe(newColor);
  });

  it("should recursively apply changes to subgroups", () => {
    const newColor = 0x0000ff; // 파란색
    group.setColor(newColor);

    expect(pcd3.color.getHex()).toBe(newColor);
    expect(subGroup.children[0].color.getHex()).toBe(newColor); // Subgroup의 PCD 확인
  });
});
