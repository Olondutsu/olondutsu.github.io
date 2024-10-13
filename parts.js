document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.querySelector('.menu');

    menuToggle.addEventListener('click', function() {
        menu.classList.toggle('closed'); // Ajoute ou retire la classe 'closed'
    });
});
// Charger les pièces et les recettes depuis les fichiers JSON
async function loadPartsAndRecipes() {
    const response = await fetch('parts-list.json');
    const parts = await response.json();

    const recipesResponse = await fetch('recipes.json');
    const recipes = await recipesResponse.json();

    return { parts, recipes };
}

let recipes = [];
let selectedParts = [];

// Générer le menu des catégories
function generateCategoryMenu(parts) {
    const categoryList = document.querySelector('.category-list');
    const categories = new Set();

    // Récupérer les catégories uniques
    parts.forEach(part => {
        categories.add(part.category);
    });

    // Créer des boutons pour chaque catégorie
    categories.forEach(category => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.innerText = category;
        button.addEventListener('click', () => {
            displayPartsByCategory(category, parts);
        });
        listItem.appendChild(button);
        categoryList.appendChild(listItem);
    });
}

// Afficher les pièces par catégorie
function displayPartsByCategory(category, parts) {
    const filteredParts = parts.filter(part => part.category === category);
    displayParts(filteredParts);
}

// Afficher toutes les pièces (parts)
function displayParts(parts) {
    const sectionCards = document.querySelector(".ingredients-cards");
    sectionCards.innerHTML = ""; // Clear existing cards

    parts.forEach(part => {
        // Create elements for a part card
        const partElement = document.createElement("article");

        const imageElement = document.createElement("img");
        imageElement.src = part.image;

        const nameElement = document.createElement("h2");
        nameElement.innerText = part.name;

        const priceElement = document.createElement("p");
        priceElement.innerText = `Prix: ${part.price} €`;

        const stockElement = document.createElement("p");
        stockElement.innerText = part.available ? "En stock" : "Rupture de stock";

        const replaceableElement = document.createElement("p");
        replaceableElement.innerText = `Remplaçables: ${part.replaceables ? part.replaceables.join(', ') : "Aucun"}`;

        // Append elements to the card
        partElement.appendChild(imageElement);
        partElement.appendChild(nameElement);
        partElement.appendChild(priceElement);
        partElement.appendChild(stockElement);
        partElement.appendChild(replaceableElement);

        // Append the card to the section
        sectionCards.appendChild(partElement);

        // Add event listener for card click
        partElement.addEventListener('click', () => togglePartSelection(part, partElement));
    });
}

// Gérer la sélection/désélection d'une pièce
function togglePartSelection(part, partElement) {
    const index = selectedParts.indexOf(part);
    if (index === -1) {
        selectedParts.push(part);
        partElement.classList.add('selected');
    } else {
        selectedParts.splice(index, 1);
        partElement.classList.remove('selected');
    }
    updateFridgeList();
    showAvailableRecipes();
}

// Mettre à jour la liste "In my fridge"
function updateFridgeList() {
    const fridgeList = document.querySelector('.fridge-list');
    fridgeList.innerHTML = ""; // Clear the list

    selectedParts.forEach(part => {
        const listItem = document.createElement('li');
        listItem.innerText = part.name;
        const removeButton = document.createElement('button');
        removeButton.innerText = 'x';
        removeButton.addEventListener('click', () => removeFromFridge(part));
        listItem.appendChild(removeButton);
        fridgeList.appendChild(listItem);
    });
}

// Retirer un élément de la liste "In my fridge"
function removeFromFridge(part) {
    const index = selectedParts.indexOf(part);
    if (index !== -1) {
        selectedParts.splice(index, 1);
        document.querySelectorAll('.ingredients-cards article').forEach(article => {
            if (article.querySelector('h2').innerText === part.name) {
                article.classList.remove('selected');
            }
        });
    }
    updateFridgeList();
    showAvailableRecipes();
}

// Afficher les recettes disponibles en fonction des ingrédients sélectionnés
function showAvailableRecipes() {
    const selectedNames = selectedParts.map(part => part.name);
    const recipeSection = document.querySelector('.recipes-cards');
    recipeSection.innerHTML = "";

    const availableRecipes = recipes.filter(recipe => 
        recipe.ingredients.every(ingredient => selectedNames.includes(ingredient))
    );

    availableRecipes.forEach(recipe => {
        const recipeElement = document.createElement('article');
        
        const nameElement = document.createElement('h2');
        nameElement.innerText = recipe.name;
        
        const ingredientsElement = document.createElement('p');
        ingredientsElement.innerText = `Ingrédients: ${recipe.ingredients.join(', ')}`;
        
        recipeElement.appendChild(nameElement);
        recipeElement.appendChild(ingredientsElement);
        recipeSection.appendChild(recipeElement);

        recipeElement.addEventListener('click', () => {
            alert(`Vous avez sélectionné la recette: ${recipe.name}`);
        });
    });
}

// Gérer le basculement entre les onglets Ingrédients et Recettes
function setupTabs() {
    const tabIngredients = document.getElementById('tab-ingredients');
    const tabRecipes = document.getElementById('tab-recipes');
    const ingredientsContent = document.getElementById('ingredients-content');
    const recipesContent = document.getElementById('recipes-content');

    tabIngredients.addEventListener('click', () => {
        tabIngredients.classList.add('active');
        tabRecipes.classList.remove('active');
        ingredientsContent.classList.add('active');
        recipesContent.classList.remove('active');
    });

    tabRecipes.addEventListener('click', () => {
        tabRecipes.classList.add('active');
        tabIngredients.classList.remove('active');
        recipesContent.classList.add('active');
        ingredientsContent.classList.remove('active');
    });
}

// Charger les données et initialiser l'application
loadPartsAndRecipes().then(({ parts, recipes: loadedRecipes }) => {
    recipes = loadedRecipes; // Affecter recipes à la variable globale

    generateCategoryMenu(parts);
    setupTabs();
});
