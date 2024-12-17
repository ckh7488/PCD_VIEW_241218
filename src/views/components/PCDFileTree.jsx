import React from "react";

const PCDFileTree = ({ files, onToggleVisibility, onRemoveFile, onSelectFile, visible }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: visible ? 0 : "-250px", // 토글 시 이동
        width: "250px",
        height: "100%",
        backgroundColor: "#222",
        color: "#fff",
        padding: "10px",
        boxSizing: "border-box",
        transition: "right 0.3s ease-in-out", // 부드러운 전환
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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <div
            onClick={() => onSelectFile(file.name)}
            style={{ cursor: "pointer", flex: 1 }}
          >
            {file.name}
          </div>
          <input
            type="checkbox"
            checked={file.visible}
            onChange={() => onToggleVisibility(file.name)}
            style={{ marginRight: "10px" }}
          />
          <button
            onClick={() => onRemoveFile(file.name)}
            style={{
              backgroundColor: "#ff5555",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "2px 5px",
            }}
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
};

export default PCDFileTree;
