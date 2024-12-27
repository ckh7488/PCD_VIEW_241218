import * as THREE from "three";

export class EditManager {
    constructor() {
      this.strategy = null; // 현재 편집 전략
    }
  
    // 편집 전략 설정
    setStrategy(strategy) {
      this.strategy = strategy;
    }
  
    // 편집 작업 실행
    applyEdit(selectedItems) {
      if (!this.strategy) {
        throw new Error("No edit strategy set");
      }
      this.strategy.apply(selectedItems);
    }
  }
  
  export class EditStrategy {
    apply(selectedItems) {
      throw new Error("apply method must be implemented");
    }
  }
  
  export class TranslateStrategy extends EditStrategy {
    constructor(translation) {
      super();
      this.translation = translation; // THREE.Vector3
    }
  
    apply(selectedItems) {
      selectedItems.forEach((item) => {
        item.location.add(this.translation);
        item.updateLocalTransform();
        item.updateWorldTransform();
      });
    }
  }
  
  export class RotateStrategy extends EditStrategy {
    constructor(rotation) {
      super();
      this.rotation = rotation; // THREE.Euler
    }
  
    apply(selectedItems) {
      selectedItems.forEach((item) => {
        item.rotation.x += this.rotation.x;
        item.rotation.y += this.rotation.y;
        item.rotation.z += this.rotation.z;
        item.updateLocalTransform();
        item.updateWorldTransform();
      });
    }
  }
  
  export class ScaleStrategy extends EditStrategy {
    constructor(scale) {
      super();
      this.scale = scale; // THREE.Vector3
    }
  
    apply(selectedItems) {
      selectedItems.forEach((item) => {
        item.scale.multiply(this.scale);
        item.updateLocalTransform();
        item.updateWorldTransform();
      });
    }
  }
  
  export class ColorChangeStrategy extends EditStrategy {
    constructor(color) {
      super();
      this.color = color; // THREE.Color
    }
  
    apply(selectedItems) {
      selectedItems.forEach((item) => {
        item.setColor(this.color);
      });
    }
  }
  
  export class DeleteStrategy extends EditStrategy {
    apply(selectedItems) {
      selectedItems.forEach((item) => {
        if (item.parent) {
          item.parent.removePCD(item); // 부모에서 제거
        }
      });
    }
  }
  
  export class DuplicateStrategy extends EditStrategy {
    apply(selectedItems) {
      selectedItems.forEach((item) => {
        const duplicate = item.clone(); // 객체 복제 (clone 메서드 필요)
        if (item.parent) {
          item.parent.addPCD(duplicate); // 부모에 복제된 객체 추가
        }
      });
    }
  }

    export class GlobalRotationStrategy extends EditStrategy {
    constructor(axis, speed) {
        super();
        this.axis = axis.normalize(); // THREE.Vector3
        this.speed = speed; // 회전 속도 (radians/sec)
    }

    apply(selectedItems) {
        selectedItems.forEach((item) => {
            const quaternion = new THREE.Quaternion().setFromAxisAngle(this.axis, this.speed);
            const currentRotation = new THREE.Quaternion().setFromEuler(item.rotation);
            const newRotation = currentRotation.multiply(quaternion);
            item.rotation.setFromQuaternion(newRotation);
            item.updateLocalTransform();
            item.updateWorldTransform();
        });
    }
    }

    export class LocalRotationStrategy extends EditStrategy {
        constructor(axis, speed) {
            super();
            this.axis = axis.normalize(); // THREE.Vector3
            this.speed = speed; // 회전 속도 (radians/sec)
        }
    
        apply(selectedItems) {
            selectedItems.forEach((item) => {
                // Rotation quaternion 생성
                const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(this.axis, this.speed);
    
                // 현재 회전 값 가져오기
                const currentQuaternion = new THREE.Quaternion().setFromEuler(item.rotation);
    
                // 새 회전을 기존 회전에 곱합
                const newQuaternion = currentQuaternion.clone().multiply(rotationQuaternion);
    
                // 결과를 item.rotation에 반영
                item.rotation.setFromQuaternion(newQuaternion);
    
                // 로컬 및 월드 변환 업데이트
                item.updateLocalTransform();
                item.updateWorldTransform();
            });
        }
    }
    
    
    

  