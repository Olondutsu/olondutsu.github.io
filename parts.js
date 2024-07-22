// Charger les pièces et les recettes depuis les fichiers JSON
async function loadPartsAndRecipes() {
    const response = await fetch('parts-list.json');
    const parts = await response.json();

    // Vérification des données chargées
    console.log("Parts loaded:", parts);

    const recipesResponse = await fetch('recipes.json');
    const recipes = await recipesResponse.json();

    return { parts, recipes };
}

let parts = [];

// Fonction pour générer le menu des catégories
function generateCategoryMenu(parts) {
    const categoryList = document.querySelector('.category-list');
    const categories = new Set();

    // Extraire les catégories uniques des pièces
    parts.forEach(part => {
        if (part.category) {
            categories.add(part.category);
        }
    });

    // Créer les éléments de liste pour chaque catégorie
    categories.forEach(category => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.innerText = category;
        button.addEventListener('click', () => filterPartsByCategory(category, parts));
        listItem.appendChild(button);
        categoryList.appendChild(listItem);
    });
}

// Fonction pour afficher les cartes d'ingrédients
function displayParts(parts) {
    const sectionCards = document.querySelector(".cards");
    sectionCards.innerHTML = ""; // Effacer les cartes existantes

    parts.forEach(part => {
        // Créer des éléments pour une carte d'ingrédient
        const partElement = document.createElement("article");

        const nameElement = document.createElement("h2");
        nameElement.innerText = part.name;

        const imageElement = document.createElement("img");
        imageElement.src = part.image;

        const categoryElement = document.createElement("p");
        categoryElement.innerText = `Catégorie: ${part.category}`;

        const stockElement = document.createElement("p");
        stockElement.innerText = part.available ? "En stock" : "Rupture de stock";

        // Attacher les éléments à la carte
        partElement.appendChild(nameElement);
        partElement.appendChild(imageElement);
        partElement.appendChild(categoryElement);
        partElement.appendChild(stockElement);

        // Attacher la carte à la section
        sectionCards.appendChild(partElement);

        // Ajouter un écouteur d'événement pour les clics sur les cartes
        partElement.addEventListener('click', () => {
            alert(`Vous avez sélectionné l'ingrédient: ${part.name}`);
        });
    });
}

// Fonction pour filtrer les pièces par catégorie
function filterPartsByCategory(category, parts) {
    const filteredParts = parts.filter(part => part.category === category);
    console.log(`Parts in category "${category}":`, filteredParts); // Vérifiez les ingrédients filtrés
    displayParts(filteredParts);
}

// Charger les données et initialiser l'application
loadPartsAndRecipes().then(({ parts: loadedParts }) => {
    parts = loadedParts; // Affecter les pièces à la variable globale

    generateCategoryMenu(parts);
    // Ne pas afficher les pièces par défaut, attendre une sélection de catégorie
});
