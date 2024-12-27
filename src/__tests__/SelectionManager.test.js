import SelectionManager from "../domains/SelectionManager";
import PCD from "../domains/PCD";

describe("SelectionManager Class", () => {
  let selectionManager, pcd1, pcd2, pcd3;

  beforeEach(() => {
    selectionManager = new SelectionManager();
    pcd1 = new PCD("PCD1");
    pcd2 = new PCD("PCD2");
    pcd3 = new PCD("PCD3");
  });

  it("should select a single PCD", () => {
    selectionManager.select(pcd1);
    expect(selectionManager.getSelectedItems()).toContain(pcd1); // 객체 포함 여부 확인
  });
  

  it("should deselect a selected PCD", () => {
    selectionManager.select(pcd1);
    selectionManager.deselect(pcd1);
    expect(selectionManager.getSelectedItems()).toEqual([]);
  });

  it("should toggle selection state of a PCD", () => {
    selectionManager.toggleSelection(pcd1); // Select
    expect(selectionManager.getSelectedItems()).toEqual([pcd1]);

    selectionManager.toggleSelection(pcd1); // Deselect
    expect(selectionManager.getSelectedItems()).toEqual([]);
  });

  it("should select multiple PCDs", () => {
    selectionManager.select(pcd1);
    selectionManager.select(pcd2);
    expect(selectionManager.getSelectedItems()).toEqual([pcd1, pcd2]);
  });

  it("should deselect all PCDs", () => {
    selectionManager.select(pcd1);
    selectionManager.select(pcd2);
    selectionManager.deselectAll();
    expect(selectionManager.getSelectedItems()).toEqual([]);
  });
});
