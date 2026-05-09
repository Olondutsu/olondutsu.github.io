/** GLOBAL STATE **/
let W = 32, H = 32, pixelSize = 25;
let pixels = []; // Canvas principal (résolution normale)
let pixelStyles = []; // 'cross' uniquement pour le canvas principal
let currentColor = "#ffffff";
let currentStyle = "cross"; // Default style
let bgDefault = "#111111";
let paletteColors = ["#000000", "#ffffff", "#be0000", "#ffcc00", "#1a5e1a", "#2a2aff"];
let tool = "pencil", brushSize = 1;
let mirrorX = false, mirrorY = false, mirrorRadial = false, mX = 15.5, mY = 15.5;
let undoStack = [], redoStack = [];
let gridMode = true, numberedGrid = false, renderMode = "pixel", nyzynkaMode = false, trameMode = false, isDrawing = false, isPanning = false;
let sel = null, clipboard = null, floatingLayer = null;
let drawing = false;
let isRulerActive = false;
let rulerStart = null;
let rulerCurrent = null;
let lockedColumn = null; // Pour verrouiller la colonne en mode Nyzynka

// Layer haute résolution pour Nyzynka (et futurs styles de broderie)
let hiResLayer = {
    enabled: false,
    W: 0, // Largeur en haute résolution (W * 3)
    H: 0, // Hauteur en haute résolution (H * 3)
    pixels: [], // Pixels haute résolution
    styles: []  // Styles haute résolution
};

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const container = document.getElementById("canvasContainer");

/** INIT **/
function init(w, h, data = null, styles = null) {
    // Sauvegarder les dimensions originales
    originalW = w;
    originalH = h;
    originalPixels = data ? [...data] : new Array(w * h).fill(bgDefault);
    originalPixelStyles = styles ? [...styles] : new Array(w * h).fill('cross');
    
    // Étendre en mode TRAME (3×) par défaut
    W = w * 3;
    H = h * 3;
    pixels = new Array(W * H).fill(bgDefault);
    pixelStyles = new Array(W * H).fill('cross');
    
    // Copier chaque pixel original dans une zone 3×3
    for(let y = 0; y < originalH; y++) {
        for(let x = 0; x < originalW; x++) {
            let oldIdx = y * originalW + x;
            let color = originalPixels[oldIdx];
            let style = originalPixelStyles[oldIdx];
            
            // Remplir la zone 3×3 correspondante
            for(let dy = 0; dy < 3; dy++) {
                for(let dx = 0; dx < 3; dx++) {
                    let newX = x * 3 + dx;
                    let newY = y * 3 + dy;
                    let newIdx = newY * W + newX;
                    pixels[newIdx] = color;
                    pixelStyles[newIdx] = style;
                }
            }
        }
    }
    
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
    
    // En mode PIXEL (par défaut) : regrouper les pixels 3×3 pour afficher 1 seul pixel/croix (sauf Nyzynka)
    // En mode TRAME + Embroidery : afficher en haute résolution, mais regrouper en embroidery
    if ((trameMode && renderMode === "cross") || !trameMode) {
        // Parcourir par blocs 3×3
        let blocksW = Math.floor(W / 3);
        let blocksH = Math.floor(H / 3);
        for (let by = 0; by < blocksH; by++) {
            for (let bx = 0; bx < blocksW; bx++) {
                // Vérifier si ce bloc 3×3 contient des pixels colorés et leur style
                let blockColor = null;
                let blockStyle = null;
                for (let dy = 0; dy < 3 && !blockColor; dy++) {
                    for (let dx = 0; dx < 3 && !blockColor; dx++) {
                        let x = bx * 3 + dx;
                        let y = by * 3 + dy;
                        let idx = y * W + x;
                        if (pixels[idx] !== bgDefault) {
                            blockColor = pixels[idx];
                            blockStyle = pixelStyles[idx];
                        }
                    }
                }
                
                // Si le bloc contient une couleur
                if (blockColor) {
                    if (blockStyle === 'nyzynka') {
                        // Nyzynka : dessiner les traits verticaux normalement pour chaque pixel du bloc
                        for (let dy = 0; dy < 3; dy++) {
                            for (let dx = 0; dx < 3; dx++) {
                                let x = bx * 3 + dx;
                                let y = by * 3 + dy;
                                let idx = y * W + x;
                                if (pixels[idx] !== bgDefault && pixelStyles[idx] === 'nyzynka') {
                                    let px = x * pixelSize;
                                    let py = y * pixelSize;
                                    ctx.fillStyle = pixels[idx];
                                    let lineWidth = Math.max(2, pixelSize * 0.15);
                                    let centerX = px + (pixelSize / 2) - (lineWidth / 2);
                                    let yOffset = (x % 2 === 1) ? pixelSize * 0.5 : 0;
                                    ctx.fillRect(centerX, py + yOffset, lineWidth, pixelSize);
                                }
                            }
                        }
                    } else {
                        // Point de croix : dessiner 1 croix au centre du bloc 3×3
                        let centerX = (bx * 3 + 1.5) * pixelSize;
                        let centerY = (by * 3 + 1.5) * pixelSize;
                        let crossSize = pixelSize * 2.5;
                        
                        ctx.strokeStyle = blockColor;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        let p = crossSize * 0.2;
                        ctx.moveTo(centerX - crossSize/2 + p, centerY - crossSize/2 + p);
                        ctx.lineTo(centerX + crossSize/2 - p, centerY + crossSize/2 - p);
                        ctx.moveTo(centerX + crossSize/2 - p, centerY - crossSize/2 + p);
                        ctx.lineTo(centerX - crossSize/2 + p, centerY + crossSize/2 - p);
                        ctx.stroke();
                    }
                }
            }
        }
    } else {
        // Mode TRAME : afficher chaque pixel individuellement en haute résolution
        for (let i = 0; i < pixels.length; i++) {
            if (pixels[i] === bgDefault) continue;
            let x = i % W, y = Math.floor(i / W);
            let px = x * pixelSize, py = y * pixelSize;
            let style = pixelStyles[i] || 'cross';
            
            ctx.fillStyle = pixels[i];
            
            if (style === 'nyzynka') {
                // Mode Nyzynka : lignes verticales avec décalage
                let lineWidth = Math.max(2, pixelSize * 0.15);
                let centerX = px + (pixelSize / 2) - (lineWidth / 2);
                let yOffset = (x % 2 === 1) ? pixelSize * 0.5 : 0;
                ctx.fillRect(centerX, py + yOffset, lineWidth, pixelSize);
                
            } else if (renderMode === "cross") {
                // Mode broderie (croix)
                ctx.strokeStyle = pixels[i];
                ctx.lineWidth = 3;
                ctx.beginPath();
                let p = pixelSize * 0.2;
                ctx.moveTo(px+p, py+p);
                ctx.lineTo(px+pixelSize-p, py+pixelSize-p);
                ctx.moveTo(px+pixelSize-p, py+p);
                ctx.lineTo(px+p, py+pixelSize-p);
                ctx.stroke();
            } else {
                // Mode pixel normal (point de croix plein)
                ctx.fillRect(px, py, pixelSize, pixelSize);
            }
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
        // Style uniforme pour toutes les grilles
        ctx.strokeStyle = "rgba(120,120,120,0.2)";
        ctx.lineWidth = 0.5;
        
        if (trameMode) {
            // Mode TRAME : grille normale (chaque pixel)
            for(let i=0; i<=W; i++) { ctx.beginPath(); ctx.moveTo(i*pixelSize, 0); ctx.lineTo(i*pixelSize, canvas.height); ctx.stroke(); }
            for(let i=0; i<=H; i++) { ctx.beginPath(); ctx.moveTo(0, i*pixelSize); ctx.lineTo(canvas.width, i*pixelSize); ctx.stroke(); }
        } else {
            // Mode PIXEL (par défaut) : grille adaptée (3× pour les blocs collapsés, fine pour Nyzynka)
            
            // Dessiner la grille par blocs 3×3
            let blocksW = Math.floor(W / 3);
            let blocksH = Math.floor(H / 3);
            
            for (let by = 0; by <= blocksH; by++) {
                for (let bx = 0; bx <= blocksW; bx++) {
                    // Vérifier si ce bloc contient du Nyzynka
                    let hasNyzynka = false;
                    if (by < blocksH && bx < blocksW) {
                        for (let dy = 0; dy < 3 && !hasNyzynka; dy++) {
                            for (let dx = 0; dx < 3 && !hasNyzynka; dx++) {
                                let x = bx * 3 + dx;
                                let y = by * 3 + dy;
                                if (x < W && y < H) {
                                    let idx = y * W + x;
                                    if (pixelStyles[idx] === 'nyzynka') {
                                        hasNyzynka = true;
                                    }
                                }
                            }
                        }
                    }
                    
                    if (hasNyzynka) {
                        // Zone Nyzynka : grille fine (chaque pixel)
                        for (let dy = 0; dy <= 3; dy++) {
                            let y = by * 3 + dy;
                            if (y <= H) {
                                ctx.beginPath();
                                ctx.moveTo(bx * 3 * pixelSize, y * pixelSize);
                                ctx.lineTo((bx * 3 + 3) * pixelSize, y * pixelSize);
                                ctx.stroke();
                            }
                        }
                        for (let dx = 0; dx <= 3; dx++) {
                            let x = bx * 3 + dx;
                            if (x <= W) {
                                ctx.beginPath();
                                ctx.moveTo(x * pixelSize, by * 3 * pixelSize);
                                ctx.lineTo(x * pixelSize, (by * 3 + 3) * pixelSize);
                                ctx.stroke();
                            }
                        }
                    }
                }
            }
            
            // Dessiner la grille globale pour les blocs 3×3 (zones non-Nyzynka)
            for (let i = 0; i <= blocksW; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 3 * pixelSize, 0);
                ctx.lineTo(i * 3 * pixelSize, canvas.height);
                ctx.stroke();
            }
            for (let j = 0; j <= blocksH; j++) {
                ctx.beginPath();
                ctx.moveTo(0, j * 3 * pixelSize);
                ctx.lineTo(canvas.width, j * 3 * pixelSize);
                ctx.stroke();
            }
        }
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
        // Si on dessine en point de croix, toujours dessiner un bloc 3×3
        if (currentStyle === 'cross') {
            // Trouver le coin supérieur gauche du bloc 3×3 contenant ce pixel
            let blockX = Math.floor(p[0] / 3) * 3;
            let blockY = Math.floor(p[1] / 3) * 3;
            
            // Remplir tout le bloc 3×3
            for(let dy = 0; dy < 3; dy++) {
                for(let dx = 0; dx < 3; dx++) {
                    let px = blockX + dx;
                    let py = blockY + dy;
                    if(px >= 0 && px < W && py >= 0 && py < H) {
                        let idx = py * W + px;
                        pixels[idx] = col;
                        pixelStyles[idx] = currentStyle;
                    }
                }
            }
        } else {
            // Pour les autres styles (nyzynka), utiliser le brushSize normal
            let radius = Math.floor(brushSize / 2);
            for(let i = -radius; i <= (brushSize%2===0?radius-1:radius); i++) {
                for(let j = -radius; j <= (brushSize%2===0?radius-1:radius); j++) {
                    let px = p[0]+i, py = p[1]+j;
                    if(px>=0 && px<W && py>=0 && py<H) {
                        let idx = py*W+px;
                        pixels[idx] = col;
                        pixelStyles[idx] = currentStyle;
                    }
                }
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
    
    // Verrouiller la colonne en mode Nyzynka
    if (currentStyle === 'nyzynka' && (tool === 'pencil' || tool === 'eraser')) {
        lockedColumn = p.x;
    }

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
    let p = getCoord(e);
    
    // Verrouiller sur la colonne en mode Nyzynka
    if (lockedColumn !== null && currentStyle === 'nyzynka' && (tool === 'pencil' || tool === 'eraser')) {
        p.x = lockedColumn;
    }

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
    lockedColumn = null; // Déverrouiller la colonne
    
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
    
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
}

function setStitchStyle(style) {
    currentStyle = style;
    document.querySelectorAll('.tool-btn[data-style]').forEach(b => b.classList.toggle('active', b.dataset.style === style));
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
    
    // Mettre à jour les indicateurs visuels du menu View
    updateMenuIndicators();
}

function updateMenuIndicators() {
    // Grid
    const menuGrid = document.getElementById("menuGrid");
    if(menuGrid) {
        if(gridMode) menuGrid.classList.add("active");
        else menuGrid.classList.remove("active");
    }
    
    // Embroidery Mode
    const menuEmbroidery = document.getElementById("menuEmbroidery");
    if(menuEmbroidery) {
        if(renderMode === "cross") menuEmbroidery.classList.add("active");
        else menuEmbroidery.classList.remove("active");
    }
    
    // TRAME Mode
    const menuTrame = document.getElementById("menuTrame");
    if(menuTrame) {
        if(trameMode) menuTrame.classList.add("active");
        else menuTrame.classList.remove("active");
    }
    
    // Mettre à jour la barre d'état
    updateStatusBar();
}

function updateStatusBar() {
    // Dimensions
    const statusDimensions = document.getElementById("statusDimensions");
    if(statusDimensions) {
        let baseW = originalW || Math.floor(W / 3);
        let baseH = originalH || Math.floor(H / 3);
        statusDimensions.textContent = `${baseW}×${baseH}${!trameMode ? ' (Pixel Mode)' : ' (TRAME: ' + W + '×' + H + ')'}`;
    }
    
    // Mode actif
    const statusMode = document.getElementById("statusMode");
    if(statusMode) {
        let modes = [];
        if(gridMode) modes.push("Grid");
        if(renderMode === "cross") modes.push("Embroidery");
        if(trameMode) modes.push("TRAME");
        statusMode.textContent = modes.length > 0 ? modes.join(" | ") : "Pixel Mode";
    }
    
    // Nombre de pixels
    const statusPixels = document.getElementById("statusPixels");
    if(statusPixels) {
        let count = pixels.filter(p => p !== bgDefault).length;
        statusPixels.textContent = `${count} pixels`;
    }
}

function updateStats() {
    document.getElementById("pixelCount").innerText = pixels.filter(p => p !== bgDefault).length;
    updateThreadCount();
}

function toggleGrid() { gridMode = !gridMode; render(); }
function toggleNumberedGrid() { numberedGrid = !numberedGrid; refresh(); }
function toggleRender() { renderMode = (renderMode === "pixel" ? "cross" : "pixel"); nyzynkaMode = false; if(trameMode) refresh(); }
function toggleNyzynka() { nyzynkaMode = !nyzynkaMode; if(nyzynkaMode) { renderMode = "pixel"; trameMode = true; } refresh(); }
function toggleTrameMode() {
    // Basculer entre mode PIXEL (par défaut, collapsé) et mode TRAME (haute résolution)
    trameMode = !trameMode;
    
    // Le rendu s'adapte automatiquement via la fonction render()
    // En mode PIXEL (trameMode=false), les blocs 3×3 sont affichés comme 1 seul pixel/croix
    // En mode TRAME (trameMode=true), affichage en haute résolution
    // Nyzynka reste toujours en détail
    refresh();
}
function saveLocal() {
    // Toujours sauvegarder les dimensions originales (basse résolution)
    let saveW = originalW || Math.floor(W / 3);
    let saveH = originalH || Math.floor(H / 3);
    let savePixels = originalPixels || pixels;
    let savePixelStyles = originalPixelStyles || pixelStyles;
    
    localStorage.setItem("pix_pro_save_v3", JSON.stringify({
        W: saveW,
        H: saveH,
        pixels: savePixels,
        pixelStyles: savePixelStyles,
        bgDefault,
        paletteColors
    }));
}

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
    // Sauvegarder les dimensions originales (basse résolution)
    let saveW = originalW || Math.floor(W / 3);
    let saveH = originalH || Math.floor(H / 3);
    let savePixels = originalPixels || pixels;
    let savePixelStyles = originalPixelStyles || pixelStyles;
    
    const data = JSON.stringify({
        W: saveW,
        H: saveH,
        pixels: savePixels,
        pixelStyles: savePixelStyles,
        bgDefault,
        paletteColors
    });
    const blob = new Blob([data], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "design.json";
    a.click();
}

function loadJSON() {
    let i = document.createElement('input');
    i.type = "file";
    i.accept = ".json";
    i.onchange = e => {
        let reader = new FileReader();
        reader.onload = r => {
            let d = JSON.parse(r.target.result);
            paletteColors = d.paletteColors || paletteColors;
            bgDefault = d.bgDefault || "#111111";
            // init() va automatiquement étendre en 3× et sauvegarder les originaux
            init(d.W, d.H, d.pixels, d.pixelStyles);
            rebuildPalette();
        };
        reader.readAsText(e.target.files[0]);
    };
    i.click();
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

function newProject() {
    if(confirm("Discard current work and start new?")) {
        // Réinitialiser les variables du mode TRAME
        trameMode = false;
        originalPixels = null;
        originalPixelStyles = null;
        originalW = 0;
        originalH = 0;
        init(32, 32);
    }
}

/** STARTUP **/
const saved = localStorage.getItem("pix_pro_save_v3");
if(saved) {
    const s = JSON.parse(saved); bgDefault = s.bgDefault || "#111111";
    paletteColors = s.paletteColors || paletteColors;
    init(s.W, s.H, s.pixels, s.pixelStyles);
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
