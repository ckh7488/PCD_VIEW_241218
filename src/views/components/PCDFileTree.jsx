// src/components/WebViewer/PCDFileTree.jsx
import React from "react";

const PCDFileTree = ({ files, selectedFiles, onSelectFile, onToggleVisibility, onDeleteFile }) => {
  const handleClick = (fileName, event) => {
    const isMultiSelect = event.shiftKey;
    onSelectFile(fileName, isMultiSelect);
  };

  const handleToggleVisibility = (fileName, event) => {
    event.stopPropagation();
    onToggleVisibility(fileName);
  };

  const handleDelete = (fileName, event) => {
    event.stopPropagation();
    onDeleteFile(fileName);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "250px",
        height: "100%",
        backgroundColor: "#222",
        color: "#fff",
        padding: "10px",
        overflowY: "auto",
        zIndex: 5,
      }}
    >
      <h3 style={{ borderBottom: "1px solid #555", paddingBottom: "5px" }}>
        Loaded PCD Files
      </h3>
      {files.map((file) => (
        <div
          key={file.name}
          onClick={(event) => handleClick(file.name, event)}
          style={{
            padding: "5px",
            margin: "5px 0",
            backgroundColor: selectedFiles.includes(file.name) ? "#444" : "transparent",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{file.name}</span>
            <div style={{ marginLeft: "5px" }}>
              <button
                onClick={(event) => handleToggleVisibility(file.name, event)}
                style={{ marginRight: "5px" }}
              >
                {file.pcd.visible ? "Hide" : "Show"}
              </button>
              <button onClick={(event) => handleDelete(file.name, event)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PCDFileTree;
