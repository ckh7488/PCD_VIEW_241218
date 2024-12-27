export default class SelectionManager {
    constructor() {
      this.selectedItems = []; // 선택된 객체 리스트
    }
  
    // 객체 선택
    select(item) {
      if (!this.selectedItems.includes(item)) {
        this.selectedItems.push(item);
      }
    }
  
    // 객체 선택 취소
    deselect(item) {
      const index = this.selectedItems.indexOf(item);
      if (index !== -1) {
        this.selectedItems.splice(index, 1);
      }
    }
  
    // 선택 상태 토글
    toggleSelection(item) {
      if (this.selectedItems.includes(item)) {
        this.deselect(item);
      } else {
        this.select(item);
      }
    }
  
    // 선택된 객체 반환
    getSelectedItems() {
      return this.selectedItems;
    }
  
    // 전체 선택 취소
    deselectAll() {
      this.selectedItems = [];
    }
  }
  