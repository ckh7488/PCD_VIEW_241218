import PCD from '../domains/PCD'; // PCD 클래스 가져오기
import * as THREE from 'three';  // Three.js 모듈

describe('PCD Class', () => {
  let pcd;

  beforeEach(() => {
    // 테스트마다 새로운 PCD 인스턴스 초기화
    pcd = new PCD('TestPCD');
  });
  
  afterEach(() => {
    // 필요 시 추가적으로 Three.js 리소스 해제
    pcd = null; // PCD 객체 참조 해제
  });

  //rotation
  it("should initialize with default rotation properties", () => {
    expect(pcd.rotation).toEqual(new THREE.Euler(0, 0, 0));
    expect(pcd.rotationSpeed).toBe(0);
    expect(pcd.rotationAxis).toEqual(new THREE.Vector3(0, 1, 0));
  });

  it("should set rotation properties correctly", () => {
    const axis = new THREE.Vector3(1, 0, 0); // X-axis
    const speed = Math.PI / 2; // 90 degrees/second

    pcd.setRotation(axis, speed);

    expect(pcd.rotationAxis).toEqual(axis.normalize());
    expect(pcd.rotationSpeed).toBe(speed);
  });

  it("should apply rotation update correctly when active", () => {
    const axis = new THREE.Vector3(0, 1, 0); // Y-axis
    const speed = Math.PI / 2; // 90 degrees/second
    const deltaTime = 1; // 1 second
  
    pcd.setRotation(axis, speed);
  
    const initialQuaternion = new THREE.Quaternion();
    pcd.updateRotation(deltaTime);
  
    const expectedQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 2);
    const currentQuaternion = new THREE.Quaternion().setFromEuler(pcd.rotation);
  
    expect(currentQuaternion.equals(expectedQuaternion)).toBe(true); // Rotated by 90 degrees
  });
  

  it("should not update rotation when speed is 0", () => {
    const deltaTime = 1; // 1 second

    const initialRotation = new THREE.Euler(0,1,0);
    pcd.rotation = initialRotation.clone();

    pcd.updateRotation(deltaTime);

    expect(pcd.rotation.equals(initialRotation)).toBe(true); // No change
  });

  it("should clear rotation properties correctly", () => {
    const axis = new THREE.Vector3(1, 0, 0);
    const speed = Math.PI / 2;

    pcd.setRotation(axis, speed);
    pcd.clearRotation();

    expect(pcd.rotationSpeed).toBe(0); // Speed reset
  });




  it('should initialize with the correct name', () => {
    expect(pcd.name).toBe('TestPCD');
  });




  it('should add points correctly', () => {
    const points = [
      [0, 0, 0, 0xff0000], // 빨간색 포인트
      [1, 1, 1, 0x00ff00], // 초록색 포인트
    ];
    pcd.addPoints(points);
  
    // Geometry 확인
    const positions = pcd.geometry.attributes.position.array;
    expect(positions).toEqual(new Float32Array([0, 0, 0, 1, 1, 1]));
  
    const colors = pcd.geometry.attributes.color.array;
    expect(colors).toEqual(new Float32Array([
      1, 0, 0,   // 빨간색
      0, 1, 0    // 초록색
    ]));
  });
  

  it('should handle invalid or duplicate indices when removing points', () => {
    const points = [
      [0, 0, 0, 0xff0000], // 빨간색 포인트
      [1, 1, 1, 0x00ff00], // 초록색 포인트
    ];
    pcd.addPoints(points);
  
    // 없는 인덱스와 중복 인덱스 테스트
    pcd.removePointsByIndices([0, 2, 0]);
  
    // 첫 번째 포인트 삭제, 두 번째 포인트 유지
    const positions = pcd.geometry.attributes.position.array;
    expect(positions).toEqual(new Float32Array([1, 1, 1]));
  
    const colors = pcd.geometry.attributes.color.array;
    expect(colors).toEqual(new Float32Array([0, 1, 0])); // 초록색만 남음
  });
  



  it('should update local transform correctly', () => {
    pcd.location.set(1, 2, 3);
    pcd.rotation.set(Math.PI / 4, Math.PI / 4, Math.PI / 4);
    pcd.scale.set(2, 2, 2);

    pcd.updateLocalTransform();

    const expectedMatrix = new THREE.Matrix4();
    expectedMatrix.compose(
      new THREE.Vector3(1, 2, 3),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 4, Math.PI / 4, Math.PI / 4)),
      new THREE.Vector3(2, 2, 2)
    );

    expect(pcd.matrix_local.equals(expectedMatrix)).toBe(true);
  });





  it('should propagate local transform changes to children', () => {
    const parent = new PCD('ParentPCD');
    const child = new PCD('ChildPCD');
  
    parent.addChild(child);
  
    // 부모 위치 변경
    parent.location = new THREE.Vector3(10, 0, 0);
  
    // 자식 월드 위치 확인
    const worldPosition = new THREE.Vector3().setFromMatrixPosition(child.matrix_world);
    expect(worldPosition).toEqual(new THREE.Vector3(10, 0, 0)); // 부모 위치만 반영
  
    // 자식 로컬 위치 설정 후 확인
    child.location = new THREE.Vector3(1, 0, 0);
    child.updateWorldTransform();
    const updatedWorldPosition = new THREE.Vector3().setFromMatrixPosition(child.matrix_world);
    expect(updatedWorldPosition).toEqual(new THREE.Vector3(11, 0, 0)); // 부모(10,0,0) + 자식(1,0,0)
  });
  




  it('should manage parent-child relationships correctly', () => {
    const child = new PCD('ChildPCD');
    pcd.addChild(child);

    expect(pcd.children).toContain(child);
    expect(child.parent).toBe(pcd);

    pcd.removeChild(child);

    expect(pcd.children).not.toContain(child);
    expect(child.parent).toBe(null);
  });



  it("should initialize with default properties", () => {
    expect(pcd.visible).toBe(true); // 기본 가시성
    expect(pcd.size).toBe(1); // 기본 크기
    expect(pcd.color.getHex()).toBe(0xffffff); // 기본 색상 (흰색)
  });


  it("should set visibility correctly", () => {
    pcd.setVisibility(false);
    expect(pcd.visible).toBe(false);
    expect(pcd.points.visible).toBe(false); // Three.js Mesh에 반영

    pcd.setVisibility(true);
    expect(pcd.visible).toBe(true);
    expect(pcd.points.visible).toBe(true);
  });



  it("should toggle visibility", () => {
    pcd.toggleVisibility();
    expect(pcd.visible).toBe(false);

    pcd.toggleVisibility();
    expect(pcd.visible).toBe(true);
  });



  it("should set size correctly", () => {
    pcd.setSize(3);
    expect(pcd.size).toBe(3);
    expect(pcd.material.size).toBe(3); // Three.js Material에 반영
  });



  it("should set color correctly", () => {
    const newColor = 0xff0000; // 빨간색
    pcd.setColor(newColor);

    expect(pcd.color.getHex()).toBe(newColor);
    expect(pcd.material.color.getHex()).toBe(newColor); // Three.js Material에 반영
  });
});
