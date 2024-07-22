// Charger les pièces et les recettes depuis les fichiers JSON
async function loadPartsAndRecipes() {
    // Fetching the parts from the JSON file
    const response = await fetch('parts-list.json');
    const parts = await response.json();

    const recipesResponse = await fetch('recipes.json');
    const recipes = await recipesResponse.json();

    return { parts, recipes };
}

// Déclarez recipes et selectedParts comme des variables globales
let recipes = [];
let selectedParts = [];

// Générer le menu des catégories
function generateCategoryMenu(parts) {
    const categoryList = document.querySelector('.category-list');
    const categories = new Set();

    // Extract unique categories from parts
    parts.forEach(part => {
        categories.add(part.category);
    });

    // Create list items for each category
    categories.forEach(category => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.innerText = category;
        button.addEventListener('click', () => displayPartsByCategory(category, parts));
        listItem.appendChild(button);
        categoryList.appendChild(listItem);
    });

    // Add an "All" category to show all parts
    const allItem = document.createElement('li');
    const allButton = document.createElement('button');
    allButton.innerText = 'Tous';
    allButton.addEventListener('click', () => displayParts(parts));
    allItem.appendChild(allButton);
    categoryList.insertBefore(allItem, categoryList.firstChild);
}

// Afficher les pièces par catégorie
function displayPartsByCategory(category, parts) {
    const filteredParts = parts.filter(part => part.category === category);
    displayParts(filteredParts);
}

// Afficher toutes les pièces (parts)
function displayParts(parts) {
    const sectionCards = document.querySelector(".cards");
    sectionCards.innerHTML = ""; // Clear existing cards

    parts.forEach(part => {
        // Create elements for a part card
        const partElement = document.createElement("article");

        const imageElement = document.createElement("img");
        imageElement.src = part.image;

        const nameElement = document.createElement("h2");
        nameElement.innerText = part.name;

        const priceElement = document.createElement("p");
        priceElement.innerText = `Price: ${part.price} €`;

        const stockElement = document.createElement("p");
        stockElement.innerText = part.available ? "In stock" : "Out of stock";

        // Append elements to the card
        partElement.appendChild(imageElement);
        partElement.appendChild(nameElement);
        partElement.appendChild(priceElement);
        partElement.appendChild(stockElement);

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
    showAvailableRecipes();
}

// Afficher les recettes disponibles en fonction des ingrédients sélectionnés
function showAvailableRecipes() {
    const selectedNames = selectedParts.map(part => part.name);
    const recipeSection = document.querySelector('.available-recipes');
    recipeSection.innerHTML = ""; // Clear existing recipes

    recipes.forEach(recipe => {
        // Check if all ingredients of the recipe are selected
        const canMakeRecipe = recipe.ingredients.every(ingredient => selectedNames.includes(ingredient));

        if (canMakeRecipe) {
            const recipeElement = document.createElement('p');
            recipeElement.innerText = recipe.name;
            recipeSection.appendChild(recipeElement);
        }
    });
}

// Charger les données et initialiser l'application
loadPartsAndRecipes().then(({ parts, recipes: loadedRecipes }) => {
    recipes = loadedRecipes; // Assign recipes to the global variable
    generateCategoryMenu(parts);
    displayParts(parts); // Display all parts by default
});
