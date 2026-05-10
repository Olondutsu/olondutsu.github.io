/** GLOBAL STATE **/
let W = 32, H = 32, pixelSize = 10;
let pixels = []; // Canvas principal (résolution normale)
let pixelStyles = []; // 'cross' uniquement pour le canvas principal
let pixelOffsets = []; // Décalage Y pour les traits de Nyzynka (sauvegardé au moment du dessin)
let currentColor = "#ffffff";
let currentStyle = "cross"; // Default style
let bgDefault = "#111111";
let paletteColors = ["#000000", "#ffffff", "#be0000", "#ffcc00", "#1a5e1a", "#2a2aff"];
let tool = "pencil", brushSize = 1;
let lineWidthPercent = 15; // Largeur des lignes en pourcentage (5-50%)
let mirrorX = false, mirrorY = false, mirrorRadial = false, mX = 15.5, mY = 15.5;
let undoStack = [], redoStack = [];
let gridMode = true, numberedGrid = false, renderMode = "pixel", nyzynkaMode = false, trameMode = false, isDrawing = false, isPanning = false;
let sel = null, clipboard = null, floatingLayer = null;
let drawing = false;
let isRulerActive = false;
let rulerStart = null;
let rulerCurrent = null;
let lockedColumn = null; // Pour verrouiller la colonne en mode Nyzynka

// Variables pour stocker les dimensions et données originales (basse résolution)
let originalW = 0, originalH = 0, originalPixelSize = 0;
let originalPixels = null, originalPixelStyles = null;

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

// Panneau latéral de sélection
const selectionSidePanel = document.getElementById("selectionSidePanel");
const selectionPreviewCanvas = document.getElementById("selectionPreviewCanvas");
const selectionPreviewCtx = selectionPreviewCanvas.getContext("2d");

/** INIT **/
function init(w, h, data = null, styles = null, offsets = null) {
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
    pixelOffsets = new Array(W * H).fill(0);
    
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
                    
                    // Recalculer le multiplicateur pour chaque pixel en fonction de sa NOUVELLE position X
                    if (style === 'nyzynka') {
                        pixelOffsets[newIdx] = (newX % 2 === 1) ? 1 : 0;
                    } else {
                        pixelOffsets[newIdx] = 0;
                    }
                }
            }
        }
    }
    
    mX = (W - 1) / 2; mY = (H - 1) / 2;
    document.getElementById("mXSlider").max = W - 1;
    document.getElementById("mYSlider").max = H - 1;
    refresh();
    // Centrer le canvas dans le conteneur
    // Le canvasWrapper a des marges de 50vw (gauche/droite) et 50vh (haut/bas)
    // Pour centrer : marge + (taille canvas / 2) - (taille viewport / 2)
    const marginLeft = container.clientWidth / 2;  // 50vw
    const marginTop = container.clientHeight / 2;  // 50vh
    container.scrollLeft = marginLeft + (W * pixelSize / 2) - (container.clientWidth / 2);
    container.scrollTop = marginTop + (H * pixelSize / 2) - (container.clientHeight / 2);
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
                                    let lineWidth = Math.max(2, pixelSize * (lineWidthPercent / 100));
                                    let centerX = px + (pixelSize / 2) - (lineWidth / 2);
                                    // Utiliser le multiplicateur sauvegardé et le multiplier par pixelSize
                                    let yOffsetMultiplier = pixelOffsets[idx] || 0;
                                    let yOffset = yOffsetMultiplier * pixelSize;
                                    // Le fil va du centre du trou du haut au centre du pixel actuel (1 pixel de hauteur)
                                    ctx.fillRect(centerX, py - pixelSize * 0.5 + yOffset, lineWidth, pixelSize * 1);
                                }
                            }
                        }
                    } else {
                        // Point de croix : dessiner 1 croix au centre du bloc 3×3
                        let centerX = (bx * 3 + 1.5) * pixelSize;
                        let centerY = (by * 3 + 1.5) * pixelSize;
                        let crossSize = pixelSize * 2.5;
                        
                        ctx.strokeStyle = blockColor;
                        ctx.lineWidth = Math.max(2, pixelSize * (lineWidthPercent / 100));
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
        // Mode TRAME : afficher en haute résolution
        // Marquer les pixels déjà rendus pour éviter les doublons
        let rendered = new Set();
        
        for (let i = 0; i < pixels.length; i++) {
            if (pixels[i] === bgDefault || rendered.has(i)) continue;
            let x = i % W, y = Math.floor(i / W);
            let px = x * pixelSize, py = y * pixelSize;
            let style = pixelStyles[i] || 'cross';
            
            ctx.fillStyle = pixels[i];
            
            if (style === 'nyzynka') {
                // Mode Nyzynka : lignes verticales avec décalage
                let lineWidth = Math.max(2, pixelSize * (lineWidthPercent / 100));
                let centerX = px + (pixelSize / 2) - (lineWidth / 2);
                let yOffsetMultiplier = pixelOffsets[i] || 0;
                let yOffset = yOffsetMultiplier * pixelSize;
                ctx.fillRect(centerX, py - pixelSize * 0.5 + yOffset, lineWidth, pixelSize * 1);
                rendered.add(i);
                
            } else if (style === 'cross') {
                // Style cross : toujours rendre comme un bloc 3×3, même en mode TRAME
                // Trouver le coin supérieur gauche du bloc 3×3
                let blockX = Math.floor(x / 3) * 3;
                let blockY = Math.floor(y / 3) * 3;
                
                // Vérifier si ce bloc contient des pixels cross
                let hasBlock = false;
                for (let dy = 0; dy < 3; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        let checkX = blockX + dx;
                        let checkY = blockY + dy;
                        if (checkX < W && checkY < H) {
                            let checkIdx = checkY * W + checkX;
                            if (pixels[checkIdx] !== bgDefault && pixelStyles[checkIdx] === 'cross') {
                                hasBlock = true;
                                rendered.add(checkIdx);
                            }
                        }
                    }
                }
                
                // Dessiner le bloc 3×3 complet
                if (hasBlock) {
                    if (renderMode === "cross") {
                        // Mode embroidery : dessiner une croix
                        let centerX = (blockX + 1.5) * pixelSize;
                        let centerY = (blockY + 1.5) * pixelSize;
                        let crossSize = pixelSize * 2.5;
                        ctx.strokeStyle = pixels[i];
                        ctx.lineWidth = Math.max(2, pixelSize * (lineWidthPercent / 100));
                        ctx.beginPath();
                        let p = crossSize * 0.2;
                        ctx.moveTo(centerX - crossSize/2 + p, centerY - crossSize/2 + p);
                        ctx.lineTo(centerX + crossSize/2 - p, centerY + crossSize/2 - p);
                        ctx.moveTo(centerX + crossSize/2 - p, centerY - crossSize/2 + p);
                        ctx.lineTo(centerX - crossSize/2 + p, centerY + crossSize/2 - p);
                        ctx.stroke();
                    } else {
                        // Mode pixel : dessiner un bloc 3×3 plein
                        ctx.fillRect(blockX * pixelSize, blockY * pixelSize, pixelSize * 3, pixelSize * 3);
                    }
                }
            } else {
                // Autres styles : pixel individuel
                ctx.fillRect(px, py, pixelSize, pixelSize);
                rendered.add(i);
            }
        }
    }

    // Floating Layer (Selection being moved)
    if (floatingLayer) {
        ctx.globalAlpha = 0.7;
        
        // En mode PIXEL (par défaut) : regrouper les pixels 3×3 pour afficher 1 seul pixel/croix (sauf Nyzynka)
        if ((trameMode && renderMode === "cross") || !trameMode) {
            // Parcourir par blocs 3×3 dans le floatingLayer
            let blocksW = Math.floor(floatingLayer.w / 3);
            let blocksH = Math.floor(floatingLayer.h / 3);
            
            for (let by = 0; by < blocksH; by++) {
                for (let bx = 0; bx < blocksW; bx++) {
                    // Vérifier si ce bloc 3×3 contient des pixels colorés et leur style
                    let blockColor = null;
                    let blockStyle = null;
                    for (let dy = 0; dy < 3 && !blockColor; dy++) {
                        for (let dx = 0; dx < 3 && !blockColor; dx++) {
                            let i = bx * 3 + dx;
                            let j = by * 3 + dy;
                            let idx = j * floatingLayer.w + i;
                            if (floatingLayer.data[idx] !== bgDefault) {
                                blockColor = floatingLayer.data[idx];
                                blockStyle = floatingLayer.styles ? floatingLayer.styles[idx] : 'cross';
                            }
                        }
                    }
                    
                    // Si le bloc contient une couleur
                    if (blockColor) {
                        if (blockStyle === 'nyzynka') {
                            // Nyzynka : dessiner les traits verticaux normalement pour chaque pixel du bloc
                            for (let dy = 0; dy < 3; dy++) {
                                for (let dx = 0; dx < 3; dx++) {
                                    let i = bx * 3 + dx;
                                    let j = by * 3 + dy;
                                    let idx = j * floatingLayer.w + i;
                                    if (floatingLayer.data[idx] !== bgDefault &&
                                        floatingLayer.styles && floatingLayer.styles[idx] === 'nyzynka') {
                                        let x = floatingLayer.x + i;
                                        let y = floatingLayer.y + j;
                                        let px = x * pixelSize;
                                        let py = y * pixelSize;
                                        ctx.fillStyle = floatingLayer.data[idx];
                                        let lineWidth = Math.max(2, pixelSize * (lineWidthPercent / 100));
                                        let centerX = px + (pixelSize / 2) - (lineWidth / 2);
                                        // Utiliser le multiplicateur du floatingLayer et le multiplier par pixelSize
                                        let yOffsetMultiplier = (floatingLayer.offsets && floatingLayer.offsets[idx]) || 0;
                                        let yOffset = yOffsetMultiplier * pixelSize;
                                        // Le fil va du centre du trou du haut au centre du pixel actuel (1 pixel de hauteur)
                                        ctx.fillRect(centerX, py - pixelSize * 0.5 + yOffset, lineWidth, pixelSize * 1);
                                    }
                                }
                            }
                        } else {
                            // Point de croix : dessiner 1 croix au centre du bloc 3×3
                            let centerX = (floatingLayer.x + bx * 3 + 1.5) * pixelSize;
                            let centerY = (floatingLayer.y + by * 3 + 1.5) * pixelSize;
                            let crossSize = pixelSize * 2.5;
                            
                            ctx.strokeStyle = blockColor;
                            ctx.lineWidth = Math.max(2, pixelSize * (lineWidthPercent / 100));
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
            for (let j = 0; j < floatingLayer.h; j++) {
                for (let i = 0; i < floatingLayer.w; i++) {
                    let idx = j * floatingLayer.w + i;
                    let col = floatingLayer.data[idx];
                    let style = floatingLayer.styles ? floatingLayer.styles[idx] : 'cross';
                    
                    if (col !== bgDefault) {
                        let x = floatingLayer.x + i;
                        let y = floatingLayer.y + j;
                        let px = x * pixelSize;
                        let py = y * pixelSize;
                        
                        ctx.fillStyle = col;
                        
                        if (style === 'nyzynka') {
                            // Mode Nyzynka : lignes verticales avec décalage
                            let lineWidth = Math.max(2, pixelSize * (lineWidthPercent / 100));
                            let centerX = px + (pixelSize / 2) - (lineWidth / 2);
                            // Utiliser le multiplicateur du floatingLayer et le multiplier par pixelSize
                            let yOffsetMultiplier = (floatingLayer.offsets && floatingLayer.offsets[idx]) || 0;
                            let yOffset = yOffsetMultiplier * pixelSize;
                            // Le fil va du centre du trou du haut au centre du pixel actuel (1 pixel de hauteur)
                            ctx.fillRect(centerX, py - pixelSize * 0.5 + yOffset, lineWidth, pixelSize * 1);
                        } else if (renderMode === "cross") {
                            // Mode broderie (croix)
                            ctx.strokeStyle = col;
                            ctx.lineWidth = Math.max(2, pixelSize * (lineWidthPercent / 100));
                            ctx.beginPath();
                            let p = pixelSize * 0.2;
                            ctx.moveTo(px+p, py+p);
                            ctx.lineTo(px+pixelSize-p, py+pixelSize-p);
                            ctx.moveTo(px+pixelSize-p, py+p);
                            ctx.lineTo(px+p, py+pixelSize-p);
                            ctx.stroke();
                        } else {
                            // Mode pixel normal
                            ctx.fillRect(px, py, pixelSize, pixelSize);
                        }
                    }
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
        
        // En mode PIXEL (trameMode=false), la sélection est en coordonnées de blocs 3×3
        if (!trameMode) {
            let x1 = Math.min(sel.x1, sel.x2) * 3;
            let y1 = Math.min(sel.y1, sel.y2) * 3;
            let w = (Math.abs(sel.x1 - sel.x2) + 1) * 3;
            let h = (Math.abs(sel.y1 - sel.y2) + 1) * 3;
            ctx.strokeRect(x1 * pixelSize, y1 * pixelSize, w * pixelSize, h * pixelSize);
        } else {
            // En mode TRAME, coordonnées normales
            ctx.strokeRect(Math.min(sel.x1, sel.x2)*pixelSize, Math.min(sel.y1, sel.y2)*pixelSize, (Math.abs(sel.x1-sel.x2)+1)*pixelSize, (Math.abs(sel.y1-sel.y2)+1)*pixelSize);
        }
        
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
function setPix(x, y, col, mouseEvent = null) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    
    // Calculer le yOffset pour Nyzynka
    // Stocker comme multiplicateur (0 ou 1), pas en pixels absolus
    // Sera multiplié par pixelSize au moment du rendu pour s'adapter au zoom
    let clickYOffsetMultiplier = 0;
    if (currentStyle === 'nyzynka') {
        // Le décalage alterne à chaque colonne X
        // Colonne paire (0, 2, 4...) : multiplicateur = 0
        // Colonne impaire (1, 3, 5...) : multiplicateur = 1
        clickYOffsetMultiplier = (x % 2 === 1) ? 1 : 0;
    }
    
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
        // En mode TRAME avec style cross, dessiner un bloc 3×3 aligné sur la grille
        if (trameMode && currentStyle === 'cross') {
            // Aligner sur la grille 3×3 : trouver le coin supérieur gauche du bloc
            let blockX = Math.floor(p[0] / 3) * 3;
            let blockY = Math.floor(p[1] / 3) * 3;
            
            // Dessiner un bloc 3×3 aligné sur la grille
            for(let i = 0; i < 3; i++) {
                for(let j = 0; j < 3; j++) {
                    let px = blockX + i;
                    let py = blockY + j;
                    if(px>=0 && px<W && py>=0 && py<H) {
                        let idx = py*W+px;
                        pixels[idx] = col;
                        pixelStyles[idx] = currentStyle;
                        pixelOffsets[idx] = 0;
                    }
                }
            }
        } else {
            // Comportement normal pour les autres cas
            let radius = Math.floor(brushSize / 2);
            for(let i = -radius; i <= (brushSize%2===0?radius-1:radius); i++) {
                for(let j = -radius; j <= (brushSize%2===0?radius-1:radius); j++) {
                    let px = p[0]+i, py = p[1]+j;
                    if(px>=0 && px<W && py>=0 && py<H) {
                        let idx = py*W+px;
                        pixels[idx] = col;
                        pixelStyles[idx] = currentStyle;
                        
                        // Sauvegarder le multiplicateur de yOffset pour Nyzynka
                        if (currentStyle === 'nyzynka') {
                            pixelOffsets[idx] = clickYOffsetMultiplier;
                        } else {
                            pixelOffsets[idx] = 0;
                        }
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
        // p contient déjà les coordonnées converties (blocs en mode PIXEL, pixels en mode TRAME)
        const xMin = Math.min(sel.x1, sel.x2);
        const yMin = Math.min(sel.y1, sel.y2);
        const w = Math.abs(sel.x1 - sel.x2) + 1;
        const h = Math.abs(sel.y1 - sel.y2) + 1;
        
        if (p.x >= xMin && p.x < xMin + w && p.y >= yMin && p.y < yMin + h) {
            saveState();
            
            // Convertir en coordonnées pixels pour extraire les données
            let pixelXMin, pixelYMin, pixelW, pixelH;
            if (!trameMode) {
                pixelXMin = xMin * 3;
                pixelYMin = yMin * 3;
                pixelW = w * 3;
                pixelH = h * 3;
            } else {
                pixelXMin = xMin;
                pixelYMin = yMin;
                pixelW = w;
                pixelH = h;
            }
            
            floatingLayer = { w: pixelW, h: pixelH, x: pixelXMin, y: pixelYMin, data: [], styles: [], offsets: [] };
            for(let j=0; j<pixelH; j++) for(let i=0; i<pixelW; i++) {
                let idx = (pixelYMin+j)*W + (pixelXMin+i);
                floatingLayer.data.push(pixels[idx]);
                floatingLayer.styles.push(pixelStyles[idx]);
                floatingLayer.offsets.push(pixelOffsets[idx]);
                pixels[idx] = bgDefault;
                pixelStyles[idx] = 'cross'; // Réinitialiser le style aussi
                pixelOffsets[idx] = 0; // Réinitialiser l'offset aussi
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
    if (tool === "convert") {
        // Récupérer le style cible sélectionné dans le panneau
        let targetStyle = document.getElementById("convertToCross").checked ? 'cross' : 'nyzynka';
        saveState();
        convertStitchStyle(p.x, p.y, targetStyle);
        refresh();
        return;
    }
    if (tool === "select") {
        sel = {x1: p.x, y1: p.y, x2: p.x, y2: p.y};
    } else {
        setPix(p.x, p.y, (tool === "eraser" ? bgDefault : currentColor), e);
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
        // En mode PIXEL, p.x et p.y sont en coordonnées de blocs, il faut les convertir en pixels
        let targetX = p.x;
        let targetY = p.y;
        if (!trameMode) {
            targetX = p.x * 3;
            targetY = p.y * 3;
        }
        floatingLayer.x = Math.floor(targetX - floatingLayer.w / 2);
        floatingLayer.y = Math.floor(targetY - floatingLayer.h / 2);
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
        setPix(p.x, p.y, (tool === "eraser" ? bgDefault : currentColor), e);
    }
    refresh();
});

window.addEventListener('pointerup', () => {
    if (tool === "ruler") {
        refresh(); // Efface le trait blanc une fois fini
        rulerStart = null; // Prêt pour la prochaine mesure
    }
    
    // Ouvrir le panneau latéral si une sélection vient d'être créée
    if (tool === "select" && sel && isDrawing) {
        openSelectionPanel();
    }
    
    isDrawing = false;
    lockedColumn = null; // Déverrouiller la colonne
    
    saveLocal();
});

/** EDIT FUNCTIONS **/
function copySelection() {
    if(!sel) { alert("Select an area first"); return; }
    
    // En mode PIXEL (trameMode=false), convertir les coordonnées de blocs en pixels
    let x, y, w, h;
    if (!trameMode) {
        x = Math.min(sel.x1, sel.x2) * 3;
        y = Math.min(sel.y1, sel.y2) * 3;
        w = (Math.abs(sel.x1 - sel.x2) + 1) * 3;
        h = (Math.abs(sel.y1 - sel.y2) + 1) * 3;
    } else {
        x = Math.min(sel.x1, sel.x2);
        y = Math.min(sel.y1, sel.y2);
        w = Math.abs(sel.x1 - sel.x2) + 1;
        h = Math.abs(sel.y1 - sel.y2) + 1;
    }
    
    clipboard = { w, h, data: [], styles: [], offsets: [] };
    for(let j=0; j<h; j++) {
        for(let i=0; i<w; i++) {
            let idx = (y+j)*W + (x+i);
            clipboard.data.push(pixels[idx]);
            clipboard.styles.push(pixelStyles[idx]);
            clipboard.offsets.push(pixelOffsets[idx]);
        }
    }
    alert("Selection copied!");
}

function pasteSelection() {
    if(!clipboard) { alert("Nothing to paste"); return; }
    if(floatingLayer) confirmPaste();
    floatingLayer = {
        w: clipboard.w, h: clipboard.h,
        data: [...clipboard.data],
        styles: [...clipboard.styles],
        offsets: [...clipboard.offsets],
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
            let idx = j * floatingLayer.w + i;
            let col = floatingLayer.data[idx];
            let style = floatingLayer.styles[idx];
            let offset = floatingLayer.offsets ? floatingLayer.offsets[idx] : 0;
            if (tx >= 0 && tx < W && ty >= 0 && ty < H && col !== bgDefault) {
                pixels[ty * W + tx] = col;
                pixelStyles[ty * W + tx] = style;
                pixelOffsets[ty * W + tx] = offset;
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
    
    // En mode PIXEL (trameMode=false), convertir en coordonnées de blocs 3×3 pour la select box
    if (!trameMode && tool === "select") {
        x = Math.floor(x / 3);
        y = Math.floor(y / 3);
        let maxBlockX = Math.floor(W / 3) - 1;
        let maxBlockY = Math.floor(H / 3) - 1;
        return { x: Math.max(0, Math.min(maxBlockX, x)), y: Math.max(0, Math.min(maxBlockY, y)) };
    }
    
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
function updateLineWidth(v) {
    lineWidthPercent = parseInt(v);
    document.getElementById("lineWidthVal").innerText = v;
    render(); // Rafraîchir le rendu pour voir le changement
}
function showConvertSettings() { showPanel('convertPanel'); }
function convertStitchStyle(startX, startY, targetStyle) {
    let targetColor = pixels[startY * W + startX];
    let currentStyle = pixelStyles[startY * W + startX] || 'cross';
    
    // Si le pixel est transparent ou si le style est déjà le bon, ne rien faire
    if (targetColor === null || currentStyle === targetStyle) return;
    
    let diag = document.getElementById("convertDiag").checked;
    let stack = [[startX, startY]];
    let visited = new Set();
    
    while (stack.length > 0) {
        let [x, y] = stack.pop();
        let key = y * W + x;
        
        if (visited.has(key)) continue;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        if (pixels[key] !== targetColor) continue;
        if ((pixelStyles[key] || 'cross') !== currentStyle) continue;
        
        visited.add(key);
        
        // Convertir le style de ce pixel
        pixelStyles[key] = targetStyle;
        
        // Si on convertit vers nyzynka, calculer et sauvegarder le décalage
        if (targetStyle === 'nyzynka') {
            pixelOffsets[key] = (x % 2 === 1) ? 1 : 0;
        }
        
        // Ajouter les voisins
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        if (diag) {
            stack.push([x + 1, y + 1], [x + 1, y - 1], [x - 1, y + 1], [x - 1, y - 1]);
        }
    }
}
function showFillSettings() { showPanel('fillPanel'); }

/** HISTORY **/
function saveState() {
    undoStack.push(JSON.stringify({pixels, pixelStyles, pixelOffsets, bgDefault, W, H}));
    if(undoStack.length > 50) undoStack.shift();
    redoStack = [];
}
function undo() {
    if(!undoStack.length) return;
    redoStack.push(JSON.stringify({pixels, pixelStyles, pixelOffsets, bgDefault, W, H}));
    let s = JSON.parse(undoStack.pop());
    pixels = s.pixels;
    pixelStyles = s.pixelStyles || new Array(pixels.length).fill('cross');
    pixelOffsets = s.pixelOffsets || new Array(pixels.length).fill(0);
    bgDefault = s.bgDefault; W = s.W; H = s.H;
    refresh(); rebuildPalette();
}
function redo() {
    if(!redoStack.length) return;
    undoStack.push(JSON.stringify({pixels, pixelStyles, pixelOffsets, bgDefault, W, H}));
    let s = JSON.parse(redoStack.pop());
    pixels = s.pixels;
    pixelStyles = s.pixelStyles || new Array(pixels.length).fill('cross');
    pixelOffsets = s.pixelOffsets || new Array(pixels.length).fill(0);
    bgDefault = s.bgDefault; W = s.W; H = s.H;
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

        // Variables pour détecter le double-clic/tap (une par couleur)
        let tapCount = 0;
        let tapTimer = null;
        let lastTapTime = 0;
        
        const openColorPicker = () => {
            console.log('Ouverture du sélecteur de couleur pour:', c);
            
            // Créer et ouvrir le sélecteur de couleur
            let input = document.createElement("input");
            input.type = "color";
            input.value = c;
            input.style.position = "absolute";
            input.style.opacity = "0";
            input.style.pointerEvents = "none";
            document.body.appendChild(input);
            
            input.onchange = () => {
                console.log('Nouvelle couleur sélectionnée:', input.value);
                paletteColors[idx] = input.value;
                currentColor = input.value;
                rebuildPalette();
                document.body.removeChild(input);
            };
            
            input.onblur = () => {
                // Nettoyer si l'utilisateur annule
                setTimeout(() => {
                    if (document.body.contains(input)) {
                        document.body.removeChild(input);
                    }
                }, 100);
            };
            
            // Déclencher le clic pour ouvrir le sélecteur
            input.click();
        };
        
        const selectColor = () => {
            currentColor = c;
            rebuildPalette();
        };
        
        // Gestion tactile (mobile)
        d.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const now = Date.now();
            const timeSinceLastTap = now - lastTapTime;
            
            console.log('Touch détecté, temps depuis dernier tap:', timeSinceLastTap);
            
            if (timeSinceLastTap < 400 && timeSinceLastTap > 0) {
                // Double-tap détecté !
                console.log('Double-tap détecté !');
                clearTimeout(tapTimer);
                tapCount = 0;
                lastTapTime = 0;
                openColorPicker();
            } else {
                // Premier tap
                lastTapTime = now;
                tapCount = 1;
                
                // Attendre pour voir s'il y a un deuxième tap
                tapTimer = setTimeout(() => {
                    if (tapCount === 1) {
                        console.log('Simple tap - sélection de couleur');
                        selectColor();
                    }
                    tapCount = 0;
                }, 400);
            }
        }, { passive: false });
        
        // Gestion souris (desktop) - événement dblclick natif
        d.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Double-clic desktop détecté !');
            openColorPicker();
        });
        
        // Simple clic desktop
        d.addEventListener('click', (e) => {
            // Ne rien faire si c'est un double-clic (géré par dblclick)
            if (e.detail === 1) {
                setTimeout(() => {
                    if (e.detail === 1) {
                        selectColor();
                    }
                }, 200);
            }
        });

        const del = document.createElement("div");
        del.className = "del-color";
        del.innerText = "✕";
        
        // Suppression - touch et mouse
        const handleDelete = (e) => {
            e.preventDefault();
            e.stopPropagation();
            paletteColors.splice(idx, 1);
            rebuildPalette();
        };
        
        del.addEventListener('touchend', handleDelete, { passive: false });
        del.addEventListener('click', handleDelete);

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
    // Sauvegarder en HAUTE RÉSOLUTION pour préserver les positions exactes des pixels
    localStorage.setItem("pix_pro_save_v5", JSON.stringify({
        W: W,
        H: H,
        pixels: pixels,
        pixelStyles: pixelStyles,
        pixelOffsets: pixelOffsets,
        bgDefault,
        paletteColors,
        isHighRes: true  // Marqueur pour indiquer que c'est en haute résolution
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
    // Sauvegarder en HAUTE RÉSOLUTION pour préserver les positions exactes des pixels
    const data = JSON.stringify({
        W: W,
        H: H,
        pixels: pixels,
        pixelStyles: pixelStyles,
        pixelOffsets: pixelOffsets,
        bgDefault,
        paletteColors,
        isHighRes: true  // Marqueur pour indiquer que c'est en haute résolution
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
            
            // Si c'est une sauvegarde en haute résolution, charger directement
            if (d.isHighRes) {
                W = d.W;
                H = d.H;
                pixels = d.pixels;
                pixelStyles = d.pixelStyles;
                pixelOffsets = d.pixelOffsets || new Array(W * H).fill(0);
                originalW = Math.floor(W / 3);
                originalH = Math.floor(H / 3);
                mX = (W - 1) / 2; mY = (H - 1) / 2;
                document.getElementById("mXSlider").max = W - 1;
                document.getElementById("mYSlider").max = H - 1;
                canvas.width = W * pixelSize;
                canvas.height = H * pixelSize;
            } else {
                // Ancienne sauvegarde en basse résolution
                init(d.W, d.H, d.pixels, d.pixelStyles, d.pixelOffsets);
            }
            rebuildPalette();
            refresh();
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

// Variables pour le multi-touch - Système Procreate/Krita amélioré
// 1 doigt = Dessiner | 2 doigts = Pan/Zoom
let initialPinchDist = null;
let lastTouchPos = null;
let touchVelocity = { x: 0, y: 0 };
let lastTouchTime = 0;
let momentumAnimation = null;
let lastTwoFingerTime = 0; // Timestamp du dernier geste 2 doigts
let wasTwoFinger = false; // Flag pour savoir si on vient de faire un geste 2 doigts
const PAN_GRACE_PERIOD = 800; // 800ms de grâce après avoir levé un doigt

container.addEventListener('touchstart', e => {
    // Annuler l'inertie en cours
    if (momentumAnimation) {
        cancelAnimationFrame(momentumAnimation);
        momentumAnimation = null;
    }
    
    if (e.touches.length === 2) {
        // 2 DOIGTS = Mode navigation (Pan/Zoom)
        e.preventDefault();
        isPanning = true;
        isDrawing = false;
        wasTwoFinger = true;
        lastTwoFingerTime = Date.now();
        initialPinchDist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        // Position centrale entre les 2 doigts
        lastTouchPos = {
            x: (e.touches[0].pageX + e.touches[1].pageX) / 2,
            y: (e.touches[0].pageY + e.touches[1].pageY) / 2
        };
    } else if (e.touches.length === 1) {
        // 1 DOIGT
        const timeSinceLastTwoFinger = Date.now() - lastTwoFingerTime;
        
        // Si on vient juste de lever un doigt (< période de grâce), rester en mode pan
        if (wasTwoFinger && timeSinceLastTwoFinger < PAN_GRACE_PERIOD) {
            isPanning = true;
            isDrawing = false;
            console.log('🖐️ Mode Pan prolongé (1 doigt après 2 doigts)');
        } else {
            // Sinon, mode dessin normal
            isPanning = false;
            wasTwoFinger = false;
        }
        
        lastTouchPos = { x: e.touches[0].pageX, y: e.touches[0].pageY };
    }
    
    lastTouchTime = Date.now();
    touchVelocity = { x: 0, y: 0 };
}, { passive: false });

container.addEventListener('touchmove', e => {
    if (!lastTouchPos) return;
    
    const now = Date.now();
    const deltaTime = Math.max(1, now - lastTouchTime);

    if (e.touches.length === 2) {
        // 2 DOIGTS = Pan + Zoom simultanés
        e.preventDefault();
        wasTwoFinger = true;
        lastTwoFingerTime = now;
        
        // Calculer la nouvelle distance pour le zoom
        let dist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        
        // Position centrale actuelle
        const centerX = (e.touches[0].pageX + e.touches[1].pageX) / 2;
        const centerY = (e.touches[0].pageY + e.touches[1].pageY) / 2;
        
        // ZOOM
        if (initialPinchDist) {
            let ratio = dist / initialPinchDist;
            if (Math.abs(ratio - 1) > 0.01) {
                pixelSize = Math.max(2, Math.min(100, pixelSize * ratio));
                initialPinchDist = dist;
                refresh();
            }
        }
        
        // PAN (déplacement)
        const deltaX = centerX - lastTouchPos.x;
        const deltaY = centerY - lastTouchPos.y;
        
        container.scrollLeft -= deltaX;
        container.scrollTop -= deltaY;
        
        touchVelocity.x = deltaX / deltaTime * 16;
        touchVelocity.y = deltaY / deltaTime * 16;
        
        lastTouchPos = { x: centerX, y: centerY };
        isDrawing = false;
    } else if (e.touches.length === 1 && isPanning) {
        // 1 DOIGT en mode Pan (période de grâce)
        e.preventDefault();
        const deltaX = e.touches[0].pageX - lastTouchPos.x;
        const deltaY = e.touches[0].pageY - lastTouchPos.y;
        
        container.scrollLeft -= deltaX;
        container.scrollTop -= deltaY;
        
        touchVelocity.x = deltaX / deltaTime * 16;
        touchVelocity.y = deltaY / deltaTime * 16;
        
        lastTouchPos = { x: e.touches[0].pageX, y: e.touches[0].pageY };
        isDrawing = false;
    } else if (e.touches.length === 1) {
        // 1 DOIGT en mode dessin normal
        lastTouchPos = { x: e.touches[0].pageX, y: e.touches[0].pageY };
    }
    
    lastTouchTime = now;
}, { passive: false });

container.addEventListener('touchend', e => {
    const now = Date.now();
    
    if (e.touches.length === 0) {
        // Tous les doigts levés
        const timeSinceLastTwoFinger = now - lastTwoFingerTime;
        
        // Désactiver le mode pan après un délai
        setTimeout(() => {
            if (Date.now() - lastTwoFingerTime >= PAN_GRACE_PERIOD) {
                isPanning = false;
                wasTwoFinger = false;
                console.log('✋ Fin de la période de grâce - Mode dessin activé');
            }
        }, PAN_GRACE_PERIOD);
        
        initialPinchDist = null;
        
        // Appliquer l'inertie si la vélocité est suffisante
        const speed = Math.sqrt(touchVelocity.x ** 2 + touchVelocity.y ** 2);
        if (speed > 1) {
            applyMomentum();
        }
        
        lastTouchPos = null;
    } else if (e.touches.length === 1) {
        // Il reste 1 doigt après avoir levé l'autre
        // Garder le mode pan actif
        initialPinchDist = null;
        lastTouchPos = { x: e.touches[0].pageX, y: e.touches[0].pageY };
    }
});

// Fonction d'inertie (momentum scrolling) - Plus rapide
function applyMomentum() {
    const friction = 0.95; // Friction plus légère = plus fluide
    const minSpeed = 0.3;
    
    function animate() {
        container.scrollLeft -= touchVelocity.x;
        container.scrollTop -= touchVelocity.y;
        
        touchVelocity.x *= friction;
        touchVelocity.y *= friction;
        
        const speed = Math.sqrt(touchVelocity.x ** 2 + touchVelocity.y ** 2);
        if (speed > minSpeed && !isPanning) {
            momentumAnimation = requestAnimationFrame(animate);
        } else {
            momentumAnimation = null;
            touchVelocity = { x: 0, y: 0 };
        }
    }
    
    momentumAnimation = requestAnimationFrame(animate);
}

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
    const closeBtn = header ? header.querySelector('.close-btn') : null;
    if (!header) return;
    
    let isDraggingPanel = false, offset = [0,0];
    let hasMoved = false; // Pour détecter si c'est un drag ou un tap
    
    // Gestionnaire spécifique pour le bouton de fermeture sur mobile
    if (closeBtn) {
        closeBtn.addEventListener('touchend', (e) => {
            console.log('🔴 Close button touched');
            e.preventDefault();
            e.stopPropagation();
            hidePanels();
        }, { passive: false });
    }
    
    // Support souris
    header.onmousedown = (e) => {
        // Ne pas drag si on clique sur le bouton de fermeture
        if (e.target.classList.contains('close-btn')) return;
        isDraggingPanel = true;
        p.style.transform = 'none';
        offset = [p.offsetLeft - e.clientX, p.offsetTop - e.clientY];
    };
    
    const onMouseMove = (e) => {
        if (!isDraggingPanel) return;
        p.style.left = (e.clientX + offset[0]) + 'px';
        p.style.top = (e.clientY + offset[1]) + 'px';
    };
    
    const onMouseUp = () => {
        isDraggingPanel = false;
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    // Support tactile (mobile)
    header.addEventListener('touchstart', (e) => {
        // Ne pas drag si on touche le bouton de fermeture
        if (e.target.classList.contains('close-btn')) {
            console.log('❌ Touch on close button, not dragging');
            return;
        }
        
        console.log('🟢 Touch start on panel:', p.id);
        isDraggingPanel = true;
        hasMoved = false;
        p.style.transform = 'none';
        const touch = e.touches[0];
        offset = [p.offsetLeft - touch.clientX, p.offsetTop - touch.clientY];
        console.log('📍 Initial offset:', offset);
    }, { passive: false });
    
    const onTouchMove = (e) => {
        if (!isDraggingPanel) return;
        hasMoved = true;
        console.log('🔵 Touch move');
        e.preventDefault(); // Important pour mobile
        e.stopPropagation();
        const touch = e.touches[0];
        const newLeft = (touch.clientX + offset[0]);
        const newTop = (touch.clientY + offset[1]);
        p.style.left = newLeft + 'px';
        p.style.top = newTop + 'px';
        console.log('📍 New position:', newLeft, newTop);
    };
    
    const onTouchEnd = () => {
        console.log('🔴 Touch end, hasMoved:', hasMoved);
        isDraggingPanel = false;
        hasMoved = false;
    };
    
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

/** DRAGGABLE MENU TOGGLE BUTTON **/
(function() {
    const menuToggle = document.getElementById('menuToggle');
    if (!menuToggle) return;
    
    let isDraggingMenu = false;
    let offset = [0, 0];
    let hasMoved = false;
    let startPos = [0, 0];
    
    // Charger la position sauvegardée
    const savedPos = localStorage.getItem('menuTogglePosition');
    if (savedPos) {
        const pos = JSON.parse(savedPos);
        // Attendre que le DOM soit complètement chargé pour avoir les bonnes dimensions
        requestAnimationFrame(() => {
            const topMenuHeight = document.getElementById('top').offsetHeight || 45;
            const buttonWidth = menuToggle.offsetWidth || 50; // Fallback si pas encore rendu
            const buttonHeight = menuToggle.offsetHeight || 50;
            // Appliquer les contraintes de limites avec une marge de sécurité
            const maxLeft = Math.max(0, window.innerWidth - buttonWidth - 10);
            const maxTop = Math.max(0, window.innerHeight - buttonHeight - 10);
            const constrainedLeft = Math.max(10, Math.min(pos.left, maxLeft));
            const constrainedTop = Math.max(topMenuHeight + 10, Math.min(pos.top, maxTop));
            menuToggle.style.left = constrainedLeft + 'px';
            menuToggle.style.top = constrainedTop + 'px';
        });
    }
    
    // Sauvegarder la position
    function savePosition() {
        const pos = {
            left: menuToggle.offsetLeft,
            top: menuToggle.offsetTop
        };
        localStorage.setItem('menuTogglePosition', JSON.stringify(pos));
    }
    
    // Support souris
    menuToggle.onmousedown = (e) => {
        isDraggingMenu = true;
        hasMoved = false;
        startPos = [e.clientX, e.clientY];
        offset = [menuToggle.offsetLeft - e.clientX, menuToggle.offsetTop - e.clientY];
        // Ne pas preventDefault ici pour permettre le clic normal
    };
    
    const onMouseMove = (e) => {
        if (!isDraggingMenu) return;
        const dx = Math.abs(e.clientX - startPos[0]);
        const dy = Math.abs(e.clientY - startPos[1]);
        if (dx > 5 || dy > 5) {
            hasMoved = true;
            // Empêcher le comportement par défaut seulement quand on bouge
            if (!hasMoved) e.preventDefault();
        }
        
        if (hasMoved) {
            const topMenuHeight = document.getElementById('top').offsetHeight || 45;
            const buttonWidth = menuToggle.offsetWidth;
            const buttonHeight = menuToggle.offsetHeight;
            const newLeft = e.clientX + offset[0];
            const newTop = e.clientY + offset[1];
            // Appliquer les contraintes de limites avec marge de sécurité
            const maxLeft = Math.max(0, window.innerWidth - buttonWidth - 10);
            const maxTop = Math.max(0, window.innerHeight - buttonHeight - 10);
            const constrainedLeft = Math.max(10, Math.min(newLeft, maxLeft));
            const constrainedTop = Math.max(topMenuHeight + 10, Math.min(newTop, maxTop));
            menuToggle.style.left = constrainedLeft + 'px';
            menuToggle.style.top = constrainedTop + 'px';
        }
    };
    
    const onMouseUp = (e) => {
        if (isDraggingMenu) {
            isDraggingMenu = false;
            if (hasMoved) {
                savePosition();
                e.preventDefault();
                e.stopPropagation();
            }
        }
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    // Support tactile (mobile)
    menuToggle.addEventListener('touchstart', (e) => {
        isDraggingMenu = true;
        hasMoved = false;
        const touch = e.touches[0];
        startPos = [touch.clientX, touch.clientY];
        offset = [menuToggle.offsetLeft - touch.clientX, menuToggle.offsetTop - touch.clientY];
    }, { passive: true });
    
    const onTouchMove = (e) => {
        if (!isDraggingMenu) return;
        
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startPos[0]);
        const dy = Math.abs(touch.clientY - startPos[1]);
        
        // Détecter un mouvement significatif
        if (dx > 5 || dy > 5) {
            hasMoved = true;
            e.preventDefault(); // Empêcher le scroll uniquement si on bouge
            
            const topMenuHeight = document.getElementById('top').offsetHeight || 45;
            const buttonWidth = menuToggle.offsetWidth;
            const buttonHeight = menuToggle.offsetHeight;
            const newLeft = touch.clientX + offset[0];
            const newTop = touch.clientY + offset[1];
            // Appliquer les contraintes de limites avec marge de sécurité
            const maxLeft = Math.max(0, window.innerWidth - buttonWidth - 10);
            const maxTop = Math.max(0, window.innerHeight - buttonHeight - 10);
            const constrainedLeft = Math.max(10, Math.min(newLeft, maxLeft));
            const constrainedTop = Math.max(topMenuHeight + 10, Math.min(newTop, maxTop));
            menuToggle.style.left = constrainedLeft + 'px';
            menuToggle.style.top = constrainedTop + 'px';
        }
    };
    
    const onTouchEnd = (e) => {
        if (isDraggingMenu) {
            isDraggingMenu = false;
            if (hasMoved) {
                savePosition();
                e.preventDefault();
                e.stopPropagation();
            }
            hasMoved = false;
        }
    };
    
    menuToggle.addEventListener('touchmove', onTouchMove, { passive: false });
    menuToggle.addEventListener('touchend', onTouchEnd, { passive: false });
    menuToggle.addEventListener('touchcancel', onTouchEnd, { passive: false });
})();
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

function resetUIPosition() {
    const menuToggle = document.getElementById('menuToggle');
    if (!menuToggle) return;
    
    // Supprimer la position sauvegardée du localStorage
    localStorage.removeItem('menuTogglePosition');
    
    // Réinitialiser le style du bouton à sa position par défaut
    menuToggle.style.left = '';
    menuToggle.style.top = '';
    menuToggle.style.transform = '';
    
    // Message de confirmation
    alert('Interface réinitialisée à la position par défaut ✓');
}
}

/** STARTUP **/
const saved = localStorage.getItem("pix_pro_save_v5") || localStorage.getItem("pix_pro_save_v4") || localStorage.getItem("pix_pro_save_v3");
if(saved) {
    const s = JSON.parse(saved); bgDefault = s.bgDefault || "#111111";
    // Si c'est une sauvegarde en haute résolution, charger directement
    if (s.isHighRes) {
        W = s.W;
        H = s.H;
        pixels = s.pixels;
        pixelStyles = s.pixelStyles;
        pixelOffsets = s.pixelOffsets || new Array(W * H).fill(0);
        originalW = Math.floor(W / 3);
        originalH = Math.floor(H / 3);
        mX = (W - 1) / 2; mY = (H - 1) / 2;
        document.getElementById("mXSlider").max = W - 1;
        document.getElementById("mYSlider").max = H - 1;
        canvas.width = W * pixelSize;
        canvas.height = H * pixelSize;
    } else {
        // Ancienne sauvegarde en basse résolution
        paletteColors = s.paletteColors || paletteColors;
        init(s.W, s.H, s.pixels, s.pixelStyles, s.pixelOffsets);
    }
} else {
    // Charger le design Vyshyvka Studio par défaut
    console.log('🎨 Chargement du design Vyshyvka Studio par défaut...');
    fetch('vyshyvka_studio.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            bgDefault = data.bgDefault || "#111111";
            paletteColors = data.paletteColors || paletteColors;
            W = data.W;
            H = data.H;
            pixels = data.pixels;
            pixelStyles = data.pixelStyles;
            pixelOffsets = data.pixelOffsets || new Array(W * H).fill(0);
            originalW = Math.floor(W / 3);
            originalH = Math.floor(H / 3);
            mX = (W - 1) / 2; mY = (H - 1) / 2;
            document.getElementById("mXSlider").max = W - 1;
            document.getElementById("mYSlider").max = H - 1;
            canvas.width = W * pixelSize;
            canvas.height = H * pixelSize;
            
            // Debug : Vérifier que la palette est bien présente
            console.log('🎨 Initialisation de la palette...');
            const paletteElement = document.getElementById('palette');
            if (paletteElement) {
                console.log('✅ Élément #palette trouvé');
            } else {
                console.error('❌ Élément #palette NON TROUVÉ !');
            }
            
            rebuildPalette();
            console.log('🎨 Palette reconstruite, nombre de couleurs:', paletteColors.length);
            refresh();
            console.log('✅ Design Vyshyvka Studio chargé avec succès! 🇺🇦');
        })
        .catch(error => {
            console.warn('⚠️ Impossible de charger vyshyvka_studio.json, canvas vide par défaut');
            console.error(error);
            init(32, 32);
            rebuildPalette();
            refresh();
        });
}

// Si une sauvegarde existe, initialiser la palette normalement
if (saved) {
    rebuildPalette();
    refresh();
}

/** PANNEAU LATÉRAL DE SÉLECTION **/

/**
 * Ouvre le panneau latéral de sélection
 */
function openSelectionPanel() {
    selectionSidePanel.classList.add('open');
    updateSelectionPanel();
}

/**
 * Ferme le panneau latéral de sélection
 */
function closeSelectionPanel() {
    selectionSidePanel.classList.remove('open');
}

/**
 * Toggle (ouvrir/fermer) le panneau latéral - peut s'ouvrir sans sélection
 */
function toggleSelectionPanel() {
    if (selectionSidePanel.classList.contains('open')) {
        closeSelectionPanel();
    } else {
        // Ouvrir le panneau même sans sélection
        selectionSidePanel.classList.add('open');
        updateSelectionPanel();
    }
}

/**
 * Met à jour le panneau latéral avec les informations de la sélection
 */
function updateSelectionPanel() {
    // Ne plus fermer automatiquement le panneau s'il n'y a pas de sélection
    // Le panneau peut rester ouvert pour accéder à l'onglet Géométrie
    
    if (!sel && !floatingLayer) {
        // Pas de sélection : masquer les infos de sélection mais garder le panneau ouvert
        const validateBtn = document.getElementById('validateBtn');
        if (validateBtn) validateBtn.style.display = 'none';
        
        const selectionDimensions = document.getElementById('selectionDimensions');
        const selectionPosition = document.getElementById('selectionPosition');
        if (selectionDimensions) selectionDimensions.textContent = '-';
        if (selectionPosition) selectionPosition.textContent = '-';
        
        // Mettre à jour le bouton de sauvegarde de symbole
        updateSaveSymbolButton();
        return;
    }
    
    // Afficher le bouton de validation si floatingLayer est actif
    const validateBtn = document.getElementById('validateBtn');
    if (validateBtn) {
        if (floatingLayer) {
            validateBtn.style.display = 'flex';
        } else {
            validateBtn.style.display = 'none';
        }
    }
    
    // Calculer les dimensions et position
    let x, y, w, h;
    
    if (floatingLayer) {
        // Si on a un floatingLayer, utiliser ses coordonnées
        x = floatingLayer.x;
        y = floatingLayer.y;
        w = floatingLayer.w;
        h = floatingLayer.h;
    } else if (sel) {
        // Sinon utiliser la sélection
        if (!trameMode) {
            x = Math.min(sel.x1, sel.x2) * 3;
            y = Math.min(sel.y1, sel.y2) * 3;
            w = (Math.abs(sel.x1 - sel.x2) + 1) * 3;
            h = (Math.abs(sel.y1 - sel.y2) + 1) * 3;
        } else {
            x = Math.min(sel.x1, sel.x2);
            y = Math.min(sel.y1, sel.y2);
            w = Math.abs(sel.x1 - sel.x2) + 1;
            h = Math.abs(sel.y1 - sel.y2) + 1;
        }
    }
    
    // Mettre à jour les informations textuelles
    const selectionDimensions = document.getElementById('selectionDimensions');
    const selectionPosition = document.getElementById('selectionPosition');
    if (selectionDimensions) selectionDimensions.textContent = `${w} × ${h} px`;
    if (selectionPosition) selectionPosition.textContent = `(${x}, ${y})`;
    
    // Rendre la prévisualisation
    renderSelectionPreview(x, y, w, h);
    
    // Mettre à jour le bouton de sauvegarde de symbole
    updateSaveSymbolButton();
}

/**
 * Rend la prévisualisation de la sélection dans le panneau latéral
 */
function renderSelectionPreview(x, y, w, h) {
    // Définir la taille du canvas de prévisualisation avec marge pour les poignées
    const handleSize = 8;
    const margin = handleSize + 2;
    const maxSize = 250 - (margin * 2);
    const scale = Math.min(maxSize / w, maxSize / h, 10); // Max 10x zoom
    const previewW = Math.floor(w * scale);
    const previewH = Math.floor(h * scale);
    
    // Canvas plus grand pour inclure les poignées
    selectionPreviewCanvas.width = previewW + (margin * 2);
    selectionPreviewCanvas.height = previewH + (margin * 2);
    
    // Sauvegarder le contexte et translater pour dessiner avec marge
    selectionPreviewCtx.save();
    selectionPreviewCtx.translate(margin, margin);
    
    // Fond transparent avec damier
    selectionPreviewCtx.fillStyle = bgDefault;
    selectionPreviewCtx.fillRect(0, 0, previewW, previewH);
    
    // Extraire et dessiner les pixels de la sélection
    if (floatingLayer) {
        // Dessiner depuis le floatingLayer
        renderFloatingLayerPreview(scale);
    } else if (sel) {
        // Dessiner depuis la sélection active
        renderSelectionAreaPreview(x, y, w, h, scale);
    }
    
    // Dessiner la grille sur la prévisualisation
    drawPreviewGrid(w, h, scale);
    
    // Restaurer le contexte
    selectionPreviewCtx.restore();
    
    // Dessiner les poignées de redimensionnement (sans translation)
    drawResizeHandles(previewW, previewH, margin);
}

/**
 * Rend la prévisualisation du floatingLayer
 */
function renderFloatingLayerPreview(scale) {
    const data = floatingLayer.data;
    const styles = floatingLayer.styles || [];
    const w = floatingLayer.w;
    const h = floatingLayer.h;
    
    // En mode PIXEL (par défaut) : regrouper les pixels 3×3
    if ((trameMode && renderMode === "cross") || !trameMode) {
        let blocksW = Math.floor(w / 3);
        let blocksH = Math.floor(h / 3);
        
        for (let by = 0; by < blocksH; by++) {
            for (let bx = 0; bx < blocksW; bx++) {
                let blockColor = null;
                let blockStyle = null;
                
                // Trouver la couleur du bloc
                for (let dy = 0; dy < 3 && !blockColor; dy++) {
                    for (let dx = 0; dx < 3 && !blockColor; dx++) {
                        let i = bx * 3 + dx;
                        let j = by * 3 + dy;
                        let idx = j * w + i;
                        if (data[idx] !== bgDefault) {
                            blockColor = data[idx];
                            blockStyle = styles[idx] || 'cross';
                        }
                    }
                }
                
                if (blockColor) {
                    if (blockStyle === 'nyzynka') {
                        // Dessiner Nyzynka
                        for (let dy = 0; dy < 3; dy++) {
                            for (let dx = 0; dx < 3; dx++) {
                                let i = bx * 3 + dx;
                                let j = by * 3 + dy;
                                let idx = j * w + i;
                                if (data[idx] !== bgDefault && styles[idx] === 'nyzynka') {
                                    let px = i * scale;
                                    let py = j * scale;
                                    selectionPreviewCtx.fillStyle = data[idx];
                                    let lineWidth = Math.max(1, scale * 0.15);
                                    let centerX = px + (scale / 2) - (lineWidth / 2);
                                    let yOffset = (i % 2 === 1) ? scale : 0;
                                    selectionPreviewCtx.fillRect(centerX, py - scale * 0.5 + yOffset, lineWidth, scale * 2);
                                }
                            }
                        }
                    } else {
                        // Dessiner croix au centre du bloc
                        let centerX = (bx * 3 + 1.5) * scale;
                        let centerY = (by * 3 + 1.5) * scale;
                        let crossSize = scale * 2.5;
                        
                        selectionPreviewCtx.strokeStyle = blockColor;
                        selectionPreviewCtx.lineWidth = Math.max(1, scale * 0.15);
                        selectionPreviewCtx.beginPath();
                        let p = crossSize * 0.2;
                        selectionPreviewCtx.moveTo(centerX - crossSize/2 + p, centerY - crossSize/2 + p);
                        selectionPreviewCtx.lineTo(centerX + crossSize/2 - p, centerY + crossSize/2 - p);
                        selectionPreviewCtx.moveTo(centerX + crossSize/2 - p, centerY - crossSize/2 + p);
                        selectionPreviewCtx.lineTo(centerX - crossSize/2 + p, centerY + crossSize/2 - p);
                        selectionPreviewCtx.stroke();
                    }
                }
            }
        }
    } else {
        // Mode TRAME : dessiner chaque pixel
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
                let idx = j * w + i;
                if (data[idx] === bgDefault) continue;
                
                let px = i * scale;
                let py = j * scale;
                let style = styles[idx] || 'cross';
                
                selectionPreviewCtx.fillStyle = data[idx];
                
                if (style === 'nyzynka') {
                    let lineWidth = Math.max(1, scale * 0.15);
                    let centerX = px + (scale / 2) - (lineWidth / 2);
                    let yOffset = (i % 2 === 1) ? scale : 0;
                    selectionPreviewCtx.fillRect(centerX, py - scale * 0.5 + yOffset, lineWidth, scale * 2);
                } else if (renderMode === "cross") {
                    selectionPreviewCtx.strokeStyle = data[idx];
                    selectionPreviewCtx.lineWidth = Math.max(1, scale * 0.15);
                    selectionPreviewCtx.beginPath();
                    let p = scale * 0.2;
                    selectionPreviewCtx.moveTo(px+p, py+p);
                    selectionPreviewCtx.lineTo(px+scale-p, py+scale-p);
                    selectionPreviewCtx.moveTo(px+scale-p, py+p);
                    selectionPreviewCtx.lineTo(px+p, py+scale-p);
                    selectionPreviewCtx.stroke();
                } else {
                    selectionPreviewCtx.fillRect(px, py, scale, scale);
                }
            }
        }
    }
}

/**
 * Rend la prévisualisation de la zone de sélection
 */
function renderSelectionAreaPreview(x, y, w, h, scale) {
    // En mode PIXEL (par défaut) : regrouper les pixels 3×3
    if ((trameMode && renderMode === "cross") || !trameMode) {
        let blocksW = Math.floor(w / 3);
        let blocksH = Math.floor(h / 3);
        
        for (let by = 0; by < blocksH; by++) {
            for (let bx = 0; bx < blocksW; bx++) {
                let blockColor = null;
                let blockStyle = null;
                
                // Trouver la couleur du bloc
                for (let dy = 0; dy < 3 && !blockColor; dy++) {
                    for (let dx = 0; dx < 3 && !blockColor; dx++) {
                        let px = x + bx * 3 + dx;
                        let py = y + by * 3 + dy;
                        let idx = py * W + px;
                        if (pixels[idx] !== bgDefault) {
                            blockColor = pixels[idx];
                            blockStyle = pixelStyles[idx];
                        }
                    }
                }
                
                if (blockColor) {
                    if (blockStyle === 'nyzynka') {
                        // Dessiner Nyzynka
                        for (let dy = 0; dy < 3; dy++) {
                            for (let dx = 0; dx < 3; dx++) {
                                let px = x + bx * 3 + dx;
                                let py = y + by * 3 + dy;
                                let idx = py * W + px;
                                if (pixels[idx] !== bgDefault && pixelStyles[idx] === 'nyzynka') {
                                    let canvasX = (bx * 3 + dx) * scale;
                                    let canvasY = (by * 3 + dy) * scale;
                                    selectionPreviewCtx.fillStyle = pixels[idx];
                                    let lineWidth = Math.max(1, scale * 0.15);
                                    let centerX = canvasX + (scale / 2) - (lineWidth / 2);
                                    let localX = bx * 3 + dx;
                                    let yOffset = (localX % 2 === 1) ? scale : 0;
                                    selectionPreviewCtx.fillRect(centerX, canvasY - scale * 0.5 + yOffset, lineWidth, scale * 2);
                                }
                            }
                        }
                    } else {
                        // Dessiner croix au centre du bloc
                        let centerX = (bx * 3 + 1.5) * scale;
                        let centerY = (by * 3 + 1.5) * scale;
                        let crossSize = scale * 2.5;
                        
                        selectionPreviewCtx.strokeStyle = blockColor;
                        selectionPreviewCtx.lineWidth = Math.max(1, scale * 0.15);
                        selectionPreviewCtx.beginPath();
                        let p = crossSize * 0.2;
                        selectionPreviewCtx.moveTo(centerX - crossSize/2 + p, centerY - crossSize/2 + p);
                        selectionPreviewCtx.lineTo(centerX + crossSize/2 - p, centerY + crossSize/2 - p);
                        selectionPreviewCtx.moveTo(centerX + crossSize/2 - p, centerY - crossSize/2 + p);
                        selectionPreviewCtx.lineTo(centerX - crossSize/2 + p, centerY + crossSize/2 - p);
                        selectionPreviewCtx.stroke();
                    }
                }
            }
        }
    } else {
        // Mode TRAME : dessiner chaque pixel
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
                let px = x + i;
                let py = y + j;
                let idx = py * W + px;
                if (pixels[idx] === bgDefault) continue;
                
                let canvasX = i * scale;
                let canvasY = j * scale;
                let style = pixelStyles[idx];
                
                selectionPreviewCtx.fillStyle = pixels[idx];
                
                if (style === 'nyzynka') {
                    let lineWidth = Math.max(1, scale * 0.15);
                    let centerX = canvasX + (scale / 2) - (lineWidth / 2);
                    let yOffset = (i % 2 === 1) ? scale : 0;
                    selectionPreviewCtx.fillRect(centerX, canvasY - scale * 0.5 + yOffset, lineWidth, scale * 2);
                } else if (renderMode === "cross") {
                    selectionPreviewCtx.strokeStyle = pixels[idx];
                    selectionPreviewCtx.lineWidth = Math.max(1, scale * 0.15);
                    selectionPreviewCtx.beginPath();
                    let p = scale * 0.2;
                    selectionPreviewCtx.moveTo(canvasX+p, canvasY+p);
                    selectionPreviewCtx.lineTo(canvasX+scale-p, canvasY+scale-p);
                    selectionPreviewCtx.moveTo(canvasX+scale-p, canvasY+p);
                    selectionPreviewCtx.lineTo(canvasX+p, canvasY+scale-p);
                    selectionPreviewCtx.stroke();
                } else {
                    selectionPreviewCtx.fillRect(canvasX, canvasY, scale, scale);
                }
            }
        }
    }
}

/**
 * Dessine la grille sur le canvas de prévisualisation
 */
function drawPreviewGrid(w, h, scale) {
    selectionPreviewCtx.strokeStyle = "rgba(120,120,120,0.3)";
    selectionPreviewCtx.lineWidth = 0.5;
    
    if (trameMode) {
        // Mode TRAME : grille normale (chaque pixel)
        for (let i = 0; i <= w; i++) {
            selectionPreviewCtx.beginPath();
            selectionPreviewCtx.moveTo(i * scale, 0);
            selectionPreviewCtx.lineTo(i * scale, h * scale);
            selectionPreviewCtx.stroke();
        }
        for (let j = 0; j <= h; j++) {
            selectionPreviewCtx.beginPath();
            selectionPreviewCtx.moveTo(0, j * scale);
            selectionPreviewCtx.lineTo(w * scale, j * scale);
            selectionPreviewCtx.stroke();
        }
    } else {
        // Mode PIXEL : grille par blocs 3×3
        let blocksW = Math.floor(w / 3);
        let blocksH = Math.floor(h / 3);
        
        for (let i = 0; i <= blocksW; i++) {
            selectionPreviewCtx.beginPath();
            selectionPreviewCtx.moveTo(i * 3 * scale, 0);
            selectionPreviewCtx.lineTo(i * 3 * scale, h * scale);
            selectionPreviewCtx.stroke();
        }
        for (let j = 0; j <= blocksH; j++) {
            selectionPreviewCtx.beginPath();
            selectionPreviewCtx.moveTo(0, j * 3 * scale);
            selectionPreviewCtx.lineTo(w * scale, j * 3 * scale);
            selectionPreviewCtx.stroke();
        }
    }
}

/**
 * Dessine les poignées de redimensionnement sur le canvas de prévisualisation
 */
function drawResizeHandles(contentW, contentH, margin) {
    const handleSize = 8;
    const handleColor = "#007bff";
    const handleBorder = "#ffffff";
    
    // Positions des poignées : sur les bords de l'image (avec la marge)
    const handles = [
        { x: margin, y: margin, cursor: 'nw-resize' },                              // Coin haut-gauche
        { x: margin + contentW / 2, y: margin, cursor: 'n-resize' },                // Milieu haut
        { x: margin + contentW, y: margin, cursor: 'ne-resize' },                   // Coin haut-droit
        { x: margin + contentW, y: margin + contentH / 2, cursor: 'e-resize' },     // Milieu droit
        { x: margin + contentW, y: margin + contentH, cursor: 'se-resize' },        // Coin bas-droit
        { x: margin + contentW / 2, y: margin + contentH, cursor: 's-resize' },     // Milieu bas
        { x: margin, y: margin + contentH, cursor: 'sw-resize' },                   // Coin bas-gauche
        { x: margin, y: margin + contentH / 2, cursor: 'w-resize' }                 // Milieu gauche
    ];
    
    // Dessiner un rectangle de sélection autour de l'image
    selectionPreviewCtx.strokeStyle = handleColor;
    selectionPreviewCtx.lineWidth = 2;
    selectionPreviewCtx.strokeRect(margin, margin, contentW, contentH);
    
    // Dessiner les poignées
    handles.forEach(handle => {
        // Bordure blanche
        selectionPreviewCtx.fillStyle = handleBorder;
        selectionPreviewCtx.fillRect(
            handle.x - handleSize / 2 - 1,
            handle.y - handleSize / 2 - 1,
            handleSize + 2,
            handleSize + 2
        );
        
        // Poignée bleue
        selectionPreviewCtx.fillStyle = handleColor;
        selectionPreviewCtx.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
        );
    });
}

/**
 * Supprime la sélection active
 */
function deleteSelection() {
    if (!sel && !floatingLayer) return;
    
    saveState();
    
    if (floatingLayer) {
        // Si on a un floatingLayer, on l'annule simplement
        floatingLayer = null;
    } else if (sel) {
        // Sinon on efface la zone sélectionnée
        let xMin, yMin, w, h;
        
        if (!trameMode) {
            xMin = Math.min(sel.x1, sel.x2) * 3;
            yMin = Math.min(sel.y1, sel.y2) * 3;
            w = (Math.abs(sel.x1 - sel.x2) + 1) * 3;
            h = (Math.abs(sel.y1 - sel.y2) + 1) * 3;
        } else {
            xMin = Math.min(sel.x1, sel.x2);
            yMin = Math.min(sel.y1, sel.y2);
            w = Math.abs(sel.x1 - sel.x2) + 1;
            h = Math.abs(sel.y1 - sel.y2) + 1;
        }
        
        // Effacer tous les pixels de la sélection
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
                let idx = (yMin + j) * W + (xMin + i);
                pixels[idx] = bgDefault;
                pixelStyles[idx] = 'cross';
                pixelOffsets[idx] = 0;
            }
        }
        
        sel = null;
    }
    
    closeSelectionPanel();
    refresh();
    saveLocal();
}

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


// ============================================
// SYSTÈME D'ONGLETS DU PANNEAU LATÉRAL
// ============================================

// Stockage des symboles sauvegardés
let savedSymbols = [];

/**
 * Change l'onglet actif dans le panneau latéral
 */
function switchTab(tabName) {
    // Désactiver tous les onglets et contenus
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activer l'onglet sélectionné
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`tab-${tabName}`);
    
    if (activeBtn) activeBtn.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
    
    // Mettre à jour le titre du panneau
    const title = document.getElementById('sidePanelTitle');
    if (tabName === 'selection') {
        title.textContent = '✂️ Sélection';
    } else if (tabName === 'geometry') {
        title.textContent = '📐 Géométrie';
        updateSymbolsList();
    }
    
    // Mettre à jour le bouton de sauvegarde si on est sur l'onglet géométrie
    if (tabName === 'geometry') {
        updateSaveSymbolButton();
    }
}

/**
 * Met à jour l'état du bouton de sauvegarde de symbole
 */
function updateSaveSymbolButton() {
    const saveBtn = document.getElementById('saveSymbolBtn');
    if (saveBtn) {
        // Activer le bouton seulement si on a une sélection ou un floatingLayer
        if (sel || floatingLayer) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
        } else {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
        }
    }
}

/**
 * Sauvegarde la sélection actuelle comme symbole
 */
function saveSelectionAsSymbol() {
    if (!sel && !floatingLayer) {
        alert('Aucune sélection active à sauvegarder');
        return;
    }
    
    // Demander un nom pour le symbole
    const symbolName = prompt('Nom du symbole:', `Symbole ${savedSymbols.length + 1}`);
    if (!symbolName) return;
    
    // Calculer les dimensions et position
    let x, y, w, h;
    
    if (floatingLayer) {
        x = floatingLayer.x;
        y = floatingLayer.y;
        w = floatingLayer.w;
        h = floatingLayer.h;
    } else if (sel) {
        if (!trameMode) {
            x = Math.min(sel.x1, sel.x2) * 3;
            y = Math.min(sel.y1, sel.y2) * 3;
            w = (Math.abs(sel.x1 - sel.x2) + 1) * 3;
            h = (Math.abs(sel.y1 - sel.y2) + 1) * 3;
        } else {
            x = Math.min(sel.x1, sel.x2);
            y = Math.min(sel.y1, sel.y2);
            w = Math.abs(sel.x1 - sel.x2) + 1;
            h = Math.abs(sel.y1 - sel.y2) + 1;
        }
    }
    
    // Copier les données de la sélection
    const symbolData = {
        name: symbolName,
        width: w,
        height: h,
        pixels: [],
        offsets: [],
        styles: [],
        timestamp: Date.now()
    };
    
    // Récupérer la couleur de fond définie pour les symboles
    const symbolBgColorInput = document.getElementById('symbolBgColor');
    const symbolBgColor = symbolBgColorInput ? symbolBgColorInput.value : bgDefault;
    
    // Copier les pixels de la zone sélectionnée (uniquement les pixels non-vides)
    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const srcX = x + px;
            const srcY = y + py;
            const srcIdx = srcY * W + srcX;
            
            // Ne sauvegarder que les pixels qui ont une couleur différente de la couleur de fond choisie
            if (pixels[srcIdx] && pixels[srcIdx] !== symbolBgColor) {
                symbolData.pixels.push({
                    x: px,
                    y: py,
                    color: pixels[srcIdx]
                });
                
                if (pixelOffsets[srcIdx]) {
                    symbolData.offsets.push({
                        x: px,
                        y: py,
                        offset: pixelOffsets[srcIdx]
                    });
                }
                
                if (pixelStyles[srcIdx]) {
                    symbolData.styles.push({
                        x: px,
                        y: py,
                        style: pixelStyles[srcIdx]
                    });
                }
            }
        }
    }
    
    // Ajouter le symbole à la liste
    savedSymbols.push(symbolData);
    
    // Sauvegarder dans localStorage
    saveSymbolsToStorage();
    
    // Mettre à jour l'affichage
    updateSymbolsList();
    
    // Notification
    console.log(`Symbole "${symbolName}" sauvegardé avec succès!`);
}

/**
 * Met à jour l'affichage de la liste des symboles
 */
function updateSymbolsList() {
    const symbolsList = document.getElementById('symbolsList');
    const symbolCount = document.getElementById('symbolCount');
    
    if (!symbolsList) return;
    
    // Mettre à jour le compteur
    if (symbolCount) {
        symbolCount.textContent = savedSymbols.length;
    }
    
    if (savedSymbols.length === 0) {
        symbolsList.innerHTML = '<p class="empty-state">Aucun symbole dans votre kit</p>';
        return;
    }
    
    symbolsList.innerHTML = '';
    
    savedSymbols.forEach((symbol, index) => {
        const symbolItem = document.createElement('div');
        symbolItem.className = 'symbol-item';
        
        // Rendre l'élément draggable
        symbolItem.draggable = true;
        symbolItem.dataset.symbolIndex = index;
        
        // Miniature du symbole (format compact)
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'symbol-thumbnail';
        
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = symbol.width;
        thumbnailCanvas.height = symbol.height;
        const ctx = thumbnailCanvas.getContext('2d');
        
        // Dessiner le symbole
        symbol.pixels.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 1, 1);
        });
        
        thumbnailDiv.appendChild(thumbnailCanvas);
        
        // Informations (format ligne)
        const infoDiv = document.createElement('div');
        infoDiv.className = 'symbol-info';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'symbol-name';
        nameDiv.textContent = symbol.name;
        
        const dimensionsDiv = document.createElement('div');
        dimensionsDiv.className = 'symbol-dimensions';
        dimensionsDiv.textContent = `${symbol.width} × ${symbol.height} px`;
        
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(dimensionsDiv);
        
        // Actions (boutons compacts)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'symbol-actions';
        
        const useBtn = document.createElement('button');
        useBtn.className = 'symbol-btn use';
        useBtn.innerHTML = '📋';
        useBtn.title = 'Utiliser ce symbole';
        useBtn.onclick = (e) => {
            e.stopPropagation();
            useSymbol(index);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'symbol-btn delete';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Supprimer ce symbole';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteSymbol(index);
        };
        
        actionsDiv.appendChild(useBtn);
        actionsDiv.appendChild(deleteBtn);
        
        // Événements de drag & drop
        symbolItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', index);
            
            // Créer une image fantôme à la même échelle que le canvas
            const dragCanvas = document.createElement('canvas');
            // Calculer la taille réelle du canvas à l'écran
            const canvasRect = canvas.getBoundingClientRect();
            const actualPixelSize = canvasRect.width / W; // Taille réelle d'un pixel à l'écran
            
            dragCanvas.width = symbol.width * actualPixelSize;
            dragCanvas.height = symbol.height * actualPixelSize;
            const dragCtx = dragCanvas.getContext('2d');
            
            // Dessiner le symbole à l'échelle réelle du canvas
            symbol.pixels.forEach(p => {
                dragCtx.fillStyle = p.color;
                dragCtx.fillRect(p.x * actualPixelSize, p.y * actualPixelSize, actualPixelSize, actualPixelSize);
            });
            
            // Utiliser ce canvas comme image de drag (centré sur le curseur)
            e.dataTransfer.setDragImage(dragCanvas, dragCanvas.width / 2, dragCanvas.height / 2);
            
            symbolItem.style.opacity = '0.5';
        });
        
        symbolItem.addEventListener('dragend', (e) => {
            symbolItem.style.opacity = '1';
        });
        
        // Clic sur la ligne entière pour utiliser le symbole
        symbolItem.onclick = () => useSymbol(index);
        
        symbolItem.appendChild(thumbnailDiv);
        symbolItem.appendChild(infoDiv);
        symbolItem.appendChild(actionsDiv);
        
        symbolsList.appendChild(symbolItem);
    });
}

/**
 * Utilise un symbole sauvegardé (le colle dans le canvas)
 */
function useSymbol(index) {
    const symbol = savedSymbols[index];
    if (!symbol) return;
    
    // Créer un floatingLayer avec les données du symbole
    floatingLayer = {
        x: Math.floor(W / 2) - Math.floor(symbol.width / 2),
        y: Math.floor(H / 2) - Math.floor(symbol.height / 2),
        w: symbol.width,
        h: symbol.height,
        data: symbol.pixels.map(p => p.color),
        offsets: {},
        styles: {}
    };
    
    // Reconstruire les offsets et styles
    symbol.offsets.forEach(o => {
        const idx = o.y * symbol.width + o.x;
        floatingLayer.offsets[idx] = o.offset;
    });
    
    symbol.styles.forEach(s => {
        const idx = s.y * symbol.width + s.x;
        floatingLayer.styles[idx] = s.style;
    });
    
    // Passer en mode sélection
    setTool('select');
    
    // Fermer le panneau ou basculer sur l'onglet sélection
    switchTab('selection');
    
    // Mettre à jour l'affichage
    refresh();
    updateSelectionPanel();
    
    console.log(`Symbole "${symbol.name}" chargé et prêt à être placé`);
}

/**
 * Supprime un symbole de la bibliothèque
 */
function deleteSymbol(index) {
    const symbol = savedSymbols[index];
    if (!symbol) return;
    
    if (confirm(`Supprimer le symbole "${symbol.name}" ?`)) {
        savedSymbols.splice(index, 1);
        saveSymbolsToStorage();
        updateSymbolsList();
    }
}

/**
 * Sauvegarde les symboles dans localStorage
 */
function saveSymbolsToStorage() {
    try {

/**
 * Définit la couleur de fond des symboles à partir de la couleur de fond du canvas
 */
function setSymbolBgFromCanvas() {
    const symbolBgColorInput = document.getElementById('symbolBgColor');
    if (symbolBgColorInput) {
        symbolBgColorInput.value = bgDefault;
    }
}
        localStorage.setItem('pixolator_symbols', JSON.stringify(savedSymbols));
    } catch (e) {
        console.error('Erreur lors de la sauvegarde des symboles:', e);
    }
}

/**
 * Charge les symboles depuis localStorage
 */
function loadSymbolsFromStorage() {
    try {
        const stored = localStorage.getItem('pixolator_symbols');
        if (stored) {
            savedSymbols = JSON.parse(stored);
            console.log(`${savedSymbols.length} symbole(s) chargé(s)`);
        }
    } catch (e) {
        console.error('Erreur lors du chargement des symboles:', e);
        savedSymbols = [];
    }
}

// Charger les symboles au démarrage

/**
 * Affiche une prévisualisation du symbole sur le canvas pendant le drag
 */
function showSymbolPreview(symbolIndex, targetX, targetY) {
    const symbol = savedSymbols[symbolIndex];
    if (!symbol) return;
    
    // Redessiner le canvas normalement
    refresh();
    
    // Calculer la position de départ (centré sur le curseur)
    const startX = targetX - Math.floor(symbol.width / 2);
    const startY = targetY - Math.floor(symbol.height / 2);
    
    // Dessiner des bordures sur les pixels qui seront affectés
    ctx.strokeStyle = '#00ff00'; // Vert fluo pour la prévisualisation
    ctx.lineWidth = 2;
    
    symbol.pixels.forEach(p => {
        const destX = startX + p.x;
        const destY = startY + p.y;
        
        // Vérifier que la position est dans les limites du canvas
        if (destX >= 0 && destX < W && destY >= 0 && destY < H) {
            // Dessiner un rectangle de prévisualisation
            ctx.strokeRect(
                destX * pixelSize + 1,
                destY * pixelSize + 1,
                pixelSize - 2,
                pixelSize - 2
            );
        }
    });
}
loadSymbolsFromStorage();


// ============================================
// DRAG & DROP DE SYMBOLES SUR LE CANVAS
// ============================================

/**
 * Initialise les événements de drag & drop sur le canvas
 */
function initSymbolDragDrop() {
    const canvasWrapper = document.getElementById('canvasWrapper');
    
    if (!canvasWrapper) return;
    
    let currentDragSymbolIndex = null;
    
    // Empêcher le comportement par défaut et afficher la prévisualisation
    canvasWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        canvasWrapper.style.outline = '2px dashed var(--accent)';
        
        // Récupérer l'index du symbole en cours de drag
        const symbolIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (!isNaN(symbolIndex)) {
            currentDragSymbolIndex = symbolIndex;
            
            // Calculer la position du curseur sur le canvas
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const pixelX = Math.floor(x / pixelSize);
            const pixelY = Math.floor(y / pixelSize);
            
            // Redessiner avec la prévisualisation
            showSymbolPreview(symbolIndex, pixelX, pixelY);
        }
    });
    
    canvasWrapper.addEventListener('dragleave', (e) => {
        canvasWrapper.style.outline = '';
        currentDragSymbolIndex = null;
        refresh(); // Effacer la prévisualisation
    });
    
    // Gérer le drop
    canvasWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        canvasWrapper.style.outline = '';
        currentDragSymbolIndex = null;
        
        const symbolIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (isNaN(symbolIndex)) return;
        
        const symbol = savedSymbols[symbolIndex];
        if (!symbol) return;
        
        // Calculer la position du drop sur le canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convertir en coordonnées de pixels
        const pixelX = Math.floor(x / pixelSize);
        const pixelY = Math.floor(y / pixelSize);
        
        // Placer le symbole à cette position
        placeSymbolAt(symbolIndex, pixelX, pixelY);
    });
}

/**
 * Place un symbole à une position spécifique sur le canvas
 */
function placeSymbolAt(symbolIndex, targetX, targetY) {
    const symbol = savedSymbols[symbolIndex];
    if (!symbol) return;
    
    // Sauvegarder l'état pour undo
    saveState();
    
    // Centrer le symbole sur la position du curseur
    const startX = targetX - Math.floor(symbol.width / 2);
    const startY = targetY - Math.floor(symbol.height / 2);
    
    // Copier les pixels du symbole sur le canvas
    symbol.pixels.forEach(p => {
        const destX = startX + p.x;
        const destY = startY + p.y;
        
        // Vérifier que la position est dans les limites du canvas
        if (destX >= 0 && destX < W && destY >= 0 && destY < H) {
            const destIdx = destY * W + destX;
            pixels[destIdx] = p.color;
        }
    });
    
    // Copier les offsets
    symbol.offsets.forEach(o => {
        const destX = startX + o.x;
        const destY = startY + o.y;
        
        if (destX >= 0 && destX < W && destY >= 0 && destY < H) {
            const destIdx = destY * W + destX;
            pixelOffsets[destIdx] = o.offset;
        }
    });
    
    // Copier les styles
    symbol.styles.forEach(s => {
        const destX = startX + s.x;
        const destY = startY + s.y;
        
        if (destX >= 0 && destX < W && destY >= 0 && destY < H) {
            const destIdx = destY * W + destX;
            pixelStyles[destIdx] = s.style;
        }
    });
    
    // Rafraîchir l'affichage
    refresh();
    updateStats();
    
    console.log(`Symbole "${symbol.name}" placé à (${startX}, ${startY})`);
}

// Initialiser le drag & drop au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSymbolDragDrop);
} else {
    initSymbolDragDrop();
}


// ============================================
// GESTION DU SCROLL VERTICAL DU MENU #TOOLS
// ============================================

// Empêcher la propagation du scroll au canvas quand on scroll dans #tools
const toolsPanel = document.getElementById('tools');

if (toolsPanel) {
    // Gestion du scroll avec la molette (desktop)
    toolsPanel.addEventListener('wheel', (e) => {
        // Vérifier si le contenu peut scroller
        const canScrollDown = toolsPanel.scrollTop < (toolsPanel.scrollHeight - toolsPanel.clientHeight);
        const canScrollUp = toolsPanel.scrollTop > 0;
        
        // Si on scroll vers le bas et qu'on peut scroller, ou vers le haut et qu'on peut scroller
        if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
            // Empêcher la propagation au canvas
            e.stopPropagation();
        }
    }, { passive: false });

    // Gestion du swipe vertical (mobile/tactile)
    let touchStartY = 0;
    let touchStartScrollTop = 0;
    let isTouchingTools = false;

    toolsPanel.addEventListener('touchstart', (e) => {
        isTouchingTools = true;
        touchStartY = e.touches[0].clientY;
        touchStartScrollTop = toolsPanel.scrollTop;
    }, { passive: true });

    toolsPanel.addEventListener('touchmove', (e) => {
        if (!isTouchingTools) return;

        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;
        const newScrollTop = touchStartScrollTop + deltaY;

        // Vérifier si on peut scroller dans la direction demandée
        const canScrollDown = toolsPanel.scrollTop < (toolsPanel.scrollHeight - toolsPanel.clientHeight);
        const canScrollUp = toolsPanel.scrollTop > 0;

        // Si on essaie de scroller et qu'on peut le faire, empêcher le scroll du canvas
        if ((deltaY > 0 && canScrollDown) || (deltaY < 0 && canScrollUp)) {
            e.preventDefault();
            e.stopPropagation();
            toolsPanel.scrollTop = newScrollTop;
        }
    }, { passive: false });

    toolsPanel.addEventListener('touchend', () => {
        isTouchingTools = false;
    }, { passive: true });

    toolsPanel.addEventListener('touchcancel', () => {
        isTouchingTools = false;
    }, { passive: true });

    console.log('✅ Gestion du scroll vertical du menu #tools activée');
}


// ========== PALETTE RESIZER ==========
(function() {
    function initPaletteResizer() {
        const palette = document.getElementById('palette');
        const resizer = document.getElementById('paletteResizer');
        
        if (!palette || !resizer) {
            console.log('Palette or resizer not found, retrying...');
            setTimeout(initPaletteResizer, 100);
            return;
        }
        
        let isResizing = false;
        let startY = 0;
        let startHeight = 90;
        const minHeight = 60;
        const maxHeight = 200;

        resizer.addEventListener('mousedown', function(e) {
            isResizing = true;
            startY = e.clientY;
            startHeight = palette.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            
            const deltaY = startY - e.clientY; // Inversé car on tire vers le haut
            let newHeight = startHeight + deltaY;
            
            // Limiter la hauteur
            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
            
            // Utiliser setProperty avec important pour surcharger le CSS
            palette.style.setProperty('height', newHeight + 'px', 'important');
            palette.style.setProperty('min-height', newHeight + 'px', 'important');
            
            e.preventDefault();
        });

        document.addEventListener('mouseup', function() {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
            }
        });

        // Support tactile pour mobile
        resizer.addEventListener('touchstart', function(e) {
            isResizing = true;
            startY = e.touches[0].clientY;
            startHeight = palette.offsetHeight;
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('touchmove', function(e) {
            if (!isResizing) return;
            
            const deltaY = startY - e.touches[0].clientY;
            let newHeight = startHeight + deltaY;
            
            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
            
            palette.style.setProperty('height', newHeight + 'px', 'important');
            palette.style.setProperty('min-height', newHeight + 'px', 'important');
            
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', function() {
            if (isResizing) {
                isResizing = false;
            }
        });
        
        console.log('Palette resizer initialized');
    }
    
    // Initialiser quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPaletteResizer);
    } else {
        initPaletteResizer();
    }
})();
