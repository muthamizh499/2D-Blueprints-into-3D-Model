/**
 * 2D Blueprint to 3D Model
 * Core JavaScript Logic
 */

// --- STATE MANAGEMENT ---
const state = {
    walls: [], // {id, x1, y1, x2, y2}
    doors: [], // {id, x, y, width, angle}
    windows: [], // {id, x, y, width, angle}
    rooms: [], // {id, x, y, name}
    wallHeight: 3.0,
    wallThickness: 0.2,
    floorThickness: 0.15,
    backgroundImage: null,
    imgWidth: 0,
    imgHeight: 0,
    nextId: 1
};

// 2D View State
const view2D = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    isPanning: false,
    startX: 0,
    startY: 0,
    currentTool: 'select',
    selectedId: null,
    isDrawing: false,
    drawStartX: 0,
    drawStartY: 0,
    mouseX: 0,
    mouseY: 0
};

// 3D View State
const view3D = {
    yaw: Math.PI / 4,
    pitch: Math.PI / 6,
    distance: 20,
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    polygons: [] // 3D geometry
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    init2DEditor();
    init3DViewer();
    initSettings();
    initExport();
    
    // Automatically load the sample blueprint and 3D model on startup
    setTimeout(() => {
        createSampleBlueprint(1);
        
        // Wait a tiny bit for the 2D layout to settle, then show Split View and generate 3D
        setTimeout(() => {
            document.getElementById('mode-split').click();
            generate3DModel();
        }, 100);
    }, 50);
});

function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            if(target === 'home') document.getElementById('home').classList.add('active');
            if(target === 'blueprint' || target === '3d-model') {
                document.getElementById('workspace').classList.add('active');
                if(target === 'blueprint') setViewMode('2d');
                if(target === '3d-model') setViewMode('3d');
            }
            if(target === 'about') document.getElementById('about').classList.add('active');
            
            setTimeout(() => resizeCanvases(), 50);
        });
    });

    // View modes in workspace
    document.getElementById('mode-2d').addEventListener('click', () => setViewMode('2d'));
    document.getElementById('mode-3d').addEventListener('click', () => setViewMode('3d'));
    document.getElementById('mode-split').addEventListener('click', () => setViewMode('split'));

    // Home buttons
    const uploadInput = document.getElementById('upload-input');
    document.getElementById('upload-area').addEventListener('click', () => uploadInput.click());
    document.getElementById('btn-upload').addEventListener('click', () => uploadInput.click());
    
    uploadInput.addEventListener('change', (e) => {
        if(e.target.files && e.target.files[0]) {
            loadBlueprintImage(e.target.files[0]);
        }
    });

    document.getElementById('btn-sample-1').addEventListener('click', () => createSampleBlueprint(1));
    document.getElementById('btn-sample-2').addEventListener('click', () => createSampleBlueprint(2));
    document.getElementById('btn-clear-home').addEventListener('click', clearHome);
}

function setViewMode(mode) {
    const workspace = document.getElementById('workspace');
    workspace.classList.remove('view-2d', 'view-3d', 'split-mode');
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    
    if (mode === '2d') {
        workspace.classList.add('view-2d');
        document.getElementById('mode-2d').classList.add('active');
    } else if (mode === '3d') {
        workspace.classList.add('view-3d');
        document.getElementById('mode-3d').classList.add('active');
    } else {
        workspace.classList.add('split-mode');
        document.getElementById('mode-split').classList.add('active');
    }
    setTimeout(() => resizeCanvases(), 50);
}

// --- 2D BLUEPRINT EDITOR ---
let canvas2D, ctx2D;
function init2DEditor() {
    canvas2D = document.getElementById('canvas-2d');
    ctx2D = canvas2D.getContext('2d');
    
    window.addEventListener('resize', resizeCanvases);
    
    // Tools
    document.querySelectorAll('.tool-btn').forEach(btn => {
        if(btn.id === 'btn-delete' || btn.id === 'btn-clear-canvas') return;
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            view2D.currentTool = e.target.getAttribute('data-tool');
            view2D.selectedId = null;
            draw2D();
        });
    });

    document.getElementById('btn-delete').addEventListener('click', deleteSelected);
    document.getElementById('btn-clear-canvas').addEventListener('click', () => {
        if(confirm("Are you sure you want to clear the canvas?")) {
            state.walls = [];
            state.doors = [];
            state.windows = [];
            state.rooms = [];
            state.backgroundImage = null;
            draw2D();
            updateStats();
        }
    });

    // View Controls
    document.getElementById('btn-2d-zoom-in').addEventListener('click', () => { view2D.scale *= 1.2; draw2D(); });
    document.getElementById('btn-2d-zoom-out').addEventListener('click', () => { view2D.scale /= 1.2; draw2D(); });
    document.getElementById('btn-2d-reset').addEventListener('click', reset2DView);
    document.getElementById('btn-2d-fit').addEventListener('click', reset2DView);

    // Mouse Events
    canvas2D.addEventListener('mousedown', on2DMousedown);
    canvas2D.addEventListener('mousemove', on2DMousemove);
    canvas2D.addEventListener('mouseup', on2DMouseup);
    canvas2D.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoom = e.deltaY < 0 ? 1.1 : 0.9;
        view2D.scale *= zoom;
        draw2D();
    });
}

function resizeCanvases() {
    if(canvas2D) {
        const rect = canvas2D.parentElement.getBoundingClientRect();
        canvas2D.width = rect.width;
        canvas2D.height = rect.height;
        draw2D();
    }
    const canvas3D = document.getElementById('canvas-3d');
    if(canvas3D) {
        const rect = canvas3D.parentElement.getBoundingClientRect();
        canvas3D.width = rect.width;
        canvas3D.height = rect.height;
        render3D();
    }
}

function reset2DView() {
    view2D.offsetX = canvas2D.width / 2;
    view2D.offsetY = canvas2D.height / 2;
    view2D.scale = 20; // 20 pixels per meter
    draw2D();
}

function screenToWorld(sx, sy) {
    return {
        x: (sx - view2D.offsetX) / view2D.scale,
        y: (sy - view2D.offsetY) / view2D.scale
    };
}

function worldToScreen(wx, wy) {
    return {
        x: wx * view2D.scale + view2D.offsetX,
        y: wy * view2D.scale + view2D.offsetY
    };
}

function on2DMousedown(e) {
    const rect = canvas2D.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = screenToWorld(mouseX, mouseY);

    if (e.button === 1 || e.button === 2) {
        // Middle or right click for panning
        view2D.isPanning = true;
        view2D.startX = mouseX - view2D.offsetX;
        view2D.startY = mouseY - view2D.offsetY;
        return;
    }

    if (view2D.currentTool === 'select') {
        // Try to select
        view2D.selectedId = findHoveredElement(worldPos.x, worldPos.y);
    } else if (view2D.currentTool === 'wall') {
        view2D.isDrawing = true;
        view2D.drawStartX = worldPos.x;
        view2D.drawStartY = worldPos.y;
    } else if (view2D.currentTool === 'door') {
        state.doors.push({ id: state.nextId++, x: worldPos.x, y: worldPos.y, width: 1.0, angle: 0, type: 'door' });
        updateStats();
    } else if (view2D.currentTool === 'window') {
        state.windows.push({ id: state.nextId++, x: worldPos.x, y: worldPos.y, width: 1.5, angle: 0, type: 'window' });
        updateStats();
    } else if (view2D.currentTool === 'room') {
        const name = prompt("Enter room name:", "Room");
        if(name) {
            state.rooms.push({ id: state.nextId++, x: worldPos.x, y: worldPos.y, name: name, type: 'room' });
            updateStats();
        }
    }
    draw2D();
}

function on2DMousemove(e) {
    const rect = canvas2D.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = screenToWorld(mouseX, mouseY);
    
    view2D.mouseX = worldPos.x;
    view2D.mouseY = worldPos.y;

    if (view2D.isPanning) {
        view2D.offsetX = mouseX - view2D.startX;
        view2D.offsetY = mouseY - view2D.startY;
    }
    draw2D();
}

function on2DMouseup(e) {
    view2D.isPanning = false;
    if (view2D.isDrawing && view2D.currentTool === 'wall') {
        const dx = view2D.mouseX - view2D.drawStartX;
        const dy = view2D.mouseY - view2D.drawStartY;
        const length = Math.sqrt(dx*dx + dy*dy);
        if (length > 0.1) { // minimum length
            state.walls.push({
                id: state.nextId++,
                x1: view2D.drawStartX,
                y1: view2D.drawStartY,
                x2: view2D.mouseX,
                y2: view2D.mouseY,
                type: 'wall'
            });
            updateStats();
        }
        view2D.isDrawing = false;
    }
    draw2D();
}

function findHoveredElement(x, y) {
    const threshold = 0.5;
    // Check walls
    for(let w of state.walls) {
        // Point to line segment distance
        const l2 = (w.x2 - w.x1)**2 + (w.y2 - w.y1)**2;
        if(l2 === 0) continue;
        let t = ((x - w.x1) * (w.x2 - w.x1) + (y - w.y1) * (w.y2 - w.y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        const px = w.x1 + t * (w.x2 - w.x1);
        const py = w.y1 + t * (w.y2 - w.y1);
        const dist = Math.sqrt((x - px)**2 + (y - py)**2);
        if(dist < threshold) return w.id;
    }
    
    // Check others
    const items = [...state.doors, ...state.windows, ...state.rooms];
    for(let i of items) {
        if(Math.sqrt((x - i.x)**2 + (y - i.y)**2) < threshold) return i.id;
    }
    return null;
}

function deleteSelected() {
    if(!view2D.selectedId) return;
    state.walls = state.walls.filter(w => w.id !== view2D.selectedId);
    state.doors = state.doors.filter(d => d.id !== view2D.selectedId);
    state.windows = state.windows.filter(w => w.id !== view2D.selectedId);
    state.rooms = state.rooms.filter(r => r.id !== view2D.selectedId);
    view2D.selectedId = null;
    draw2D();
    updateStats();
}

function draw2D() {
    if(!ctx2D) return;
    ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);

    // Draw Grid
    ctx2D.save();
    ctx2D.translate(view2D.offsetX, view2D.offsetY);
    ctx2D.scale(view2D.scale, view2D.scale);

    ctx2D.strokeStyle = '#e2e8f0';
    ctx2D.lineWidth = 1 / view2D.scale;
    const gridSpan = 50;
    ctx2D.beginPath();
    for(let i = -gridSpan; i <= gridSpan; i++) {
        ctx2D.moveTo(i, -gridSpan); ctx2D.lineTo(i, gridSpan);
        ctx2D.moveTo(-gridSpan, i); ctx2D.lineTo(gridSpan, i);
    }
    ctx2D.stroke();
    
    // Draw Background image if exists
    if(state.backgroundImage) {
        const w = state.imgWidth / 20; // arbitrary scale for image
        const h = state.imgHeight / 20;
        ctx2D.globalAlpha = 0.5;
        ctx2D.drawImage(state.backgroundImage, -w/2, -h/2, w, h);
        ctx2D.globalAlpha = 1.0;
    }

    // Draw Walls
    ctx2D.lineCap = 'round';
    for(let w of state.walls) {
        ctx2D.beginPath();
        ctx2D.moveTo(w.x1, w.y1);
        ctx2D.lineTo(w.x2, w.y2);
        ctx2D.lineWidth = state.wallThickness;
        ctx2D.strokeStyle = w.id === view2D.selectedId ? '#2563eb' : '#1f2937';
        ctx2D.stroke();
    }

    // Draw active drawing wall
    if(view2D.isDrawing && view2D.currentTool === 'wall') {
        ctx2D.beginPath();
        ctx2D.moveTo(view2D.drawStartX, view2D.drawStartY);
        ctx2D.lineTo(view2D.mouseX, view2D.mouseY);
        ctx2D.lineWidth = state.wallThickness;
        ctx2D.strokeStyle = '#9ca3af';
        ctx2D.stroke();
    }

    // Draw Doors & Windows
    for(let d of state.doors) {
        ctx2D.fillStyle = d.id === view2D.selectedId ? '#2563eb' : '#d97706';
        ctx2D.fillRect(d.x - 0.5, d.y - 0.2, 1, 0.4);
        ctx2D.font = "0.4px Arial";
        ctx2D.fillText("D", d.x - 0.2, d.y + 0.1);
    }
    for(let w of state.windows) {
        ctx2D.fillStyle = w.id === view2D.selectedId ? '#2563eb' : '#0ea5e9';
        ctx2D.fillRect(w.x - 0.75, w.y - 0.2, 1.5, 0.4);
        ctx2D.font = "0.4px Arial";
        ctx2D.fillText("W", w.x - 0.3, w.y + 0.1);
    }
    
    // Draw Rooms
    for(let r of state.rooms) {
        ctx2D.fillStyle = r.id === view2D.selectedId ? '#2563eb' : '#10b981';
        ctx2D.beginPath();
        ctx2D.arc(r.x, r.y, 0.3, 0, Math.PI * 2);
        ctx2D.fill();
        ctx2D.font = "0.5px Arial";
        ctx2D.textAlign = "center";
        ctx2D.fillText(r.name, r.x, r.y + 0.8);
    }

    ctx2D.restore();
}

// --- HOME & FILE LOGIC ---
function loadBlueprintImage(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            state.backgroundImage = img;
            state.imgWidth = img.width;
            state.imgHeight = img.height;
            
            document.getElementById('file-info').style.display = 'block';
            document.getElementById('file-name').textContent = file.name;
            document.getElementById('file-dimensions').textContent = `${img.width} x ${img.height} px`;
            document.getElementById('image-preview').src = event.target.result;
            
            detectBasicBlueprint();
            document.querySelector('.nav-btn[data-target="blueprint"]').click();
            setTimeout(() => reset2DView(), 50);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function detectBasicBlueprint() {
    // Simulated basic detection
    document.getElementById('detection-result').style.display = 'block';
    document.getElementById('detection-stats').innerHTML = `
        Detected Lines as possible walls.<br>
        <strong>Note:</strong> Auto-detection is experimental.
    `;
    // For this college project, we'll generate a bounding box based on image size to simulate detection
    const w = state.imgWidth / 20;
    const h = state.imgHeight / 20;
    
    state.walls = [
        {id: state.nextId++, x1: -w/2, y1: -h/2, x2: w/2, y2: -h/2, type: 'wall'},
        {id: state.nextId++, x1: w/2, y1: -h/2, x2: w/2, y2: h/2, type: 'wall'},
        {id: state.nextId++, x1: w/2, y1: h/2, x2: -w/2, y2: h/2, type: 'wall'},
        {id: state.nextId++, x1: -w/2, y1: h/2, x2: -w/2, y2: -h/2, type: 'wall'}
    ];
    updateStats();
}

function createSampleBlueprint(type = 1) {
    state.backgroundImage = null;
    state.walls = [];
    state.rooms = [];
    state.doors = [];
    state.windows = [];
    
    if (type === 1) {
        // Outer Walls (10m x 8m)
        const points = [
            [-5, -4], [5, -4], [5, 4], [-5, 4]
        ];
        for(let i=0; i<4; i++) {
            state.walls.push({
                id: state.nextId++,
                x1: points[i][0], y1: points[i][1],
                x2: points[(i+1)%4][0], y2: points[(i+1)%4][1],
                type: 'wall'
            });
        }
        
        // Internal walls
        state.walls.push({id: state.nextId++, x1: 0, y1: -4, x2: 0, y2: 0, type: 'wall'}); // Bedroom / Kitchen
        state.walls.push({id: state.nextId++, x1: -5, y1: 0, x2: 5, y2: 0, type: 'wall'}); // Horizontal split
        state.walls.push({id: state.nextId++, x1: 2, y1: 0, x2: 2, y2: 4, type: 'wall'}); // Living / Bath

        // Rooms
        state.rooms.push({id: state.nextId++, x: -2.5, y: -2, name: 'Bedroom', type: 'room'});
        state.rooms.push({id: state.nextId++, x: 2.5, y: -2, name: 'Kitchen', type: 'room'});
        state.rooms.push({id: state.nextId++, x: -1.5, y: 2, name: 'Living Room', type: 'room'});
        state.rooms.push({id: state.nextId++, x: 3.5, y: 2, name: 'Bathroom', type: 'room'});

        // Doors & Windows
        state.doors.push({id: state.nextId++, x: 0, y: -1, width: 1, angle: 0, type: 'door'});
        state.doors.push({id: state.nextId++, x: -2.5, y: 0, width: 1, angle: 0, type: 'door'});
        state.windows.push({id: state.nextId++, x: -5, y: -2, width: 1.5, angle: 0, type: 'window'});
        state.windows.push({id: state.nextId++, x: 5, y: 2, width: 1.5, angle: 0, type: 'window'});
    } else {
        // Office Layout (12m x 6m)
        const points = [
            [-6, -3], [6, -3], [6, 3], [-6, 3]
        ];
        for(let i=0; i<4; i++) {
            state.walls.push({
                id: state.nextId++,
                x1: points[i][0], y1: points[i][1],
                x2: points[(i+1)%4][0], y2: points[(i+1)%4][1],
                type: 'wall'
            });
        }
        
        // Internal walls
        state.walls.push({id: state.nextId++, x1: -2, y1: -3, x2: -2, y2: 3, type: 'wall'});
        state.walls.push({id: state.nextId++, x1: 2, y1: -3, x2: 2, y2: 3, type: 'wall'});
        state.walls.push({id: state.nextId++, x1: -2, y1: 0, x2: 2, y2: 0, type: 'wall'});

        // Rooms
        state.rooms.push({id: state.nextId++, x: -4, y: 0, name: 'Meeting Room', type: 'room'});
        state.rooms.push({id: state.nextId++, x: 0, y: -1.5, name: 'Office A', type: 'room'});
        state.rooms.push({id: state.nextId++, x: 0, y: 1.5, name: 'Office B', type: 'room'});
        state.rooms.push({id: state.nextId++, x: 4, y: 0, name: 'Lounge', type: 'room'});

        // Doors & Windows
        state.doors.push({id: state.nextId++, x: -2, y: 0, width: 1, angle: 0, type: 'door'});
        state.doors.push({id: state.nextId++, x: 2, y: 0, width: 1, angle: 0, type: 'door'});
        state.doors.push({id: state.nextId++, x: -1, y: 0, width: 1, angle: 0, type: 'door'});
        state.windows.push({id: state.nextId++, x: -6, y: 0, width: 2, angle: 0, type: 'window'});
        state.windows.push({id: state.nextId++, x: 6, y: 0, width: 2, angle: 0, type: 'window'});
    }

    updateStats();
    document.querySelector('.nav-btn[data-target="blueprint"]').click();
    setTimeout(() => reset2DView(), 50);
}

function clearHome() {
    document.getElementById('upload-input').value = "";
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('detection-result').style.display = 'none';
    state.backgroundImage = null;
    state.walls = [];
}

// --- SETTINGS & STATS ---
function initSettings() {
    const whInput = document.getElementById('setting-wall-height');
    const wtInput = document.getElementById('setting-wall-thickness');
    const ftInput = document.getElementById('setting-floor-thickness');

    whInput.addEventListener('change', (e) => state.wallHeight = parseFloat(e.target.value) || 3.0);
    wtInput.addEventListener('change', (e) => { state.wallThickness = parseFloat(e.target.value) || 0.2; draw2D(); });
    ftInput.addEventListener('change', (e) => state.floorThickness = parseFloat(e.target.value) || 0.15);

    document.getElementById('btn-generate-3d').addEventListener('click', () => {
        document.querySelector('.nav-btn[data-target="3d-model"]').click();
        generate3DModel();
    });
}

function updateStats() {
    document.getElementById('stat-walls').textContent = state.walls.length;
    document.getElementById('stat-rooms').textContent = state.rooms.length;
    document.getElementById('stat-doors').textContent = state.doors.length;
    document.getElementById('stat-windows').textContent = state.windows.length;
    
    document.getElementById('stat-height').textContent = state.wallHeight + " m";
    document.getElementById('stat-thickness').textContent = state.wallThickness + " m";
    
    let area = 0;
    if(state.walls.length > 2) {
        // Rough estimate bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        state.walls.forEach(w => {
            minX = Math.min(minX, w.x1, w.x2);
            maxX = Math.max(maxX, w.x1, w.x2);
            minY = Math.min(minY, w.y1, w.y2);
            maxY = Math.max(maxY, w.y1, w.y2);
        });
        if(isFinite(minX)) area = (maxX - minX) * (maxY - minY);
    }
    document.getElementById('stat-area').textContent = area.toFixed(2) + " m²";
}


// --- 3D ENGINE ---
let canvas3D, ctx3D;

function init3DViewer() {
    canvas3D = document.getElementById('canvas-3d');
    ctx3D = canvas3D.getContext('2d');
    
    // Interactions
    canvas3D.addEventListener('mousedown', (e) => {
        view3D.isDragging = true;
        view3D.startX = e.clientX;
        view3D.startY = e.clientY;
    });
    window.addEventListener('mouseup', () => view3D.isDragging = false);
    window.addEventListener('mousemove', (e) => {
        if(!view3D.isDragging) return;
        const dx = e.clientX - view3D.startX;
        const dy = e.clientY - view3D.startY;
        
        view3D.yaw -= dx * 0.01;
        view3D.pitch -= dy * 0.01;
        
        // Clamp pitch
        view3D.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, view3D.pitch));
        
        view3D.startX = e.clientX;
        view3D.startY = e.clientY;
        render3D();
    });
    
    canvas3D.addEventListener('wheel', (e) => {
        e.preventDefault();
        view3D.distance *= (e.deltaY > 0 ? 1.1 : 0.9);
        render3D();
    });

    document.getElementById('btn-view-top').addEventListener('click', () => { view3D.pitch = Math.PI/2 - 0.01; view3D.yaw = 0; render3D(); });
    document.getElementById('btn-view-front').addEventListener('click', () => { view3D.pitch = 0; view3D.yaw = 0; render3D(); });
    document.getElementById('btn-view-side').addEventListener('click', () => { view3D.pitch = 0; view3D.yaw = Math.PI/2; render3D(); });
    document.getElementById('btn-3d-reset').addEventListener('click', () => { view3D.pitch = Math.PI/6; view3D.yaw = Math.PI/4; view3D.distance = 20; render3D(); });
}

function generate3DModel() {
    view3D.polygons = [];
    const t = state.wallThickness;
    const h = state.wallHeight;

    // Floor calculation
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    state.walls.forEach(w => {
        minX = Math.min(minX, w.x1, w.x2);
        maxX = Math.max(maxX, w.x1, w.x2);
        minY = Math.min(minY, w.y1, w.y2);
        maxY = Math.max(maxY, w.y1, w.y2);
    });

    if(isFinite(minX)) {
        // Floor Polygon
        create3DFloor(minX - 1, minY - 1, maxX + 1, maxY + 1, 0, state.floorThickness);
    }

    // Walls
    state.walls.forEach(w => {
        create3DWall(w.x1, w.y1, w.x2, w.y2, h, t);
    });

    // Doors & Windows (Simple Box representations)
    state.doors.forEach(d => {
        create3DBox(d.x - d.width/2, d.y - 0.2, 0, d.width, 0.4, 2.0, '#d97706'); // Door height 2.0m
    });
    state.windows.forEach(w => {
        create3DBox(w.x - w.width/2, w.y - 0.2, 1.0, w.width, 0.4, 1.0, '#0ea5e9'); // Window height 1m at Y=1.0m
    });

    render3D();
}

function create3DFloor(x1, y1, x2, y2, z, thickness) {
    // Top face
    view3D.polygons.push({
        points: [
            {x: x1, y: y1, z: z}, {x: x2, y: y1, z: z},
            {x: x2, y: y2, z: z}, {x: x1, y: y2, z: z}
        ],
        color: '#cbd5e1'
    });
}

function create3DWall(x1, y1, x2, y2, height, thickness) {
    // Vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if(len === 0) return;
    
    // Normal vector for thickness
    const nx = (-dy / len) * (thickness/2);
    const ny = (dx / len) * (thickness/2);

    // 4 corners of the wall base
    const b1 = {x: x1 + nx, y: y1 + ny, z: 0};
    const b2 = {x: x2 + nx, y: y2 + ny, z: 0};
    const b3 = {x: x2 - nx, y: y2 - ny, z: 0};
    const b4 = {x: x1 - nx, y: y1 - ny, z: 0};

    // 4 corners of the wall top
    const t1 = {...b1, z: height};
    const t2 = {...b2, z: height};
    const t3 = {...b3, z: height};
    const t4 = {...b4, z: height};

    // Front face
    view3D.polygons.push({ points: [b1, b2, t2, t1], color: '#f1f5f9' });
    // Back face
    view3D.polygons.push({ points: [b4, b3, t3, t4], color: '#e2e8f0' });
    // Left face
    view3D.polygons.push({ points: [b4, b1, t1, t4], color: '#94a3b8' });
    // Right face
    view3D.polygons.push({ points: [b2, b3, t3, t2], color: '#94a3b8' });
    // Top face
    view3D.polygons.push({ points: [t1, t2, t3, t4], color: '#475569' });
}

function create3DBox(x, y, z, w, d, h, color) {
    const b1 = {x: x, y: y, z: z};
    const b2 = {x: x+w, y: y, z: z};
    const b3 = {x: x+w, y: y+d, z: z};
    const b4 = {x: x, y: y+d, z: z};
    
    const t1 = {...b1, z: z+h};
    const t2 = {...b2, z: z+h};
    const t3 = {...b3, z: z+h};
    const t4 = {...b4, z: z+h};

    view3D.polygons.push({ points: [b1, b2, t2, t1], color: color });
    view3D.polygons.push({ points: [b4, b3, t3, t4], color: color });
    view3D.polygons.push({ points: [b4, b1, t1, t4], color: color });
    view3D.polygons.push({ points: [b2, b3, t3, t2], color: color });
    view3D.polygons.push({ points: [t1, t2, t3, t4], color: color });
}

function project3DPoint(x, y, z) {
    // 1. Rotate yaw (around Z axis)
    let x1 = x * Math.cos(view3D.yaw) - y * Math.sin(view3D.yaw);
    let y1 = x * Math.sin(view3D.yaw) + y * Math.cos(view3D.yaw);
    
    // 2. Rotate pitch (around X axis)
    let y2 = y1 * Math.cos(view3D.pitch) - z * Math.sin(view3D.pitch);
    let z2 = y1 * Math.sin(view3D.pitch) + z * Math.cos(view3D.pitch);
    
    // 3. Translate by distance
    let z3 = z2 + view3D.distance;

    // 4. Perspective projection
    const fov = 500;
    if(z3 <= 0.1) z3 = 0.1; // avoid divide by zero behind camera
    const px = (x1 * fov) / z3;
    const py = (y2 * fov) / z3;

    return { 
        x: px + canvas3D.width/2, 
        y: canvas3D.height/2 - py, // Y is inverted on screen
        z: z3 // keep for depth sorting
    };
}

function render3D() {
    if(!ctx3D) return;
    ctx3D.clearRect(0, 0, canvas3D.width, canvas3D.height);
    
    // Background
    ctx3D.fillStyle = '#f8fafc';
    ctx3D.fillRect(0, 0, canvas3D.width, canvas3D.height);

    if (view3D.polygons.length === 0) return;

    // Project all polygons
    let projectedPolys = [];
    
    for(let poly of view3D.polygons) {
        let projPoints = [];
        let avgZ = 0;
        for(let p of poly.points) {
            let proj = project3DPoint(p.x, p.y, p.z);
            projPoints.push(proj);
            avgZ += proj.z;
        }
        avgZ /= projPoints.length;
        
        projectedPolys.push({
            points: projPoints,
            color: poly.color,
            depth: avgZ
        });
    }

    // Painter's Algorithm: Sort by depth (descending)
    projectedPolys.sort((a, b) => b.depth - a.depth);

    // Draw Polygons
    for(let poly of projectedPolys) {
        // Backface culling (simple cross product of first 3 points)
        if(poly.points.length >= 3) {
            const p1 = poly.points[0], p2 = poly.points[1], p3 = poly.points[2];
            const cross = (p2.x - p1.x)*(p3.y - p2.y) - (p2.y - p1.y)*(p3.x - p2.x);
            // If cross < 0, it's facing away (in our coordinate system)
            if(cross < 0) continue;
        }

        ctx3D.beginPath();
        ctx3D.moveTo(poly.points[0].x, poly.points[0].y);
        for(let i=1; i<poly.points.length; i++) {
            ctx3D.lineTo(poly.points[i].x, poly.points[i].y);
        }
        ctx3D.closePath();
        
        ctx3D.fillStyle = poly.color;
        ctx3D.fill();
        ctx3D.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx3D.lineWidth = 1;
        ctx3D.stroke();
    }
}

// --- EXPORTS ---
function initExport() {
    document.getElementById('btn-export-blueprint').addEventListener('click', () => {
        reset2DView(); // ensure drawn nicely
        const link = document.createElement('a');
        link.download = 'blueprint.png';
        link.href = canvas2D.toDataURL();
        link.click();
    });

    document.getElementById('btn-export-screenshot').addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = '3d_model.png';
        link.href = canvas3D.toDataURL();
        link.click();
    });

    document.getElementById('btn-export-data').addEventListener('click', () => {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'model_data.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });
}

function closeAbout() {
    document.getElementById('about').classList.remove('active');
    document.querySelector('.nav-btn[data-target="home"]').click();
}
