

const translations = {
  en: {
    // Application title
    'app.title': 'Pix-o-lator Pro | GLOBAL EDITION',
    
    // Menu File
    'menu.file': 'File',
    'menu.new': 'New Project',
    'menu.save': 'Save JSON',
    'menu.open': 'Open JSON',
    'menu.export': 'Export Image...',
    'menu.imageConverter': 'Image Converter...',
    'menu.settings': 'Settings...',
    'menu.resetUI': 'Reset Default UI',
    
    // Menu View
    'menu.view': 'View',
    'menu.grid': 'Grid On/Off',
    'menu.embroidery': 'Embroidery Mode',
    'menu.trame': 'TRAME Mode (3×3)',
    'menu.navPad': 'Navigation Pad',
    'menu.ruler': 'Ruler Panel',
    
    // Menu buttons
    'menu.undo': 'Undo',
    'menu.redo': 'Redo',
    'menu.size': 'Size',
    'menu.edit': 'Edit',
    
    // Tools
    'tool.pencil': 'Pencil',
    'tool.eraser': 'Eraser',
    'tool.brush': 'Brush',
    'tool.bucket': 'Bucket',
    'tool.convert': 'Convert',
    'tool.picker': 'Picker',
    'tool.select': 'Select Box',
    'tool.ruler': 'Ruler',
    'tool.mirrors': 'Mirrors',
    
    // Stitch styles
    'stitch.style': 'Stitch Style:',
    'stitch.cross': 'Cross',
    'stitch.nyzynka': 'Nyzynka',
    'stitch.lineWidth': 'Line Width:',
    
    // Panels
    'panel.fill': 'Fill Settings',
    'panel.fillDiag': 'Include Diagonals',
    'panel.activateBucket': 'Activate Bucket',
    
    'panel.convert': 'Convert Stitch Style',
    'panel.convertDiag': 'Include Diagonals',
    'panel.convertTo': 'Convert to:',
    'panel.convertCross': 'Cross Stitch (Point de croix)',
    'panel.convertNyzynka': 'Nyzynka (Vertical threads)',
    'panel.convertInfo': 'ℹ️ Click on a pixel to convert all connected pixels of the same color to the selected stitch style.',
    'panel.activateConvert': 'Activate Convert Tool',
    
    'panel.mirror': 'Mirror Symmetry',
    'panel.mirrorX': 'Vertical Mirror (X)',
    'panel.mirrorY': 'Horizontal Mirror (Y)',
    'panel.mirrorRadial': 'Radial (8-points)',
    'panel.close': 'Close',
    
    'panel.export': 'Export Image',
    'panel.exportPNG': 'PNG with background',
    'panel.exportTransparent': 'Transparent PNG',
    'panel.exportSVGOptimized': 'Export SVG (Optimized)',
    'panel.exportSVGRaw': 'Export SVG (Raw Pixels)',
    'panel.cancel': 'Cancel',
    
    'panel.resize': 'Canvas Dimensions',
    'panel.width': 'Width:',
    'panel.height': 'Height:',
    'panel.applyResize': 'Apply Resize',
    
    'panel.selection': 'Selection & Edit',
    'panel.boxSelect': '1. Box Select Tool',
    'panel.copy': '2. Copy Selection',
    'panel.paste': '3. Paste & Move',
    'panel.validate': 'Validate Movement',
    
    'panel.threadCount': 'Thread Counter',
    'panel.totalStitches': 'Total stitches:',
    
    'panel.colorPicker': 'Color Picker',
    'panel.colorPickerDesc': 'Choose a color',
    'panel.apply': 'Apply',
    
    // Side panel
    'sidePanel.title': '📐 Edit',
    'sidePanel.selection': '✂️ Selection',
    'sidePanel.geometry': '📐 Geometry',
    'sidePanel.dimensions': 'Dimensions:',
    'sidePanel.position': 'Position:',
    'sidePanel.copy': 'Copy',
    'sidePanel.paste': 'Paste',
    'sidePanel.delete': 'Delete',
    'sidePanel.validateMove': '✓ Validate movement',
    
    // Geometry Kit
    'geometry.title': '📐 Symbol Kit',
    'geometry.description': 'Create your library of reusable symbols',
    'geometry.bgColor': '🎨 Background color (transparent):',
    'geometry.useCanvasBg': '📋 Canvas',
    'geometry.hint': 'Pixels of this color will not be saved',
    'geometry.save': '➕ Save to Geometry',
    'geometry.selectHint': '💡 Select an area to save it',
    'geometry.saved': 'Saved symbols',
    'geometry.empty': 'No symbols in your kit',
    'geometry.use': 'Use',
    'geometry.delete': 'Delete',
    
    // Status bar
    'status.activePixels': 'Active Pixels:',
    'status.ruler': 'Ruler:',
    'status.dimensions': 'Dimensions:',
    'status.mode': 'Mode:',
    'status.pixels': 'Pixels:',
    
    // Palette
    'palette.bg': 'BG',
    'palette.add': '+',
    
    // Navigation Pad
    'navPad.move': 'Move',
    'navPad.close': 'Close',
    
    // Settings
    'settings.title': '⚙️ Settings',
    'settings.language': 'Language:',
    
    // Messages
    'msg.newProject': 'Create a new project? Unsaved changes will be lost.',
    'msg.jsonSaved': 'JSON file saved successfully!',
    'msg.jsonLoaded': 'JSON file loaded successfully!',
    'msg.imageSaved': 'Image exported successfully!',
    'msg.error': 'Error',
    'msg.success': 'Success',
    
    // Image Converter
    'converter.title': '🎨 Image to Pixolator Converter',
    'converter.openPixolator': 'Open Pixolator',
    'converter.instructions': '📋 Usage Instructions',
    'converter.step1': 'Load an image',
    'converter.step1desc': 'Drag and drop or click to select',
    'converter.step2': 'Detected colors',
    'converter.step2desc': 'The tool automatically detects all colors',
    'converter.step3': 'Configure styles',
    'converter.step3desc': 'For each color, choose:',
    'converter.step3a': '✓ Include/Exclude the color',
    'converter.step3b': '🎨 Style: Nyzynka (Ukrainian embroidery) or Cross Stitch',
    'converter.step4': 'Adjust parameters',
    'converter.step4desc': 'Size, color tolerance, transparency',
    'converter.step5': 'Preview',
    'converter.step5desc': 'See the result before export',
    'converter.step6': 'Download JSON',
    'converter.step6desc': 'Compatible with Pixolator',
    'converter.step7': 'Open in Pixolator',
    'converter.step7desc': 'Use the button at the top right',
    'converter.step8': 'Export as PNG',
    'converter.step8desc': 'From Pixolator (File → Export Image)',
    
    'converter.dropZone': 'Drag and drop an image here',
    'converter.or': 'or',
    'converter.selectFile': 'Select a file',
    'converter.supportedFormats': 'Supported formats: PNG, JPG, GIF, BMP, WebP',
    
    'converter.sourceImage': '🖼️ Source Image',
    'converter.dimensions': 'Dimensions:',
    'converter.size': 'Size:',
    
    'converter.settings': '⚙️ Conversion Settings',
    'converter.outputWidth': 'Output width (px):',
    'converter.outputHeight': 'Output height (px):',
    'converter.colorTolerance': 'Color tolerance:',
    'converter.alphaThreshold': 'Transparency threshold:',
    'converter.detectColors': '🔍 Detect colors',
    
    'converter.palette': '🎨 Detected Color Palette',
    'converter.paletteInfo': 'Configure the style for each color detected in your image:',
    'converter.include': 'Include',
    'converter.styleNyzynka': 'Nyzynka (Embroidery)',
    'converter.styleCross': 'Cross Stitch',
    'converter.pixels': 'pixels',
    
    'converter.preview': '👁️ Result Preview',
    'converter.resultDimensions': 'Dimensions:',
    'converter.resultPixels': 'Pixels:',
    'converter.resultColors': 'Colors used:',
    
    'converter.convert': '✨ Convert and Preview',
    'converter.download': '💾 Download JSON',
    'converter.reset': '🔄 Start Over',
    
    'converter.footer': 'Image Converter for Pixolator | JSON format compatible with Ukrainian embroidery (Nyzynka) and Cross Stitch',
    
    // Converter messages
    'converter.error.invalidFile': '❌ Error: Please select a valid image file.',
    'converter.error.fileTooBig': '❌ Error: File is too large (max 10MB).',
    'converter.error.loadFailed': '❌ Error: Unable to load image.',
    'converter.error.readFailed': '❌ Error: Unable to read file.',
    'converter.error.noImage': '❌ Error: No image loaded.',
    'converter.error.noColors': '❌ No colors detected. Try adjusting the transparency threshold.',
    'converter.error.detectFirst': '❌ Error: Please detect colors first.',
    'converter.error.invalidDimensions': '❌ Error: Dimensions must be between 1 and 500 pixels.',
    'converter.error.noColorEnabled': '❌ Error: Please enable at least one color.',
    'converter.error.noConversion': '❌ Error: No conversion performed.',
    'converter.success.downloaded': '✅ JSON file downloaded successfully!\n\nYou can now open it in Pixolator (File → Open JSON).'
  },
  
  fr: {
    // Titre de l'application
    'app.title': 'Pix-o-lator Pro | ÉDITION GLOBALE',
    
    // Menu Fichier
    'menu.file': 'Fichier',
    'menu.new': 'Nouveau Projet',
    'menu.save': 'Sauvegarder JSON',
    'menu.open': 'Ouvrir JSON',
    'menu.export': 'Exporter Image...',
    'menu.imageConverter': 'Convertisseur d\'Images...',
    'menu.settings': 'Paramètres...',
    'menu.resetUI': 'Réinitialiser l\'Interface',
    
    // Menu Affichage
    'menu.view': 'Affichage',
    'menu.grid': 'Grille On/Off',
    'menu.embroidery': 'Mode Broderie',
    'menu.trame': 'Mode TRAME (3×3)',
    'menu.navPad': 'Manette de Navigation',
    'menu.ruler': 'Panneau Règle',
    
    // Boutons du menu
    'menu.undo': 'Annuler',
    'menu.redo': 'Refaire',
    'menu.size': 'Taille',
    'menu.edit': 'Édition',
    
    // Outils
    'tool.pencil': 'Crayon',
    'tool.eraser': 'Gomme',
    'tool.brush': 'Pinceau',
    'tool.bucket': 'Pot de peinture',
    'tool.convert': 'Convertir',
    'tool.picker': 'Pipette',
    'tool.select': 'Sélection',
    'tool.ruler': 'Règle',
    'tool.mirrors': 'Miroirs',
    
    // Styles de points
    'stitch.style': 'Style de Point:',
    'stitch.cross': 'Croix',
    'stitch.nyzynka': 'Nyzynka',
    'stitch.lineWidth': 'Épaisseur:',
    
    // Panneaux
    'panel.fill': 'Paramètres de Remplissage',
    'panel.fillDiag': 'Inclure les Diagonales',
    'panel.activateBucket': 'Activer le Pot de Peinture',
    
    'panel.convert': 'Convertir le Style de Point',
    'panel.convertDiag': 'Inclure les Diagonales',
    'panel.convertTo': 'Convertir en:',
    'panel.convertCross': 'Point de Croix',
    'panel.convertNyzynka': 'Nyzynka (Fils verticaux)',
    'panel.convertInfo': 'ℹ️ Cliquez sur un pixel pour convertir tous les pixels connectés de la même couleur vers le style sélectionné.',
    'panel.activateConvert': 'Activer l\'Outil de Conversion',
    
    'panel.mirror': 'Symétrie Miroir',
    'panel.mirrorX': 'Miroir Vertical (X)',
    'panel.mirrorY': 'Miroir Horizontal (Y)',
    'panel.mirrorRadial': 'Radial (8 points)',
    'panel.close': 'Fermer',
    
    'panel.export': 'Exporter l\'Image',
    'panel.exportPNG': 'PNG avec fond',
    'panel.exportTransparent': 'PNG Transparent',
    'panel.exportSVGOptimized': 'Exporter SVG (Optimisé)',
    'panel.exportSVGRaw': 'Exporter SVG (Pixels Bruts)',
    'panel.cancel': 'Annuler',
    
    'panel.resize': 'Dimensions du Canvas',
    'panel.width': 'Largeur:',
    'panel.height': 'Hauteur:',
    'panel.applyResize': 'Appliquer le Redimensionnement',
    
    'panel.selection': 'Sélection & Édition',
    'panel.boxSelect': '1. Outil de Sélection',
    'panel.copy': '2. Copier la Sélection',
    'panel.paste': '3. Coller & Déplacer',
    'panel.validate': 'Valider le Déplacement',
    
    'panel.threadCount': 'Compteur de Fils',
    'panel.totalStitches': 'Total de points:',
    
    'panel.colorPicker': 'Sélecteur de Couleur',
    'panel.colorPickerDesc': 'Choisissez une couleur',
    'panel.apply': 'Appliquer',
    
    // Panneau latéral
    'sidePanel.title': '📐 Édition',
    'sidePanel.selection': '✂️ Sélection',
    'sidePanel.geometry': '📐 Géométrie',
    'sidePanel.dimensions': 'Dimensions:',
    'sidePanel.position': 'Position:',
    'sidePanel.copy': 'Copier',
    'sidePanel.paste': 'Coller',
    'sidePanel.delete': 'Supprimer',
    'sidePanel.validateMove': '✓ Valider le déplacement',
    
    // Kit de Géométrie
    'geometry.title': '📐 Kit de Symboles',
    'geometry.description': 'Créez votre bibliothèque de symboles réutilisables',
    'geometry.bgColor': '🎨 Couleur de fond (transparente):',
    'geometry.useCanvasBg': '📋 Canvas',
    'geometry.hint': 'Les pixels de cette couleur ne seront pas sauvegardés',
    'geometry.save': '➕ Sauvegarder dans Géométrie',
    'geometry.selectHint': '💡 Sélectionnez une zone pour la sauvegarder',
    'geometry.saved': 'Symboles sauvegardés',
    'geometry.empty': 'Aucun symbole dans votre kit',
    'geometry.use': 'Utiliser',
    'geometry.delete': 'Supprimer',
    
    // Barre d'état
    'status.activePixels': 'Pixels Actifs:',
    'status.ruler': 'Règle:',
    'status.dimensions': 'Dimensions:',
    'status.mode': 'Mode:',
    'status.pixels': 'Pixels:',
    
    // Palette
    'palette.bg': 'FD',
    'palette.add': '+',
    
    // Manette de Navigation
    'navPad.move': 'Déplacer',
    'navPad.close': 'Fermer',
    
    // Paramètres
    'settings.title': '⚙️ Paramètres',
    'settings.language': 'Langue :',
    
    // Messages
    'msg.newProject': 'Créer un nouveau projet ? Les modifications non sauvegardées seront perdues.',
    'msg.jsonSaved': 'Fichier JSON sauvegardé avec succès !',
    'msg.jsonLoaded': 'Fichier JSON chargé avec succès !',
    'msg.imageSaved': 'Image exportée avec succès !',
    'msg.error': 'Erreur',
    'msg.success': 'Succès',
    
    // Convertisseur d'Images
    'converter.title': '🎨 Convertisseur d\'Images → Pixolator',
    'converter.openPixolator': 'Ouvrir Pixolator',
    'converter.instructions': '📋 Instructions d\'utilisation',
    'converter.step1': 'Charger une image',
    'converter.step1desc': 'Glissez-déposez ou cliquez pour sélectionner',
    'converter.step2': 'Couleurs détectées',
    'converter.step2desc': 'L\'outil détecte automatiquement toutes les couleurs',
    'converter.step3': 'Configurer les styles',
    'converter.step3desc': 'Pour chaque couleur, choisissez :',
    'converter.step3a': '✓ Inclure/Exclure la couleur',
    'converter.step3b': '🎨 Style : Nyzynka (broderie ukrainienne) ou Point de Croix',
    'converter.step4': 'Ajuster les paramètres',
    'converter.step4desc': 'Taille, tolérance de couleur, transparence',
    'converter.step5': 'Prévisualiser',
    'converter.step5desc': 'Voir le résultat avant export',
    'converter.step6': 'Télécharger le JSON',
    'converter.step6desc': 'Compatible avec Pixolator',
    'converter.step7': 'Ouvrir dans Pixolator',
    'converter.step7desc': 'Utilisez le bouton en haut à droite',
    'converter.step8': 'Exporter en PNG',
    'converter.step8desc': 'Depuis Pixolator (Fichier → Exporter Image)',
    
    'converter.dropZone': 'Glissez-déposez une image ici',
    'converter.or': 'ou',
    'converter.selectFile': 'Sélectionner un fichier',
    'converter.supportedFormats': 'Formats supportés : PNG, JPG, GIF, BMP, WebP',
    
    'converter.sourceImage': '🖼️ Image Source',
    'converter.dimensions': 'Dimensions :',
    'converter.size': 'Taille :',
    
    'converter.settings': '⚙️ Paramètres de Conversion',
    'converter.outputWidth': 'Largeur de sortie (px) :',
    'converter.outputHeight': 'Hauteur de sortie (px) :',
    'converter.colorTolerance': 'Tolérance de couleur :',
    'converter.alphaThreshold': 'Seuil de transparence :',
    'converter.detectColors': '🔍 Détecter les couleurs',
    
    'converter.palette': '🎨 Palette de Couleurs Détectées',
    'converter.paletteInfo': 'Configurez le style pour chaque couleur détectée dans votre image :',
    'converter.include': 'Inclure',
    'converter.styleNyzynka': 'Nyzynka (Broderie)',
    'converter.styleCross': 'Point de Croix',
    'converter.pixels': 'pixels',
    
    'converter.preview': '👁️ Prévisualisation du Résultat',
    'converter.resultDimensions': 'Dimensions :',
    'converter.resultPixels': 'Pixels :',
    'converter.resultColors': 'Couleurs utilisées :',
    
    'converter.convert': '✨ Convertir et Prévisualiser',
    'converter.download': '💾 Télécharger le JSON',
    'converter.reset': '🔄 Recommencer',
    
    'converter.footer': 'Convertisseur d\'Images pour Pixolator | Format JSON compatible avec broderie ukrainienne (Nyzynka) et Point de Croix',
    
    // Messages du convertisseur
    'converter.error.invalidFile': '❌ Erreur : Veuillez sélectionner un fichier image valide.',
    'converter.error.fileTooBig': '❌ Erreur : Le fichier est trop volumineux (max 10MB).',
    'converter.error.loadFailed': '❌ Erreur : Impossible de charger l\'image.',
    'converter.error.readFailed': '❌ Erreur : Impossible de lire le fichier.',
    'converter.error.noImage': '❌ Erreur : Aucune image chargée.',
    'converter.error.noColors': '❌ Aucune couleur détectée. Essayez d\'ajuster le seuil de transparence.',
    'converter.error.detectFirst': '❌ Erreur : Veuillez d\'abord détecter les couleurs.',
    'converter.error.invalidDimensions': '❌ Erreur : Les dimensions doivent être entre 1 et 500 pixels.',
    'converter.error.noColorEnabled': '❌ Erreur : Veuillez activer au moins une couleur.',
    'converter.error.noConversion': '❌ Erreur : Aucune conversion effectuée.',
    'converter.success.downloaded': '✅ Fichier JSON téléchargé avec succès !\n\nVous pouvez maintenant l\'ouvrir dans Pixolator (Fichier → Ouvrir JSON).'
  }
};

// Langue courante
let currentLanguage = 'fr';

/**
 * Initialise le système i18n
 * Détecte la langue du navigateur et charge la préférence sauvegardée
 */
function initI18n() {
  // Charger la préférence sauvegardée
  const savedLang = localStorage.getItem('pixolator_language');
  
  if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
    currentLanguage = savedLang;
  } else {
    // Détecter la langue du navigateur
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('fr')) {
      currentLanguage = 'fr';
    } else {
      currentLanguage = 'en';
    }
    // Sauvegarder la détection
    localStorage.setItem('pixolator_language', currentLanguage);
  }
  
  // Mettre à jour l'interface
  updateLanguageUI();
}

/**
 * Change la langue de l'application
 * @param {string} lang - Code de langue ('en' ou 'fr')
 */
function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'fr') {
    console.error('Langue non supportée:', lang);
    return;
  }
  
  currentLanguage = lang;
  localStorage.setItem('pixolator_language', lang);
  updateLanguageUI();
  
  // Mettre à jour les boutons de sélection de langue
  document.querySelectorAll('.lang-btn, .lang-btn-panel').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

/**
 * Obtient une traduction pour une clé donnée
 * @param {string} key - Clé de traduction
 * @returns {string} Texte traduit
 */
function t(key) {
  const translation = translations[currentLanguage][key];
  if (!translation) {
    console.warn(`Traduction manquante pour la clé: ${key} (langue: ${currentLanguage})`);
    return key;
  }
  return translation;
}

/**
 * Met à jour tous les éléments de l'interface avec les traductions
 */
function updateLanguageUI() {
  // Mettre à jour le titre de la page
  document.title = t('app.title');
  
  // Mettre à jour tous les éléments avec data-i18n
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);
    
    // Déterminer comment appliquer la traduction
    if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
      element.value = translation;
    } else if (element.tagName === 'INPUT' && element.placeholder !== undefined) {
      element.placeholder = translation;
    } else if (element.hasAttribute('title')) {
      element.title = translation;
    } else {
      element.textContent = translation;
    }
  });
  
  // Mettre à jour les attributs data-i18n-html (pour le HTML)
  document.querySelectorAll('[data-i18n-html]').forEach(element => {
    const key = element.getAttribute('data-i18n-html');
    element.innerHTML = t(key);
  });
  
  // Mettre à jour les attributs data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = t(key);
  });
  
  // Mettre à jour les attributs data-i18n-title
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    element.title = t(key);
  });
  
  // Mettre à jour la langue HTML
  document.documentElement.lang = currentLanguage;
}

// Initialiser au chargement de la page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}

// Made with Bob
