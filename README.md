# 2D Blueprint → 3D Model Converter

An interactive, browser-based application that transforms 2D architectural floor plans into 3D models in real time—without requiring external plugins or heavy 3D software.

🚀 **Live Demo:** [https://muthamizh499.github.io/2D-Blueprints-into-3D-Model/](https://muthamizh499.github.io/2D-Blueprints-into-3D-Model/)

---

## 📌 Overview

### **Problem**
Traditional 2D architectural blueprints and floor plans can be difficult for clients, buyers, and non-technical stakeholders to visualize in physical space. Standard 3D modeling tools often require complex software installations, steep learning curves, and significant manual effort.

### **Solution**
This project provides an intuitive web platform that converts 2D floor plans into interactive 3D representations instantly. Powered purely by web technologies, users can upload blueprints, edit structural elements, and view a dynamic 3D rendering directly in their web browser.

---

## ✨ Key Features

- **Blueprint Image Upload:** Drag-and-drop or select blueprint images with instant preview and image dimension calculation.
- **Basic Blueprint Detection & Manual Editor:** Detect structural layouts automatically or fine-tune wall boundaries manually using an interactive 2D canvas editor.
- **Interactive 3D Model Viewer:** Real-time 3D projection with intuitive camera controls:
  - **Drag:** Rotate 3D camera
  - **Scroll:** Zoom in / out
- **Model Parameters & Customization:** Adjust structural variables dynamically:
  - Wall Height *(e.g., default 3.0 m)*
  - Wall Thickness *(e.g., default 0.2 m)*
- **Live Model Statistics:** Dynamic tracking of:
  - Wall count, room count, doors, and windows
  - Total estimated surface area
- **Export Capabilities:** Export generated floor plan data and 3D model configurations for downstream use.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Graphics & Rendering:** HTML5 Canvas API, Custom 3D Projection Algorithm
- **Deployment:** GitHub Pages

---

## 🎯 Applications

- **Architecture & Interior Design:** Rapid prototyping and preliminary design reviews with clients.
- **Real Estate & Property Marketing:** Interactive property floor plan visualizations for prospective buyers.
- **Construction Planning:** Quick spatial estimations and structural layout checks.
- **Education & Training:** Teaching architectural drafting and spatial visualization.

---

## 📂 Project Structure

```text
2D-Blueprints-into-3D-Model/
├── index.html        # Main HTML layout & application interface
├── css/              # Stylesheets for UI layout and themes
├── js/               # JavaScript logic (2D Editor, 3D Projection, UI handlers)
└── README.md         # Project documentation
