// src/components/WebViewer/WebViewer.jsx
import React, { useRef, useEffect, useState } from "react";
import { WebController } from "../../domains/WebController";
import { readPCDFile } from "../../domains/PCDFileReader"; // 가정: 직접 구현
import PCDFileTree from "./PCDFileTree";                 // 가정: 좌측 파일 트리
import * as THREE from "three";

const WebViewer = () => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [transformationMode, setTransformationMode] = useState(null);
  const dragCounter = useRef(0);

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

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key.toLowerCase()) {
        case "c": {
          // 선택된 PCD들에 회전 축, 속도 설정
          if (selectedFiles.length > 0) {
            const axisInput = prompt("Enter rotation axis as x,y,z (e.g., 0,1,0):", "0,1,0");
            const speedInput = prompt("Enter rotation speed (e.g., 0.01):", "0.01");
            if (axisInput && speedInput) {
              const axis = axisInput.split(",").map(Number);
              const speed = parseFloat(speedInput);
              if (axis.length === 3 && !isNaN(speed)) {
                const axisVector = new THREE.Vector3(...axis).normalize();
                controllerRef.current.setRotation(selectedFiles, axisVector, speed);
              } else {
                alert("Invalid input. Please provide valid axis and speed values.");
              }
            }
          }
          break;
        }
        case "a": {
          // 축 표시 토글
          controllerRef.current.toggleAxis();
          break;
        }
        case "g": {
          if (controllerRef.current.getTransformationMode()) {
            // 이미 변환중이면 취소 or 적용
            controllerRef.current.cancelTransformation();
            setTransformationMode(null);
            break;
          }
          // 새 transform 모드
          if (!controllerRef.current.startTransformation("translate")) break;
          setTransformationMode("translate");
          break;
        }
        case "s": {
          if (controllerRef.current.getTransformationMode()) {
            controllerRef.current.cancelTransformation();
            setTransformationMode(null);
            break;
          }
          if (!controllerRef.current.startTransformation("scale")) break;
          setTransformationMode("scale");
          break;
        }
        case "r": {
          if (controllerRef.current.getTransformationMode()) {
            controllerRef.current.cancelTransformation();
            setTransformationMode(null);
            break;
          }
          if (!controllerRef.current.startTransformation("rotate")) break;
          setTransformationMode("rotate");
          break;
        }
        case "escape": {
          controllerRef.current.cancelTransformation();
          setTransformationMode(null);
          controllerRef.current.clearSelection();
          setSelectedFiles([]);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedFiles]);

  // 드래그&드롭 (PCD 파일 로드)
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
        const fileExists = loadedFiles.some((f) => f.name === file.name);
        if (fileExists) {
          console.warn(`File ${file.name} is already loaded.`);
          continue;
        }
        const pcd = await readPCDFile(file);
        // WebController에 추가
        controllerRef.current.addPCD(file.name, pcd);
        setLoadedFiles((prev) => [...prev, { name: file.name, pcd }]);
      } catch (error) {
        console.error("Failed to read PCD file:", error);
      }
    }
  };

  // 캔버스 클릭 → PCD 선택
  const handleCanvasClick = (event) => {
    if (!controllerRef.current) return;
    const isMultiSelect = event.shiftKey;
    controllerRef.current.handlePCDSelection(event, isMultiSelect, false);
    // 선택 목록 갱신
    const selectedNames = Array.from(controllerRef.current.selectedPCDs);
    setSelectedFiles(selectedNames);
  };

  // 좌측 트리에서 파일 선택 시
  const handleFileTreeSelect = (fileName, isMultiSelect) => {
    let updatedSelectedFiles = [];
    if (isMultiSelect) {
      updatedSelectedFiles = selectedFiles.includes(fileName)
        ? selectedFiles.filter((name) => name !== fileName)
        : [...selectedFiles, fileName];
    } else {
      updatedSelectedFiles = [fileName];
    }
    setSelectedFiles(updatedSelectedFiles);

    // 컨트롤러에서도 하이라이트
    controllerRef.current.clearSelection();
    updatedSelectedFiles.forEach((name) => {
      const file = loadedFiles.find((f) => f.name === name);
      if (file) {
        controllerRef.current.toggleSelection(name, file.pcd.getPoints(), true, false);
      }
    });
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
        onMouseDown={(e) => controllerRef.current?.handleMouseDown(e)}
        onMouseMove={(e) => controllerRef.current?.handleMouseMove(e)}
        onMouseUp={() => controllerRef.current?.handleMouseUp(setTransformationMode)}
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

      {/* 좌측 트리 뷰 */}
      <PCDFileTree
        files={loadedFiles}
        selectedFiles={selectedFiles}
        onSelectFile={handleFileTreeSelect}
      />
    </div>
  );
};

export default WebViewer;
