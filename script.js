document.getElementById('begin-button').addEventListener('click', startGame);

let phrases = [];
let languageMapping = {};
let currentPhrase;
let map;
let geoJsonLayer;
let score = 0;
let usedPhrases = [];
let totalPhrases = 10; // Nombre de phrases par partie
let currentRound = 0;

function startGame() {
  document.getElementById('game-container').style.display = 'block';
  document.getElementById('begin-button').style.display = 'none';

  // Réinitialiser le score et les phrases utilisées
  score = 0;
  usedPhrases = [];
  currentRound = 0;
  updateScoreDisplay();

  // Charger les données JSON
  fetch('data.json')
    .then(response => response.json())
    .then(data => {
      phrases = data.phrases;
      languageMapping = data.countries.reduce((map, country) => {
        map[country.name] = country.language;
        return map;
      }, {});

      // Commencer le jeu avec la première phrase
      nextRound();
      
      // Afficher la carte
      initializeMap();
    });
}

function nextRound() {
  if (currentRound < totalPhrases) {
    currentPhrase = getRandomPhrase();
    document.getElementById('phrase').textContent = currentPhrase.phrase;
    currentRound++;
    updateScoreDisplay(); // Mettre à jour la progression à chaque nouvelle question
  } else {
    endGame();
  }
}

function endGame() {
    alert(`Jeu terminé ! Vous avez obtenu ${score} points sur ${totalPhrases * 100}.`);
    
    // Réinitialiser le jeu et afficher le bouton
    document.getElementById('game-container').style.display = 'none';
    const beginButton = document.getElementById('begin-button');
    beginButton.style.display = 'block';
    beginButton.style.margin = '20px auto'; // Assurez-vous que la marge est bien appliquée
    
    // Remettre l'espacement par défaut
    document.getElementById('phrase-container').textContent = '';
  }

// function initializeMap() {
//   map = L.map('map').setView([20, 0], 2); // Vue initiale de la carte

//   // Ajouter une couche de tuiles OpenStreetMap
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 5,
//     attribution: '© OpenStreetMap contributors'
//   }).addTo(map);

//   // Charger les frontières des pays depuis un fichier GeoJSON
//   fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
//     .then(response => response.json())
//     .then(data => {
//       geoJsonLayer = L.geoJson(data, {
//         style: style,
//         onEachFeature: onEachFeature
//       }).addTo(map);
//     });
// }
function initializeMap() {
    map = L.map('map').setView([20, 0], 2); // Vue initiale de la carte
  
    // Ajouter une couche de tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 5,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  
    // Charger les frontières des pays depuis un fichier GeoJSON
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(response => response.json())
      .then(data => {
        geoJsonLayer = L.geoJson(data, {
          style: style,
          onEachFeature: onEachFeature
        }).addTo(map);
      });
  
    // Réajuster la carte lors du redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
      map.invalidateSize();
    });
  }

// Style des pays
function style(feature) {
  return {
    fillColor: 'white',
    weight: 1,
    opacity: 1,
    color: 'black',
    fillOpacity: 0.7
  };
}

// Ajouter des interactions pour chaque pays
function onEachFeature(feature, layer) {
  layer.on({
    click: onCountryClick
  });
}

// Fonction qui gère le clic sur un pays
function onCountryClick(e) {
  const countryName = e.target.feature.properties.name;
  const selectedLanguage = languageMapping[countryName];

  // Réinitialiser les styles des pays
  geoJsonLayer.eachLayer(layer => {
    layer.setStyle(style(layer.feature));
  });

  if (selectedLanguage) {
    if (selectedLanguage === currentPhrase.language) {
      // Si la réponse est correcte, mettre en surbrillance en vert
      geoJsonLayer.eachLayer(layer => {
        const country = layer.feature.properties.name;
        if (languageMapping[country] === currentPhrase.language) {
          layer.setStyle({
            fillColor: 'green',
            weight: 2,
            opacity: 1,
            color: 'black',
            fillOpacity: 0.8
          });
        }
      });
      alert(`Gagné ! Vous avez cliqué sur ${countryName}.`);
      score += 100; // Ajouter 100 points pour une réponse correcte
    } else {
      // Si la réponse est incorrecte
      geoJsonLayer.eachLayer(layer => {
        const country = layer.feature.properties.name;
        if (country === countryName) {
          // Mettre le mauvais pays en rouge
          layer.setStyle({
            fillColor: 'red',
            weight: 2,
            opacity: 1,
            color: 'black',
            fillOpacity: 0.8
          });
        } else if (languageMapping[country] === currentPhrase.language) {
          // Mettre le bon pays en vert
          layer.setStyle({
            fillColor: 'green',
            weight: 2,
            opacity: 1,
            color: 'black',
            fillOpacity: 0.8
          });
        }
      });
      alert(`Perdu ! Ce pays ne parle pas ${currentPhrase.language}.`);
      score -= 100; // Retirer 100 points pour une réponse incorrecte
    }

    // Passer à la phrase suivante
    nextRound();

    // Mettre à jour l'affichage du score
    updateScoreDisplay();
  } else {
    alert('Langue non définie pour ce pays.');
  }
}

// Fonction pour obtenir une phrase aléatoire
function getRandomPhrase() {
  let availablePhrases = phrases.filter(phrase => !usedPhrases.includes(phrase.phrase));

  if (availablePhrases.length === 0) {
    // Si toutes les phrases ont été utilisées, réinitialiser
    usedPhrases = [];
    availablePhrases = phrases;
  }

  const randomIndex = Math.floor(Math.random() * availablePhrases.length);
  const selectedPhrase = availablePhrases[randomIndex];
  usedPhrases.push(selectedPhrase.phrase);
  return selectedPhrase;
}

// Fonction pour mettre à jour l'affichage du score
function updateScoreDisplay() {
  document.getElementById('score').textContent = score;
  document.getElementById('progress').textContent = `(${currentRound}/${totalPhrases})`;
}