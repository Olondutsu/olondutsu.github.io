document.getElementById('begin-button').addEventListener('click', startGame);

let phrases = [];
let languageMapping = {};
let currentPhrase;
let map;
let geoJsonLayer;
let score = 0;

function startGame() {
  document.getElementById('game-container').style.display = 'block';
  document.getElementById('begin-button').style.display = 'none';

  // Réinitialiser le score
  score = 0;
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

      // Choisir une phrase aléatoire
      currentPhrase = getRandomPhrase();
      document.getElementById('phrase').textContent = currentPhrase.phrase;

      // Afficher la carte
      initializeMap();
    });
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

  let isCorrectAnswer = false;

  if (selectedLanguage) {
    // Mettre en surbrillance tous les pays avec la même langue
    geoJsonLayer.eachLayer(layer => {
      const country = layer.feature.properties.name;
      if (languageMapping[country] === selectedLanguage) {
        layer.setStyle({
          fillColor: 'green',
          weight: 2,
          opacity: 1,
          color: 'black',
          fillOpacity: 0.8
        });
      } else if (languageMapping[country] === currentPhrase.language) {
        // Si le pays parle la langue correcte mais n'est pas cliqué, le rendre rouge
        layer.setStyle({
          fillColor: 'red',
          weight: 2,
          opacity: 1,
          color: 'black',
          fillOpacity: 0.8
        });
      }
    });

    if (selectedLanguage === currentPhrase.language) {
      alert(`Gagné ! Vous avez cliqué sur ${countryName}.`);
      score += 100; // Ajouter 100 points pour une réponse correcte
      isCorrectAnswer = true;
    } else {
        score -= 100;
        alert(`Perdu ! Ce pays ne parle pas ${currentPhrase.langue}.`);
    }

    // Choisir une nouvelle phrase
    currentPhrase = getRandomPhrase();
    document.getElementById('phrase').textContent = currentPhrase.phrase;

    // Mettre à jour l'affichage du score
    updateScoreDisplay();
  } else {
    alert('Langue non définie pour ce pays.');
  }
}

// Fonction pour obtenir une phrase aléatoire
function getRandomPhrase() {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// Fonction pour mettre à jour l'affichage du score
function updateScoreDisplay() {
  document.getElementById('score').textContent = score;
}