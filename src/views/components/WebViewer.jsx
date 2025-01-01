// src/components/WebViewer/WebViewer.jsx
import React, { useRef, useEffect, useState } from "react";
import { WebController } from "../../domains/WebController";
import { readPCDFile } from "../../domains/PCDFileReader";
import PCDFileTree from "./PCDFileTree";
import * as THREE from "three";

const WebViewer = () => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [rotationAxes, setRotationAxes] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [transformationMode, setTransformationMode] = useState(null);
  const [showPanels, setShowPanels] = useState(false); // T 키로 토글
  const dragCounter = useRef(0);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      updateRotationAxes(); // 선택된 파일에 대한 축 정보 업데이트
    } else {
      setRotationAxes([]); // 선택된 파일이 없을 경우 초기화
    }
  }, [selectedFiles]);

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

  // 키보드
  useEffect(() => {

    const handleKeyDown = (event) => {
      if (event.key.toLowerCase() === "t") {
        setShowPanels((prev) => !prev); // T 키로 토글
      }
      if (!controllerRef.current) return;
      if (event.key.toLowerCase() === "escape") {
        setSelectedFiles([]); // 선택된 파일 초기화
        setRotationAxes([]); // 회전 축 데이터 초기화
        controllerRef.current.cancelTransformation();
        controllerRef.current.clearSelection();
        return;
      }
      controllerRef.current.handleKeyDown(event);
      setTransformationMode(controllerRef.current.getTransformationMode());
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 회전 축 정보 업데이트
  const updateRotationAxes = () => {
    if (!controllerRef.current) return;

    const axes = [];
    selectedFiles.forEach((fileName) => {
      const pcd = controllerRef.current.PCDs.get(fileName);
      if (pcd) {
        const pcdAxes = pcd.getRotationAxes();
        axes.push({ name: fileName, axes: pcdAxes });
      }
    });
    setRotationAxes(axes);
  };

  // 회전 축 추가
  const handleAddRotationAxis = (fileName) => {
    const controller = controllerRef.current;
    if (!controller) return;

    const axisPos = new THREE.Vector3(0, 0, 0); // 기준점
    const axisDir = new THREE.Vector3(1, 0, 0); // X축 방향
    const speed = 1.0; // 속도

    controller.addRotationAxisToPCD(fileName, axisPos, axisDir, speed);
    updateRotationAxes();
  };

  // 회전 속성 변경
  const handleAxisChange = (fileName, index, field, value) => {
    const controller = controllerRef.current;
    if (!controller) return;

    const pcd = controller.PCDs.get(fileName);
    if (!pcd) return;

    const newRotationAxes = [...rotationAxes];
    const axis = newRotationAxes.find((item) => item.name === fileName).axes[index];
    if (field === "speed") {
      axis.speed = parseFloat(value);
    } else if (field === "axisPos" || field === "axisDir") {
      axis[field] = new THREE.Vector3(...value.split(",").map(Number));
    }

    pcd.updateRotationAxis(index, axis.axisPos, axis.axisDir, axis.speed);
    setRotationAxes(newRotationAxes);
  };

  // 회전 축 삭제
  const handleRemoveRotationAxis = (fileName, index) => {
    const controller = controllerRef.current;
    if (!controller) return;

    controller.removeRotationAxisFromPCD(fileName, index);
    updateRotationAxes();
  };

  // 드래그&드롭
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
    const pcdFiles = files.filter((file) => file.name.toLowerCase().endsWith(".pcd"));

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
   * 클릭 -> 변환중이면 확정, 아니면 PCD선택
   */
  const handleCanvasClick = (event) => {
    if (!controllerRef.current) return;
    const { appState } = controllerRef.current;
    if (appState === "TRANSFORM") {
      controllerRef.current.applyTransformation();
      setTransformationMode(null);
    } else {
      const isMultiSelect = event.shiftKey;
      controllerRef.current.handlePCDSelection(event, isMultiSelect, false);
      const selectedNames = Array.from(controllerRef.current.selectedPCDs);
      setSelectedFiles(selectedNames);
    }
  };

  // 마우스 이동 -> G/R 모드시 오브젝트가 마우스를 따라감
  const handleMouseMove = (event) => {
    controllerRef.current?.handleMouseMove(event);
  };

  // mouseUp -> 안 써도 됨(블렌더식)
  const handleMouseUp = () => { };

  // 파일트리
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

    // 컨트롤러 동기화
    controllerRef.current.clearSelection();
    updatedSelectedFiles.forEach((name) => {
      const file = loadedFiles.find((f) => f.name === name);
      if (file) {
        controllerRef.current.toggleSelection(name, file.pcd.getPoints(), true, false);
      }
    });
    updateRotationAxes();
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
      {/* 왼쪽 Rotation Axes */}
      {/* 왼쪽 Rotation Axes */}
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
            zIndex: 5,
          }}
        >
          <h3>Rotation Axes</h3>
          {rotationAxes.length > 0 ? (
            rotationAxes.map(({ name, axes }) => (
              <div key={name} style={{ marginBottom: "20px" }}>
                <h4>{name}</h4>
                <ul>
                  {axes.map((axis, index) => (
                    <li key={index}>
                      <div style={{ marginBottom: "10px" }}>
                        <div>
                          <label>Position: </label>
                          <input
                            type="text"
                            value={axis.axisPos.toArray().join(", ")}
                            onChange={(e) =>
                              handleAxisChange(name, index, "axisPos", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label>Direction: </label>
                          <input
                            type="text"
                            value={axis.axisDir.toArray().join(", ")}
                            onChange={(e) =>
                              handleAxisChange(name, index, "axisDir", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label>Speed: </label>
                          <input
                            type="number"
                            step="0.1"
                            value={axis.speed}
                            onChange={(e) =>
                              handleAxisChange(name, index, "speed", e.target.value)
                            }
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveRotationAxis(name, index)}
                          style={{ marginTop: "5px", color: "red" }}
                        >
                          Remove Axis
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleAddRotationAxis(name)}>Add New Axis</button>
              </div>
            ))
          ) : (
            <div style={{ marginBottom: "20px" }}>
              <h4>No Rotation Axes Found</h4>
              <button onClick={() => handleAddRotationAxis(selectedFiles[0])}>
                Add First Axis
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
