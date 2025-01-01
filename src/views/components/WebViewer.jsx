// src/components/WebViewer/WebViewer.jsx
import React, { useRef, useEffect, useState } from "react";
import { WebController } from "../../domains/WebController";
import { readPCDFile } from "../../domains/PCDFileReader";
import PCDFileTree from "./PCDFileTree";
import * as THREE from "three";

import TransformationEditor from "./TransformationEditor";
import RotationEditor from "./RotationEditor";

const WebViewer = () => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);

  const [loadedFiles, setLoadedFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [modifiers, setModifiers] = useState([]); // 특정 파일에 대한 Modifier들
  const [rotationAxes, setRotationAxes] = useState([]); // 회전축 UI
  const dragCounter = useRef(0);
  
  const [showPanels, setShowPanels] = useState(false); // T 키로 토글
  const [transformationMode, setTransformationMode] = useState(null);

  useEffect(() => {
    if (containerRef.current) {
      const controller = new WebController(containerRef.current);
      controller.init("orbit");
      controllerRef.current = controller;

      return () => {
        controller.dispose();
      };
    }
  }, []);

  // 선택된 파일이 바뀔 때마다, 회전축/Modifiers UI 갱신
  useEffect(() => {
    if (selectedFiles.length > 0) {
      updateRotationAxes();
      updateModifiers();
    } else {
      setRotationAxes([]);
      setModifiers([]);
    }
  }, [selectedFiles]);

  // 키보드
  useEffect(() => {
    const handleKeyDown = (event) => {
      // T => 패널 토글
      if (event.key.toLowerCase() === "t") {
        setShowPanels((prev) => !prev);
      }
      if (!controllerRef.current) return;

      // ESC => 선택 해제 + 변환 취소
      if (event.key.toLowerCase() === "escape") {
        setSelectedFiles([]);
        setRotationAxes([]);
        controllerRef.current.cancelTransformation();
        controllerRef.current.clearSelection();
        
      }

      // WebController의 handleKeyDown
      controllerRef.current.handleKeyDown(event);
      setTransformationMode(controllerRef.current.getTransformationMode());
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /**
   * Modifiers
   */
  const updateModifiers = () => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;

    const modifierList = [];
    selectedFiles.forEach((fileName) => {
      const pcd = controller.PCDs.get(fileName);
      if (pcd) {
        // 현재 pcd.modifiers 배열을 복사
        modifierList.push({ name: fileName, modifiers: [...pcd.modifiers] });
      }
    });
    setModifiers(modifierList);
  };

  const handleAddModifier = (fileName, type) => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;

    let modifier = null;
    if (type === "transformation") {
      modifier = { transformation: { matrix: new THREE.Matrix4().identity() } };
    } else if (type === "rotation") {
      modifier = {
        rotation: {
          axisPos: new THREE.Vector3(0, 0, 0),
          axisDir: new THREE.Vector3(1, 0, 0),
          speed: 1.0,
        },
      };
    }
    controller.addModifierToPCD(fileName, modifier);
    updateModifiers();
  };

  const handleRemoveModifier = (fileName, index) => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;
    controller.removeModifierFromPCD(fileName, index);
    updateModifiers();
  };

  // Modifier 속성 수정
  const handleModifierChange = (fileName, index, field, value) => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;
    const pcd = controller.PCDs.get(fileName);
    if (!pcd) return;

    const modifier = pcd.modifiers[index];
    if (modifier.rotation && field in modifier.rotation) {
      if (field === "speed") {
        modifier.rotation.speed = parseFloat(value);
      } else {
        // axisPos / axisDir => "x,y,z" 문자를 Vector3로
        const vec = new THREE.Vector3(...value.split(",").map(Number));
        // axisDir은 normalize()
        if (field === "axisDir") vec.normalize();
        modifier.rotation[field] = vec;
      }
    } else if (modifier.transformation && field === "matrix") {
      // 행렬 "1,0,0,0, 0,1,0,0, ..." 같은 문자열을 parse
      const arr = value.split(",").map(Number);
      const mat = new THREE.Matrix4().fromArray(arr);
      modifier.transformation.matrix = mat;
    }
    // 재적용 (PCD 내부에서 프레임마다 applyModifiers()가 호출되긴 하지만, 즉시 반영 위해)
    pcd.applyModifiers();
    updateModifiers();
  };

  /**
   * Rotation Axes (예: 브리징된 rotationData)
   */
  const updateRotationAxes = () => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;

    const axesAll = [];
    selectedFiles.forEach((fileName) => {
      const pcd = controller.PCDs.get(fileName);
      if (pcd) {
        const pcdAxes = pcd.getRotationAxes(); // [{ axisPos, axisDir, speed, __modIndex }, ...]
        axesAll.push({ name: fileName, axes: pcdAxes });
      }
    });
    setRotationAxes(axesAll);
  };

  const handleAddRotationAxis = (fileName) => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;
    // X축 speed=1.0
    controller.addRotationAxisToPCD(fileName, new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 1.0);
    updateRotationAxes();
  };

  const handleAxisChange = (fileName, index, field, value) => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;
    const pcd = controller.PCDs.get(fileName);
    if (!pcd) return;

    // React state 배열 복사
    const newRotationAxes = JSON.parse(JSON.stringify(rotationAxes));
    const targetFileAxes = newRotationAxes.find((item) => item.name === fileName);
    if (!targetFileAxes) return;
    const axisItem = targetFileAxes.axes[index];
    if (!axisItem) return;

    if (field === "speed") {
      axisItem.speed = parseFloat(value);
    } else if (field === "axisPos" || field === "axisDir") {
      const vec = new THREE.Vector3(...value.split(",").map(Number));
      if (field === "axisDir") vec.normalize();
      axisItem[field] = vec;
    }

    // pcd.updateRotationAxis( index, axisPos, axisDir, speed )
    pcd.updateRotationAxis(index, axisItem.axisPos, axisItem.axisDir, axisItem.speed);

    setRotationAxes(newRotationAxes);
  };

  const handleRemoveRotationAxis = (fileName, index) => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;
    controller.removeRotationAxisFromPCD(fileName, index);
    updateRotationAxes();
  };

  /**
   * 드래그&드롭
   */
  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(event.dataTransfer.files);
    const pcdFiles = files.filter((f) => f.name.toLowerCase().endsWith(".pcd"));

    for (const file of pcdFiles) {
      try {
        const result = await readPCDFile(file, loadedFiles);
        const { pcd, fileName } = result;
        controllerRef.current.addPCD(fileName, pcd);
        setLoadedFiles((prev) => [...prev, { name: fileName, pcd }]);
      } catch (error) {
        console.error("Failed to read PCD file:", error);
      }
    }
  };

  /**
   * 마우스 클릭
   */
  const handleCanvasClick = (event) => {
    if (!controllerRef.current) return;
    const { appState } = controllerRef.current;
    // 변환 중이면 적용
    if (appState === "TRANSFORM") {
      controllerRef.current.applyTransformation();
      setTransformationMode(null);
      updateModifiers();
    } else {
      // 아니면 클릭된 PCD 선택
      const isMultiSelect = event.shiftKey;
      controllerRef.current.handlePCDSelection(event, isMultiSelect, false);
      const selectedNames = Array.from(controllerRef.current.selectedPCDs);
      setSelectedFiles(selectedNames);
    }
  };

  const handleMouseMove = (event) => {
    controllerRef.current?.handleMouseMove(event);
  };

  const handleMouseUp = () => {};

  /**
   * 파일트리 선택
   */
  const handleFileTreeSelect = (fileName, isMultiSelect) => {
    let updatedSelectedFiles = [];
    if (isMultiSelect) {
      updatedSelectedFiles = selectedFiles.includes(fileName)
        ? selectedFiles.filter((n) => n !== fileName)
        : [...selectedFiles, fileName];
    } else {
      updatedSelectedFiles = [fileName];
    }
    setSelectedFiles(updatedSelectedFiles);

    // Controller와 동기화
    controllerRef.current.clearSelection();
    updatedSelectedFiles.forEach((name) => {
      const f = loadedFiles.find((f) => f.name === name);
      if (f) {
        controllerRef.current.toggleSelection(name, f.pcd.getPoints(), true, false);
      }
    });
    updateRotationAxes();
    updateModifiers();
  };

  const handleToggleVisibility = (fileName) => {
    const targetFile = loadedFiles.find((f) => f.name === fileName);
    if (targetFile) {
      targetFile.pcd.toggleVisibility();
    }
  };

  const handleDeleteFile = (fileName) => {
    controllerRef.current.unregisterObject(fileName);
    setLoadedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setSelectedFiles((prev) => prev.filter((n) => n !== fileName));
  };

  return (
    <div style={{ display: "flex", position: "relative", height: "100vh", width: "100%" }}>
      <div
        ref={containerRef}
        style={{ flex: 1, backgroundColor: "#000" }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {isDragging && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "1.5em",
              zIndex: 10,
            }}
          >
            Drag and Drop PCD Files Here
          </div>
        )}
        {transformationMode && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              padding: "5px 10px",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "#fff",
              borderRadius: "5px",
              zIndex: 10,
            }}
          >
            {`Transformation Mode: ${transformationMode.toUpperCase()}`}
          </div>
        )}
      </div>

      {/* 패널 (T 키로 토글) */}
      {showPanels && selectedFiles.length === 1 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "300px",
            height: "100%",
            backgroundColor: "#222",
            color: "#fff",
            padding: "10px",
            overflowY: "auto",
          }}
        >
          <h3>Modifiers</h3>
          {modifiers.length > 0 ? (
            modifiers.map(({ name, modifiers: modList }) => (
              <div key={name} style={{ marginBottom: "20px" }}>
                <h4>{name}</h4>
                <ul>
                  {modList.map((modifier, index) => (
                    <li key={index}>
                      {modifier.transformation && (
                        <div>
                          <label>Transformation Matrix: </label>
                          <input
                            type="text"
                            value={modifier.transformation.matrix.toArray().join(",")}
                            onChange={(e) =>
                              handleModifierChange(name, index, "matrix", e.target.value)
                            }
                            style={{ width: "100%" }}
                          />
                        </div>
                      )}
                      {modifier.rotation && (
                        <div style={{ marginTop: "10px" }}>
                          <div>
                            <label>Position: </label>
                            <input
                              type="text"
                              value={modifier.rotation.axisPos.toArray().join(",")}
                              onChange={(e) =>
                                handleModifierChange(name, index, "axisPos", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label>Direction: </label>
                            <input
                              type="text"
                              value={modifier.rotation.axisDir.toArray().join(",")}
                              onChange={(e) =>
                                handleModifierChange(name, index, "axisDir", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label>Speed: </label>
                            <input
                              type="number"
                              step="0.1"
                              value={modifier.rotation.speed}
                              onChange={(e) =>
                                handleModifierChange(name, index, "speed", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveModifier(name, index)}
                        style={{ marginTop: "5px", color: "red" }}
                      >
                        Remove Modifier
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div style={{ marginBottom: "20px" }}>
              <p>No Modifiers Found</p>
            </div>
          )}

          {selectedFiles.length === 1 && (
            <div>
              <button
                onClick={() => handleAddModifier(selectedFiles[0], "rotation")}
                style={{ marginRight: "10px" }}
              >
                Add Rotation
              </button>
              <button onClick={() => handleAddModifier(selectedFiles[0], "transformation")}>
                Add Transformation
              </button>
            </div>
          )}
        </div>
      )}

      {showPanels && (
        <PCDFileTree
          files={loadedFiles}
          selectedFiles={selectedFiles}
          onSelectFile={handleFileTreeSelect}
          onToggleVisibility={handleToggleVisibility}
          onDeleteFile={handleDeleteFile}
        />
      )}
    </div>
  );
};

export default WebViewer;
