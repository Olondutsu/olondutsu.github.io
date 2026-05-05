/** GLOBAL STATE **/
let W = 32, H = 32, pixelSize = 25;
let pixels = [];
let currentColor = "#ffffff";
let bgDefault = "#111111";
let paletteColors = ["#000000", "#ffffff", "#be0000", "#ffcc00", "#1a5e1a", "#2a2aff"];
let tool = "pencil", brushSize = 1;
let mirrorX = false, mirrorY = false, mirrorRadial = false, mX = 15.5, mY = 15.5;
let undoStack = [], redoStack = [];
let gridMode = true, numberedGrid = false, renderMode = "pixel", nyzynkaMode = false, isDrawing = false, isPanning = false;
let sel = null, clipboard = null, floatingLayer = null;
let drawing = false;
let isRulerActive = false;
let rulerStart = null;
let rulerCurrent = null;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const container = document.getElementById("canvasContainer");

/** INIT **/
function init(w, h, data = null) {
    W = w; H = h;
    pixels = data ? [...data] : new Array(W * H).fill(bgDefault);
    mX = (W - 1) / 2; mY = (H - 1) / 2;
    document.getElementById("mXSlider").max = W - 1;
    document.getElementById("mYSlider").max = H - 1;
    refresh();
    container.scrollLeft = 2000 + (W * pixelSize / 2) - (container.clientWidth / 2);
    container.scrollTop = 2000 + (H * pixelSize / 2) - (container.clientHeight / 2);
}

function refresh() {
    canvas.width = W * pixelSize;
    canvas.height = H * pixelSize;
    render();
    
    // Dessiner la ligne de la règle APRÈS le rendu des pixels
    if (tool === "ruler" && rulerStart && rulerCurrent) {
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo((rulerStart.x + 0.5) * pixelSize, (rulerStart.y + 0.5) * pixelSize);
        ctx.lineTo((rulerCurrent.x + 0.5) * pixelSize, (rulerCurrent.y + 0.5) * pixelSize);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    updateUI();
}

function render() {
    ctx.fillStyle = bgDefault;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Base Pixels
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] === bgDefault) continue;
        let x = i % W, y = Math.floor(i / W);
        ctx.fillStyle = pixels[i];
        
        if (nyzynkaMode) {
            // Mode Nyzynka : une ligne verticale fine au centre
            let px = x * pixelSize;
            let py = y * pixelSize;
            let lineWidth = Math.max(2, pixelSize * 0.15);
            let centerX = px + (pixelSize / 2) - (lineWidth / 2);
            
            ctx.fillRect(centerX, py, lineWidth, pixelSize);
        } else if (renderMode === "pixel") {
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        } else {
            ctx.strokeStyle = pixels[i]; ctx.lineWidth = 2;
            ctx.beginPath();
            let px = x * pixelSize, py = y * pixelSize, p = pixelSize * 0.2;
            ctx.moveTo(px+p, py+p); ctx.lineTo(px+pixelSize-p, py+pixelSize-p);
            ctx.moveTo(px+pixelSize-p, py+p); ctx.lineTo(px+p, py+pixelSize-p);
            ctx.stroke();
        }
    }

    // Floating Layer (Selection being moved)
    if (floatingLayer) {
        ctx.globalAlpha = 0.7;
        for (let j = 0; j < floatingLayer.h; j++) {
            for (let i = 0; i < floatingLayer.w; i++) {
                let col = floatingLayer.data[j * floatingLayer.w + i];
                if (col !== bgDefault) {
                    ctx.fillStyle = col;
                    ctx.fillRect((floatingLayer.x + i) * pixelSize, (floatingLayer.y + j) * pixelSize, pixelSize, pixelSize);
                }
            }
        }
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#00ff00"; ctx.lineWidth = 2;
        ctx.strokeRect(floatingLayer.x * pixelSize, floatingLayer.y * pixelSize, floatingLayer.w * pixelSize, floatingLayer.h * pixelSize);
    }

    // Grid
    if (gridMode) {
        ctx.strokeStyle = "rgba(120,120,120,0.15)";
        ctx.lineWidth = 0.5;
        for(let i=0; i<=W; i++) { ctx.beginPath(); ctx.moveTo(i*pixelSize, 0); ctx.lineTo(i*pixelSize, canvas.height); ctx.stroke(); }
        for(let i=0; i<=H; i++) { ctx.beginPath(); ctx.moveTo(0, i*pixelSize); ctx.lineTo(canvas.width, i*pixelSize); ctx.stroke(); }
    }
    
    // Numbered Grid
    if (numberedGrid && pixelSize >= 15) {
        ctx.fillStyle = "#888";
        ctx.font = `${Math.max(8, pixelSize * 0.4)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Numbers every 5 pixels
        for(let i=0; i<W; i+=5) {
            ctx.fillText(i, (i + 0.5) * pixelSize, -10);
            ctx.fillText(i, (i + 0.5) * pixelSize, canvas.height + 10);
        }
        for(let j=0; j<H; j+=5) {
            ctx.fillText(j, -15, (j + 0.5) * pixelSize);
            ctx.fillText(j, canvas.width + 15, (j + 0.5) * pixelSize);
        }
    }

    // Selection Box
    if(sel && tool === "select") {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.strokeRect(Math.min(sel.x1, sel.x2)*pixelSize, Math.min(sel.y1, sel.y2)*pixelSize, (Math.abs(sel.x1-sel.x2)+1)*pixelSize, (Math.abs(sel.y1-sel.y2)+1)*pixelSize);
        ctx.setLineDash([]);
    }
    updateStats();
}

function toggleSidebar() {
    const tools = document.getElementById('tools');
    tools.classList.toggle('collapsed');
    // Change l'icône selon l'état
    document.getElementById('menuToggle').innerText = tools.classList.contains('collapsed') ? '▶' : '☰';
}

/** CORE DRAWING **/
function setPix(x, y, col) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    let points = [[x, y]];
    if (mirrorRadial) {
        let cx = (W-1)/2, cy = (H-1)/2;
        let dx = x - cx, dy = y - cy;
        points.push([cx - dx, cy + dy], [cx + dx, cy - dy], [cx - dx, cy - dy]);
        points.push([cx + dy, cy + dx], [cx - dy, cy + dx], [cx + dy, cy - dx], [cx - dy, cy - dx]);
    } else {
        if (mirrorX) {
            let nx = Math.round(mX * 2 - x);
            if (nx >= 0 && nx < W) points.push([nx, y]);
        }
        if (mirrorY) {
            let ny = Math.round(mY * 2 - y);
            if (ny >= 0 && ny < H) {
                points.push([x, ny]);
                if (mirrorX) {
                    let nx = Math.round(mX * 2 - x);
                    if (nx >= 0 && nx < W) points.push([nx, ny]);
                }
            }
        }
    }
    points.forEach(p => {
        let radius = Math.floor(brushSize / 2);
        for(let i = -radius; i <= (brushSize%2===0?radius-1:radius); i++) {
            for(let j = -radius; j <= (brushSize%2===0?radius-1:radius); j++) {
                let px = p[0]+i, py = p[1]+j;
                if(px>=0 && px<W && py>=0 && py<H) pixels[py*W+px] = col;
            }
        }
    });
}

/** INPUTS **/
canvas.addEventListener('pointerdown', e => {
    if(e.button === 1 || isPanning) return; 
    const p = getCoord(e);
    
    // Check for Move Selection
    if (tool === "select" && sel && !floatingLayer) {
        const xMin = Math.min(sel.x1, sel.x2), yMin = Math.min(sel.y1, sel.y2);
        const w = Math.abs(sel.x1 - sel.x2) + 1, h = Math.abs(sel.y1 - sel.y2) + 1;
        if (p.x >= xMin && p.x < xMin + w && p.y >= yMin && p.y < yMin + h) {
            saveState();
            floatingLayer = { w, h, x: xMin, y: yMin, data: [] };
            for(let j=0; j<h; j++) for(let i=0; i<w; i++) {
                let idx = (yMin+j)*W + (xMin+i);
                floatingLayer.data.push(pixels[idx]);
                pixels[idx] = bgDefault;
            }
            sel = null; isDrawing = true; return;
        }
    }

    if (floatingLayer) {
        if (p.x < floatingLayer.x || p.x >= floatingLayer.x + floatingLayer.w || p.y < floatingLayer.y || p.y >= floatingLayer.y + floatingLayer.h) {
            confirmPaste();
        } else {
            isDrawing = true; return;
        }
    }
    if (tool === "ruler") {
        
        rulerStart = p; // On stocke le point de départ {x, y}
        isDrawing = true; 
        return; 
    }

    saveState();
    
    isDrawing = true;

    if (tool === "picker") {
        currentColor = pixels[p.y*W + p.x];
        rebuildPalette(); isDrawing = false; return;
    }
    if (tool === "fill") {
        let target = pixels[p.y*W + p.x];
        if (target !== currentColor) floodFill(p.x, p.y, target, currentColor);
        isDrawing = false; refresh(); return;
    }
    if (tool === "select") {
        sel = {x1: p.x, y1: p.y, x2: p.x, y2: p.y};
    } else {
        setPix(p.x, p.y, (tool === "eraser" ? bgDefault : currentColor));
    }
    refresh();
});

canvas.addEventListener('pointermove', e => {
    if (!isDrawing || isPanning) return;
    const p = getCoord(e);

    if (floatingLayer) {
        floatingLayer.x = Math.floor(p.x - floatingLayer.w / 2);
        floatingLayer.y = Math.floor(p.y - floatingLayer.h / 2);
    }
    else if (tool === "ruler" && rulerStart) {
        rulerCurrent = p; // On "publie" la position de la souris
        const d = Math.max(Math.abs(p.x - rulerStart.x), Math.abs(p.y - rulerStart.y)) + 1;
        document.getElementById('ruleText').innerText = `Ruler: ${Math.max(0, d-2)} (incl. ${d})`;
        // Le refresh() qui est déjà en bas de ton code va s'occuper du reste
    }
    else if (tool === "select") {
        sel.x2 = p.x; sel.y2 = p.y;
    } else if (tool === "pencil" || tool === "eraser") {
        setPix(p.x, p.y, (tool === "eraser" ? bgDefault : currentColor));
    }
    refresh();
});

window.addEventListener('pointerup', () => { 
    if (tool === "ruler") {
        refresh(); // Efface le trait blanc une fois fini
        rulerStart = null; // Prêt pour la prochaine mesure
    }
    isDrawing = false; 
    
    saveLocal(); 
});

/** EDIT FUNCTIONS **/
function copySelection() {
    if(!sel) { alert("Select an area first"); return; }
    const x = Math.min(sel.x1, sel.x2), y = Math.min(sel.y1, sel.y2);
    const w = Math.abs(sel.x1 - sel.x2) + 1, h = Math.abs(sel.y1 - sel.y2) + 1;
    clipboard = { w, h, data: [] };
    for(let j=0; j<h; j++) for(let i=0; i<w; i++) clipboard.data.push(pixels[(y+j)*W + (x+i)]);
    alert("Selection copied!");
}

function pasteSelection() {
    if(!clipboard) { alert("Nothing to paste"); return; }
    if(floatingLayer) confirmPaste();
    floatingLayer = { 
        w: clipboard.w, h: clipboard.h, data: [...clipboard.data], 
        x: Math.floor(W/2 - clipboard.w/2), y: Math.floor(H/2 - clipboard.h/2) 
    };
    refresh();
}

function confirmPaste() {
    if (!floatingLayer) return;
    saveState();
    for (let j = 0; j < floatingLayer.h; j++) {
        for (let i = 0; i < floatingLayer.w; i++) {
            let tx = floatingLayer.x + i, ty = floatingLayer.y + j;
            let col = floatingLayer.data[j * floatingLayer.w + i];
            if (tx >= 0 && tx < W && ty >= 0 && ty < H && col !== bgDefault) {
                pixels[ty * W + tx] = col;
            }
        }
    }
    floatingLayer = null; refresh();
}

/** UTIL FUNCTIONS **/
function floodFill(startX, startY, targetColor, fillCol) {
    let stack = [[startX, startY]], diag = document.getElementById("fillDiag").checked;
    while(stack.length) {
        let [x, y] = stack.pop();
        if(x<0||y<0||x>=W||y>=H||pixels[y*W+x]!==targetColor) continue;
        pixels[y*W+x] = fillCol;
        stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
        if(diag) stack.push([x+1, y+1], [x-1, y-1], [x+1, y-1], [x-1, y+1]);
    }
}

function getCoord(e) {
    const rect = canvas.getBoundingClientRect();
    let x = Math.floor((e.clientX - rect.left) / (rect.width / W));
    let y = Math.floor((e.clientY - rect.top) / (rect.height / H));
    return { x: Math.max(0, Math.min(W-1, x)), y: Math.max(0, Math.min(H-1, y)) };
}

function showPanel(id) {
    const p = document.getElementById(id);
    if (p.style.display === "block") { p.style.display = "none"; return; }
    hidePanels(); p.style.display = "block";
}

function hidePanels() { document.querySelectorAll('.panel').forEach(p => p.style.display = 'none'); }

function setTool(t) {
    if(floatingLayer && t !== "select") confirmPaste();
    tool = t;
    
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
}

function toggleRuler() {
    isRulerActive = !isRulerActive;
    rulerStart = null;
    document.getElementById('ruleText').innerText = isRulerActive ? "Ruler: Ready" : "Ruler: -";
}

function updateBrushSize(v) { brushSize = parseInt(v); document.getElementById("sizeVal").innerText = v; }
function showFillSettings() { showPanel('fillPanel'); }

/** HISTORY **/
function saveState() {
    undoStack.push(JSON.stringify({pixels, bgDefault, W, H}));
    if(undoStack.length > 50) undoStack.shift();
    redoStack = [];
}
function undo() {
    if(!undoStack.length) return;
    redoStack.push(JSON.stringify({pixels, bgDefault, W, H}));
    let s = JSON.parse(undoStack.pop());
    pixels = s.pixels; bgDefault = s.bgDefault; W = s.W; H = s.H;
    refresh(); rebuildPalette();
}
function redo() {
    if(!redoStack.length) return;
    undoStack.push(JSON.stringify({pixels, bgDefault, W, H}));
    let s = JSON.parse(redoStack.pop());
    pixels = s.pixels; bgDefault = s.bgDefault; W = s.W; H = s.H;
    refresh(); rebuildPalette();
}
function rebuildPalette() {
    const cont = document.getElementById("colorContainer");
    cont.innerHTML = "";
    paletteColors.forEach((c, idx) => {
        const wrap = document.createElement("div"); 
        wrap.className = "color-wrapper";
        
        const d = document.createElement("div"); 
        d.className = "color" + (c === currentColor ? " active" : "");
        d.style.background = c;

        // --- CORRECTION MOBILE : On utilise pointerdown ---
        let lastTap = 0;
        d.onpointerdown = (e) => {
            e.stopPropagation();
            const now = Date.now();
            
            // Gestion du double-clic (pour mobile et desktop)
            if (now - lastTap < 300) {
                // Action double-clic : Sélecteur de couleur
                let i = document.createElement("input"); 
                i.type = "color"; 
                i.value = c;
                i.onchange = () => { 
                    paletteColors[idx] = i.value; 
                    currentColor = i.value; 
                    rebuildPalette(); 
                };
                i.click();
            } else {
                // Action clic simple : Sélection
                currentColor = c;
                rebuildPalette();
            }
            lastTap = now;
        };

        const del = document.createElement("div"); 
        del.className = "del-color"; 
        del.innerText = "✕";
        
        // Suppression aussi en pointerdown pour le mobile
        del.onpointerdown = (e) => { 
            e.stopPropagation(); 
            paletteColors.splice(idx, 1); 
            rebuildPalette(); 
        };

        wrap.append(d, del); 
        cont.appendChild(wrap);
    });
    document.getElementById("bgColorBtn").style.background = bgDefault;
}

function addNewColor() {
    let i = document.createElement("input"); i.type="color";
    i.onchange = () => { paletteColors.push(i.value); currentColor = i.value; rebuildPalette(); };
    i.click();
}

function changeBG() {
    let i = document.createElement("input"); i.type="color"; i.value = bgDefault;
    i.onchange = () => {
        let old = bgDefault; bgDefault = i.value;
        pixels = pixels.map(p => p === old ? bgDefault : p);
        rebuildPalette(); refresh();
    }; i.click();
}

function updateUI() {
    const lx = document.getElementById("mirrorLineX"), ly = document.getElementById("mirrorLineY");
    lx.style.display = mirrorX ? "block" : "none";
    lx.style.left = (mX * pixelSize + pixelSize/2) + "px";
    ly.style.display = mirrorY ? "block" : "none";
    ly.style.top = (mY * pixelSize + pixelSize/2) + "px";
}

function updateStats() {
    document.getElementById("pixelCount").innerText = pixels.filter(p => p !== bgDefault).length;
    updateThreadCount();
}

function toggleGrid() { gridMode = !gridMode; render(); }
function toggleNumberedGrid() { numberedGrid = !numberedGrid; refresh(); }
function toggleRender() { renderMode = (renderMode === "pixel" ? "cross" : "pixel"); nyzynkaMode = false; refresh(); }
function toggleNyzynka() { nyzynkaMode = !nyzynkaMode; if(nyzynkaMode) renderMode = "pixel"; refresh(); }
function saveLocal() { localStorage.setItem("pix_pro_save_v3", JSON.stringify({W,H,pixels,bgDefault,paletteColors})); }

/** THREAD COUNTER **/
function updateThreadCount() {
    const colorCounts = {};
    
    // Count pixels by color
    pixels.forEach(pixel => {
        if (pixel !== bgDefault) {
            colorCounts[pixel] = (colorCounts[pixel] || 0) + 1;
        }
    });
    
    // Update the panel
    const list = document.getElementById("threadCountList");
    const totalEl = document.getElementById("totalStitches");
    
    if (!list || !totalEl) return;
    
    list.innerHTML = "";
    let total = 0;
    
    // Sort by count (descending)
    const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
    
    sortedColors.forEach(([color, count]) => {
        total += count;
        const item = document.createElement("div");
        item.className = "thread-item";
        item.innerHTML = `
            <div class="thread-info">
                <div class="thread-color" style="background: ${color}"></div>
                <span>${color}</span>
            </div>
            <div class="thread-count">${count} pts</div>
        `;
        list.appendChild(item);
    });
    
    totalEl.innerText = total;
}

/** SYMMETRY ACTIONS **/
function toggleMX(v) { mirrorX = v; if(v) mirrorRadial = false; refresh(); }
function toggleMY(v) { mirrorY = v; if(v) mirrorRadial = false; refresh(); }
function toggleRadial(v) { mirrorRadial = v; if(v) { mirrorX = false; mirrorY = false; } refresh(); }
function updateMX(v) { mX = parseFloat(v); refresh(); }
function updateMY(v) { mY = parseFloat(v); refresh(); }

/** EXPORT / RESIZE **/
function applyResize() {
    saveState();
    let nW = parseInt(document.getElementById("rw").value), nH = parseInt(document.getElementById("rh").value);
    let newP = new Array(nW * nH).fill(bgDefault);
    for(let y=0; y<Math.min(H, nH); y++) for(let x=0; x<Math.min(W, nW); x++) newP[y*nW + x] = pixels[y*W + x];
    W = nW; H = nH; pixels = newP; hidePanels(); init(W, H, pixels);
}

function exportPNG(trans) {
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
    const tCtx = tmp.getContext('2d');
    for(let i=0; i<pixels.length; i++) {
        if(trans && pixels[i] === bgDefault) continue;
        tCtx.fillStyle = pixels[i]; tCtx.fillRect(i%W, Math.floor(i/W), 1, 1);
    }
    const a = document.createElement('a'); a.download = 'pixelart.png'; a.href = tmp.toDataURL(); a.click();
}

function exportSVG() {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">`;
    
    // 1. On crée une liste de toutes les couleurs uniques présentes sur le dessin
    const uniqueColors = [...new Set(pixels)].filter(c => c && c !== 'transparent' && c !== 'rgba(0,0,0,0)');

    // 2. On boucle par couleur pour créer des groupes <g>
    uniqueColors.forEach(targetColor => {
        svg += `<g id="color-${targetColor.replace('#', '')}" fill="${targetColor}">`;
        
        for (let y = 0; y < H; y++) {
            let x = 0;
            while (x < W) {
                let color = pixels[y * W + x];
                
                // On ne dessine que si c'est la couleur du groupe actuel
                if (color !== targetColor) {
                    x++;
                    continue;
                }
                
                let run = 1;
                while (x + run < W && pixels[y * W + (x + run)] === targetColor) {
                    run++;
                }
                
                // On ajoute le rectangle sans l'attribut 'fill' (car il est hérité du groupe <g>)
                svg += `<rect x="${x}" y="${y}" width="${run}" height="1" />`;
                x += run;
            }
        }
        svg += `</g>`;
    });
    
    svg += `</svg>`;
    
    const blob = new Blob([svg], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pixel_art_grouped.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function saveJSON() {
    const data = JSON.stringify({W, H, pixels, bgDefault, paletteColors});
    const blob = new Blob([data], {type: "application/json"});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "design.json"; a.click();
}

function loadJSON() {
    let i = document.createElement('input'); i.type="file"; i.accept=".json";
    i.onchange = e => {
        let reader = new FileReader();
        reader.onload = r => {
            let d = JSON.parse(r.target.result); paletteColors = d.paletteColors || paletteColors;
            bgDefault = d.bgDefault || "#111111"; init(d.W, d.H, d.pixels); rebuildPalette();
        }; reader.readAsText(e.target.files[0]);
    }; i.click();
}

/** ZOOM & PAN (MOUSE + TOUCH) **/
container.onwheel = e => {
    e.preventDefault();
    let old = pixelSize;
    pixelSize = Math.max(2, Math.min(100, pixelSize + (e.deltaY < 0 ? 2 : -2)));
    refresh();
    const rect = canvas.getBoundingClientRect();
    container.scrollLeft += (e.clientX - rect.left) * (pixelSize/old - 1);
    container.scrollTop += (e.clientY - rect.top) * (pixelSize/old - 1);
};

// Variables pour le multi-touch optimisées
let initialPinchDist = null;
let lastTouchPos = null;
let isMultiTouching = false; // Sécurité pour bloquer le dessin pendant/après un zoom

container.addEventListener('touchstart', e => {
    if (e.touches.length >= 2) {
        // Activation du mode multi-doigts
        isMultiTouching = true; 
        isPanning = true;
        isDrawing = false;
        initialPinchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    } else if (e.touches.length === 1) {
        // Si on a encore le flag isMultiTouching (doigt restant après zoom), on reste en mode mouvement
        if (isMultiTouching) {
            isPanning = true;
            isDrawing = false;
        }
    }
    lastTouchPos = { x: e.touches[0].pageX, y: e.touches[0].pageY };
}, { passive: false });

container.addEventListener('touchmove', e => {
    if (!lastTouchPos) return;

    if (e.touches.length >= 2) {
        e.preventDefault(); // Empêche le défilement de la page
        let dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        
        if (initialPinchDist) {
            let diff = dist - initialPinchDist;
            if (Math.abs(diff) > 2) {
                pixelSize = Math.max(2, Math.min(100, pixelSize + (diff > 0 ? 1.5 : -1.5)));
                initialPinchDist = dist;
                refresh();
            }
        }
    }
    
    // Déplacement du canevas (Pan)
    if (isPanning || e.touches.length >= 2 || isMultiTouching) {
        container.scrollLeft -= (e.touches[0].pageX - lastTouchPos.x);
        container.scrollTop -= (e.touches[0].pageY - lastTouchPos.y);
        isDrawing = false; // Verrouillage du dessin
    }
    
    lastTouchPos = { x: e.touches[0].pageX, y: e.touches[0].pageY };
}, { passive: false });

container.addEventListener('touchend', e => {
    // Si l'écran est totalement libéré (plus aucun doigt)
    if (e.touches.length === 0) {
        isPanning = false;
        isMultiTouching = false; 
        initialPinchDist = null;
        lastTouchPos = null;
    } else {
        // S'il reste un doigt (fin de pincement), on maintient le mode Pan pour éviter de dessiner
        isPanning = true;
    }
});

/** MOUSE PAN **/
let sx, sy, sl, st;
container.onmousedown = e => { 
    if(e.button === 1) { 
        isPanning = true; isDrawing = false;
        sx = e.clientX; sy = e.clientY; 
        sl = container.scrollLeft; st = container.scrollTop; 
        e.preventDefault(); 
    }
};
window.addEventListener('mousemove', e => { 
    if(isPanning && !initialPinchDist) { 
        container.scrollLeft = sl - (e.clientX - sx); 
        container.scrollTop = st - (e.clientY - sy); 
    }
});
window.addEventListener('mouseup', () => { isPanning = false; });

/** DRAGGABLE PANELS **/
document.querySelectorAll('.panel').forEach(p => {
    const header = p.querySelector('.panel-header');
    let isDraggingPanel = false, offset = [0,0];
    header.onmousedown = (e) => {
        isDraggingPanel = true; p.style.transform = 'none';
        offset = [p.offsetLeft - e.clientX, p.offsetTop - e.clientY];
    };
    window.addEventListener('mousemove', (e) => {
        if (!isDraggingPanel) return;
        p.style.left = (e.clientX + offset[0]) + 'px';
        p.style.top = (e.clientY + offset[1]) + 'px';
    });
    window.addEventListener('mouseup', () => isDraggingPanel = false);
});

function newProject() { if(confirm("Discard current work and start new?")) init(32, 32); }

/** STARTUP **/
const saved = localStorage.getItem("pix_pro_save_v3");
if(saved) {
    const s = JSON.parse(saved); bgDefault = s.bgDefault || "#111111"; 
    paletteColors = s.paletteColors || paletteColors;
    init(s.W, s.H, s.pixels);
} else { init(32, 32); }
rebuildPalette();

// Made with Bob

/** KEYBOARD NAVIGATION **/
window.addEventListener('keydown', e => {
    // Navigation avec les flèches
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const scrollAmount = 50;
        
        switch(e.key) {
            case 'ArrowUp':
                container.scrollTop -= scrollAmount;
                break;
            case 'ArrowDown':
                container.scrollTop += scrollAmount;
                break;
            case 'ArrowLeft':
                container.scrollLeft -= scrollAmount;
                break;
            case 'ArrowRight':
                container.scrollLeft += scrollAmount;
                break;
        }
    }
    
    // Raccourcis clavier
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
            case 's':
                e.preventDefault();
                saveJSON();
                break;
            case 'o':
                e.preventDefault();
                loadJSON();
                break;
        }
    }
    
    // Touches rapides pour les outils
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch(e.key.toLowerCase()) {
            case 'p':
                setTool('pencil');
                break;
            case 'e':
                setTool('eraser');
                break;
            case 'f':
                setTool('fill');
                break;
            case 'i':
                setTool('picker');
                break;
            case 's':
                setTool('select');
                break;
            case 'r':
                setTool('ruler');
                break;
            case 'g':
                toggleGrid();
                break;
        }
    }
});
