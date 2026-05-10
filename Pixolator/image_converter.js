/**
 * Convertisseur d'Images vers JSON Pixolator
 * Supporte la broderie ukrainienne (Nyzynka) et le Point de Croix
 */

// Variables globales
let sourceImage = null;
let sourceImageData = null;
let detectedColors = [];
let pixolatorData = null;

// Éléments DOM
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const sourceCanvas = document.getElementById('source-canvas');
const resultCanvas = document.getElementById('result-canvas');
const detectColorsBtn = document.getElementById('detect-colors-btn');
const convertBtn = document.getElementById('convert-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

// Sections
const sourcePreviewSection = document.getElementById('source-preview-section');
const settingsSection = document.getElementById('settings-section');
const colorPaletteSection = document.getElementById('color-palette-section');
const resultPreviewSection = document.getElementById('result-preview-section');
const actionsSection = document.getElementById('actions-section');

// Paramètres
const outputWidthInput = document.getElementById('output-width');
const outputHeightInput = document.getElementById('output-height');
const colorToleranceInput = document.getElementById('color-tolerance');
const alphaThresholdInput = document.getElementById('alpha-threshold');
const toleranceValue = document.getElementById('tolerance-value');
const alphaValue = document.getElementById('alpha-value');

// Initialisation
document.addEventListener('DOMContentLoaded', init);

function toggleSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function init() {
    // Événements de drag & drop
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Événements de sélection de fichier
    fileInput.addEventListener('change', handleFileSelect);
    selectFileBtn.addEventListener('click', () => fileInput.click());
    
    // Événements des boutons
    detectColorsBtn.addEventListener('click', detectAndDisplayColors);
    convertBtn.addEventListener('click', convertAndPreview);
    downloadBtn.addEventListener('click', downloadJSON);
    resetBtn.addEventListener('click', resetAll);
    
    // Événements des sliders
    colorToleranceInput.addEventListener('input', (e) => {
        toleranceValue.textContent = e.target.value;
    });
    
    alphaThresholdInput.addEventListener('input', (e) => {
        alphaValue.textContent = e.target.value;
    });
}

/**
 * Gestion du drag & drop
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        loadImage(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        loadImage(files[0]);
    }
}

/**
 * Charge une image depuis un fichier
 * @param {File} file - Fichier image à charger
 */
function loadImage(file) {
    // Vérification du type de fichier
    if (!file.type.startsWith('image/')) {
        alert(t('converter.error.invalidFile'));
        return;
    }
    
    // Vérification de la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert(t('converter.error.fileTooBig'));
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
            sourceImage = img;
            displaySourceImage();
            showSettings();
        };
        
        img.onerror = () => {
            alert(t('converter.error.loadFailed'));
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        alert(t('converter.error.readFailed'));
    };
    
    reader.readAsDataURL(file);
}

/**
 * Affiche l'image source dans le canvas
 */
function displaySourceImage() {
    const ctx = sourceCanvas.getContext('2d');
    
    // Redimensionner le canvas pour l'affichage (max 400px)
    const maxSize = 400;
    let displayWidth = sourceImage.width;
    let displayHeight = sourceImage.height;
    
    if (displayWidth > maxSize || displayHeight > maxSize) {
        const ratio = Math.min(maxSize / displayWidth, maxSize / displayHeight);
        displayWidth = Math.floor(displayWidth * ratio);
        displayHeight = Math.floor(displayHeight * ratio);
    }
    
    sourceCanvas.width = displayWidth;
    sourceCanvas.height = displayHeight;
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceImage, 0, 0, displayWidth, displayHeight);
    
    // Stocker les données de l'image originale
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceImage.width;
    tempCanvas.height = sourceImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(sourceImage, 0, 0);
    sourceImageData = tempCtx.getImageData(0, 0, sourceImage.width, sourceImage.height);
    
    // Afficher les informations
    document.getElementById('source-dimensions').textContent = 
        `${sourceImage.width} × ${sourceImage.height} px`;
    document.getElementById('source-size').textContent = 
        formatFileSize(sourceImageData.data.length);
    
    sourcePreviewSection.style.display = 'block';
}

/**
 * Affiche la section des paramètres
 */
function showSettings() {
    settingsSection.style.display = 'block';
    actionsSection.style.display = 'flex';
}

/**
 * Détecte les couleurs dans l'image
 * @param {ImageData} imageData - Données de l'image
 * @param {number} tolerance - Tolérance de regroupement des couleurs (0-100)
 * @returns {Array} Tableau de couleurs avec leur fréquence
 */
function detectColors(imageData, tolerance) {
    const colors = new Map();
    const data = imageData.data;
    const alphaThreshold = parseInt(alphaThresholdInput.value);
    
    // Parcourir tous les pixels
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Ignorer les pixels transparents
        if (a < alphaThreshold) continue;
        
        // Trouver une couleur similaire existante
        let foundSimilar = false;
        
        for (const [colorKey, colorData] of colors) {
            const [cr, cg, cb] = colorKey.split(',').map(Number);
            
            // Calculer la distance de couleur
            const distance = Math.sqrt(
                Math.pow(r - cr, 2) +
                Math.pow(g - cg, 2) +
                Math.pow(b - cb, 2)
            );
            
            // Si la couleur est similaire (selon la tolérance)
            if (distance <= tolerance * 4.41) { // 4.41 = sqrt(255^2 * 3) / 100
                colorData.count++;
                foundSimilar = true;
                break;
            }
        }
        
        // Si aucune couleur similaire n'a été trouvée, ajouter cette couleur
        if (!foundSimilar) {
            const colorKey = `${r},${g},${b}`;
            colors.set(colorKey, {
                r, g, b,
                hex: rgbToHex(r, g, b),
                count: 1
            });
        }
    }
    
    // Convertir en tableau et trier par fréquence
    return Array.from(colors.values())
        .sort((a, b) => b.count - a.count);
}

/**
 * Détecte et affiche les couleurs
 */
function detectAndDisplayColors() {
    if (!sourceImageData) {
        alert(t('converter.error.noImage'));
        return;
    }
    
    const tolerance = parseInt(colorToleranceInput.value);
    detectedColors = detectColors(sourceImageData, tolerance);
    
    if (detectedColors.length === 0) {
        alert(t('converter.error.noColors'));
        return;
    }
    
    displayColorPalette();
}

/**
 * Affiche la palette de couleurs détectées
 */
function displayColorPalette() {
    const palette = document.getElementById('color-palette');
    palette.innerHTML = '';
    
    detectedColors.forEach((color, index) => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-item';
        colorItem.dataset.index = index;
        
        colorItem.innerHTML = `
            <div class="color-preview" style="background-color: ${color.hex};"></div>
            <div class="color-details">
                <div class="color-hex">${color.hex}</div>
                <div class="color-count">${color.count} ${t('converter.pixels')} (${((color.count / (sourceImageData.width * sourceImageData.height)) * 100).toFixed(2)}%)</div>
                <div class="color-controls">
                    <label>
                        <input type="checkbox" class="color-enabled" checked>
                        <span data-i18n="converter.include">${t('converter.include')}</span>
                    </label>
                    <select class="color-style">
                        <option value="nyzynka" data-i18n="converter.styleNyzynka">${t('converter.styleNyzynka')}</option>
                        <option value="cross" data-i18n="converter.styleCross">${t('converter.styleCross')}</option>
                    </select>
                </div>
            </div>
        `;
        
        // Événement pour activer/désactiver la couleur
        const checkbox = colorItem.querySelector('.color-enabled');
        const select = colorItem.querySelector('.color-style');
        
        checkbox.addEventListener('change', (e) => {
            select.disabled = !e.target.checked;
            colorItem.classList.toggle('disabled', !e.target.checked);
        });
        
        palette.appendChild(colorItem);
    });
    
    colorPaletteSection.style.display = 'block';
}

/**
 * Convertit l'image en format Pixolator
 * @param {ImageData} imageData - Données de l'image source
 * @param {Map} colorStyleMap - Map des couleurs vers leurs styles
 * @param {number} width - Largeur de sortie
 * @param {number} height - Hauteur de sortie
 * @returns {Object} Données Pixolator
 */
function convertToPixolator(imageData, colorStyleMap, width, height) {
    // Créer un canvas temporaire pour redimensionner
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Redimensionner l'image
    tempCtx.imageSmoothingEnabled = false;
    const img = new Image();
    img.src = sourceCanvas.toDataURL();
    
    // Créer un canvas avec l'image originale
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = sourceImage.width;
    srcCanvas.height = sourceImage.height;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(sourceImage, 0, 0);
    
    // Redimensionner
    tempCtx.drawImage(srcCanvas, 0, 0, width, height);
    const resizedData = tempCtx.getImageData(0, 0, width, height);
    
    // Initialiser les tableaux Pixolator
    const pixels = [];
    const pixelStyles = [];
    const pixelOffsets = [];
    const alphaThreshold = parseInt(alphaThresholdInput.value);
    
    // Parcourir chaque pixel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = resizedData.data[i];
            const g = resizedData.data[i + 1];
            const b = resizedData.data[i + 2];
            const a = resizedData.data[i + 3];
            
            // Ignorer les pixels transparents
            if (a < alphaThreshold) {
                pixels.push(null);
                pixelStyles.push(null);
                pixelOffsets.push(0);
                continue;
            }
            
            // Trouver la couleur correspondante dans la palette
            let matchedColor = null;
            let minDistance = Infinity;
            
            for (const [colorHex, styleData] of colorStyleMap) {
                if (!styleData.enabled) continue;
                
                const [cr, cg, cb] = hexToRgb(colorHex);
                const distance = Math.sqrt(
                    Math.pow(r - cr, 2) +
                    Math.pow(g - cg, 2) +
                    Math.pow(b - cb, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    matchedColor = { hex: colorHex, ...styleData };
                }
            }
            
            if (matchedColor) {
                pixels.push(matchedColor.hex);
                pixelStyles.push(matchedColor.style);
                
                // Calculer l'offset selon le style
                if (matchedColor.style === 'nyzynka') {
                    pixelOffsets.push((x % 2 === 1) ? 1 : 0);
                } else {
                    pixelOffsets.push(0);
                }
            } else {
                pixels.push(null);
                pixelStyles.push(null);
                pixelOffsets.push(0);
            }
        }
    }
    
    return {
        W: width,
        H: height,
        pixels: pixels,
        pixelStyles: pixelStyles,
        pixelOffsets: pixelOffsets
    };
}

/**
 * Convertit et prévisualise le résultat
 */
function convertAndPreview() {
    if (!sourceImageData || detectedColors.length === 0) {
        alert(t('converter.error.detectFirst'));
        return;
    }
    
    // Récupérer les paramètres
    const width = parseInt(outputWidthInput.value);
    const height = parseInt(outputHeightInput.value);
    
    if (width < 1 || width > 500 || height < 1 || height > 500) {
        alert(t('converter.error.invalidDimensions'));
        return;
    }
    
    // Créer la map des couleurs et styles
    const colorStyleMap = new Map();
    const colorItems = document.querySelectorAll('.color-item');
    
    colorItems.forEach((item, index) => {
        const enabled = item.querySelector('.color-enabled').checked;
        const style = item.querySelector('.color-style').value;
        const color = detectedColors[index];
        
        colorStyleMap.set(color.hex, {
            enabled: enabled,
            style: style
        });
    });
    
    // Vérifier qu'au moins une couleur est activée
    const hasEnabledColor = Array.from(colorStyleMap.values()).some(v => v.enabled);
    if (!hasEnabledColor) {
        alert(t('converter.error.noColorEnabled'));
        return;
    }
    
    // Convertir
    pixolatorData = convertToPixolator(sourceImageData, colorStyleMap, width, height);
    
    // Prévisualiser
    renderPixolatorPreview(pixolatorData);
    
    // Afficher les informations
    const usedColors = new Set(pixolatorData.pixels.filter(p => p !== null));
    document.getElementById('result-dimensions').textContent = `${width} × ${height} px`;
    document.getElementById('result-pixels').textContent = 
        pixolatorData.pixels.filter(p => p !== null).length;
    document.getElementById('result-colors').textContent = usedColors.size;
    
    // Afficher les sections
    resultPreviewSection.style.display = 'block';
    downloadBtn.style.display = 'inline-block';
}

/**
 * Affiche un aperçu du résultat Pixolator
 * @param {Object} data - Données Pixolator
 */
function renderPixolatorPreview(data) {
    const pixelSize = 8; // Taille d'affichage de chaque pixel
    resultCanvas.width = data.W * pixelSize;
    resultCanvas.height = data.H * pixelSize;
    
    const ctx = resultCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    // Fond noir
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
    
    // Dessiner chaque pixel
    for (let y = 0; y < data.H; y++) {
        for (let x = 0; x < data.W; x++) {
            const index = y * data.W + x;
            const color = data.pixels[index];
            const style = data.pixelStyles[index];
            const offset = data.pixelOffsets[index];
            
            if (color) {
                ctx.fillStyle = color;
                
                if (style === 'nyzynka') {
                    // Dessiner un losange (nyzynka)
                    const cx = x * pixelSize + pixelSize / 2;
                    const cy = y * pixelSize + pixelSize / 2 + offset * pixelSize / 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - pixelSize / 2);
                    ctx.lineTo(cx + pixelSize / 2, cy);
                    ctx.lineTo(cx, cy + pixelSize / 2);
                    ctx.lineTo(cx - pixelSize / 2, cy);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Dessiner une croix (point de croix)
                    const px = x * pixelSize;
                    const py = y * pixelSize;
                    
                    ctx.fillRect(px, py, pixelSize, pixelSize);
                }
            }
        }
    }
}

/**
 * Télécharge le fichier JSON
 */
function downloadJSON() {
    if (!pixolatorData) {
        alert(t('converter.error.noConversion'));
        return;
    }
    
    const json = JSON.stringify(pixolatorData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixolator_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(t('converter.success.downloaded'));
}

/**
 * Réinitialise tout
 */
function resetAll() {
    sourceImage = null;
    sourceImageData = null;
    detectedColors = [];
    pixolatorData = null;
    
    fileInput.value = '';
    sourcePreviewSection.style.display = 'none';
    settingsSection.style.display = 'none';
    colorPaletteSection.style.display = 'none';
    resultPreviewSection.style.display = 'none';
    actionsSection.style.display = 'none';
    downloadBtn.style.display = 'none';
    
    // Réinitialiser les valeurs par défaut
    outputWidthInput.value = 96;
    outputHeightInput.value = 96;
    colorToleranceInput.value = 10;
    alphaThresholdInput.value = 128;
    toleranceValue.textContent = '10';
    alphaValue.textContent = '128';
}

/**
 * Utilitaires
 */

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Made with Bob
