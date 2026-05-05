// ============================================
// GESTION DES DONNÉES ET STOCKAGE
// ============================================

class StockManager {
    constructor() {
        this.loadFromStorage();
    }

    // Charger les données depuis localStorage
    loadFromStorage() {
        const saved = localStorage.getItem('rotisserie_data');
        if (saved) {
            const data = JSON.parse(saved);
            this.history = data.history || [];
            this.products = data.products || [];
            this.stock = data.stock || {};
            this.stockHistory = data.stockHistory || [];
            this.cookingBatches = data.cookingBatches || [];
        } else {
            this.history = [];
            this.products = [];
            this.stock = {};
            this.stockHistory = [];
            this.cookingBatches = [];
        }
    }

    // Sauvegarder les données dans localStorage
    saveToStorage() {
        const data = {
            history: this.history,
            products: this.products,
            stock: this.stock,
            stockHistory: this.stockHistory,
            cookingBatches: this.cookingBatches
        };
        localStorage.setItem('rotisserie_data', JSON.stringify(data));
    }

    // Ajouter un lot de cuisson
    startCookingBatch(productId, quantity, cookingTime) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return { success: false, message: 'Produit non trouvé' };

        const now = new Date();
        const endTime = new Date(now.getTime() + cookingTime * 60000); // cookingTime en minutes

        const batch = {
            id: Date.now(),
            productId: productId,
            productName: product.name,
            quantity: quantity,
            startTime: now.toISOString(),
            endTime: endTime.toISOString(),
            cookingTime: cookingTime,
            status: 'cooking' // 'cooking', 'ready', 'transferred'
        };

        this.cookingBatches.push(batch);
        this.saveToStorage();

        return { success: true, batch: batch };
    }

    // Obtenir les lots de cuisson
    getCookingBatches() {
        return this.cookingBatches;
    }

    // Obtenir les lots en cuisson
    getActiveCookingBatches() {
        return this.cookingBatches.filter(b => b.status === 'cooking' || b.status === 'ready');
    }

    // Mettre à jour le statut d'un lot
    updateBatchStatus(batchId, newStatus) {
        const batch = this.cookingBatches.find(b => b.id === batchId);
        if (batch) {
            batch.status = newStatus;
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Transférer un lot prêt en stock
    transferBatchToStock(batchId) {
        const batch = this.cookingBatches.find(b => b.id === batchId);
        if (!batch) return { success: false, message: 'Lot non trouvé' };

        // Ajouter au stock
        this.stock[batch.productId] = (this.stock[batch.productId] || 0) + batch.quantity;
        
        // Marquer comme transféré
        batch.status = 'transferred';
        
        // Ajouter à l'historique
        this.addStockHistoryEntry(batch.productId, batch.quantity, 'add');
        
        this.saveToStorage();
        
        return { success: true, message: `${batch.quantity} ${batch.productName} transféré(s) en stock` };
    }

    // Annuler un lot de cuisson
    cancelCookingBatch(batchId) {
        const index = this.cookingBatches.findIndex(b => b.id === batchId);
        if (index !== -1) {
            this.cookingBatches.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Vérifier et mettre à jour les lots prêts
    checkCookingBatches() {
        const now = new Date();
        let updated = false;

        this.cookingBatches.forEach(batch => {
            if (batch.status === 'cooking') {
                const endTime = new Date(batch.endTime);
                if (now >= endTime) {
                    batch.status = 'ready';
                    updated = true;
                }
            }
        });

        if (updated) {
            this.saveToStorage();
        }

        return updated;
    }

    // Ajouter une entrée dans l'historique des stocks
    addStockHistoryEntry(productId, quantity, type) {
        const product = this.products.find(p => p.id === productId);
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            productId: productId,
            productName: product ? product.name : productId,
            quantity: quantity,
            type: type, // 'add' ou 'remove'
            stockAfter: this.stock[productId] || 0
        };
        this.stockHistory.unshift(entry);
        this.saveToStorage();
    }

    // Obtenir l'historique des stocks
    getStockHistory() {
        return this.stockHistory;
    }

    // Effacer l'historique des stocks
    clearStockHistory() {
        this.stockHistory = [];
        this.saveToStorage();
    }

    // Obtenir la liste des produits
    getProducts() {
        return this.products;
    }

    // Ajouter un nouveau produit
    addProduct(product) {
        // Générer un ID à partir du nom (remplacer espaces par tirets, en minuscules)
        const id = product.name.toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''); // Retirer les caractères spéciaux
        
        // Vérifier si un produit avec cet ID existe déjà
        if (this.products.find(p => p.id === id)) {
            throw new Error(`Un produit avec le nom "${product.name}" existe déjà`);
        }

        const newProduct = {
            id: id,
            name: product.name,
            image: product.image || null, // Image en base64 ou null
            icon: product.icon || '🍗', // Emoji par défaut
            halfAvailable: product.halfAvailable || false,
            cost: parseFloat(product.cost) || 0,
            price: parseFloat(product.price) || 0,
            halfPrice: product.halfAvailable ? (parseFloat(product.halfPrice) || 0) : 0,
            cookingStatus: product.cookingStatus || 'cooked', // 'cooked' ou 'to-cook'
            cookingTime: parseInt(product.cookingTime) || 90 // Temps en minutes, défaut 90
        };

        this.products.push(newProduct);
        
        // Initialiser le stock à 0 pour ce produit
        if (!this.stock[id]) {
            this.stock[id] = 0;
        }

        // Si vendable en moitié, créer automatiquement le produit "Demi"
        if (product.halfAvailable) {
            const halfId = 'demi-' + id;
            const halfName = 'Demi ' + product.name;
            
            // Vérifier que le produit demi n'existe pas déjà
            if (!this.products.find(p => p.id === halfId)) {
                const halfProduct = {
                    id: halfId,
                    name: halfName,
                    image: product.image || null, // Même image que le produit entier
                    icon: product.icon || '🍗', // Même icône
                    halfAvailable: false, // Le demi n'est pas vendable en moitié
                    cost: parseFloat(product.cost) / 2 || 0, // Moitié du coût
                    price: parseFloat(product.halfPrice) || 0, // Prix du demi
                    halfPrice: 0,
                    parentProductId: id, // Lien vers le produit parent pour le stock partagé
                    stockRatio: 0.5 // 1 demi = 0.5 entier
                };

                this.products.push(halfProduct);
                
                // Le produit demi n'a pas son propre stock, il utilise celui du parent
                // On ne crée donc PAS de stock[halfId]
            }
        }
        
        this.saveToStorage();
        return newProduct;
    }

    // Mettre à jour un produit existant
    updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Produit non trouvé');
        }

        // Mettre à jour les propriétés
        this.products[index] = {
            ...this.products[index],
            name: updates.name || this.products[index].name,
            image: updates.image !== undefined ? updates.image : this.products[index].image,
            icon: updates.icon !== undefined ? updates.icon : this.products[index].icon,
            halfAvailable: updates.halfAvailable !== undefined ? updates.halfAvailable : this.products[index].halfAvailable,
            cost: updates.cost !== undefined ? parseFloat(updates.cost) : this.products[index].cost,
            price: updates.price !== undefined ? parseFloat(updates.price) : this.products[index].price,
            halfPrice: updates.halfPrice !== undefined ? parseFloat(updates.halfPrice) : this.products[index].halfPrice
        };

        this.saveToStorage();
        return this.products[index];
    }

    // Supprimer un produit
    deleteProduct(id) {
        const index = this.products.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Produit non trouvé');
        }

        // Supprimer le produit
        this.products.splice(index, 1);
        
        // Supprimer le stock associé
        delete this.stock[id];
        
        this.saveToStorage();
    }

    // Vérifier si une commande est possible
    canFulfillOrder(order) {
        // Créer un map des produits pour accès rapide
        const productsMap = {};
        this.products.forEach(p => {
            productsMap[p.id] = p;
        });
        
        // Vérifier le stock pour chaque produit commandé
        for (const [productId, qty] of Object.entries(order.items)) {
            if (qty > 0) {
                const product = productsMap[productId];
                
                // Si le produit a un parent (c'est un "Demi"), vérifier le stock du parent
                if (product && product.parentProductId) {
                    const parentStock = this.stock[product.parentProductId] || 0;
                    const stockRatio = product.stockRatio || 0.5;
                    const requiredParentStock = qty * stockRatio;
                    
                    if (requiredParentStock > parentStock) {
                        return {
                            possible: false,
                            message: `Stock insuffisant pour ${product.name}`
                        };
                    }
                } else {
                    // Produit normal, vérifier son propre stock
                    const availableStock = this.stock[productId] || 0;
                    if (qty > availableStock) {
                        return {
                            possible: false,
                            message: `Stock insuffisant pour le produit ${productId}`
                        };
                    }
                }
            }
        }
        
        return {
            possible: true
        };
    }

    // Traiter une commande (déduire du stock)
    processOrder(order) {
        const check = this.canFulfillOrder(order);
        
        if (!check.possible) {
            return {
                success: false,
                message: check.message || 'Stock insuffisant pour cette commande'
            };
        }

        // Déduire du stock pour chaque produit
        let cost = 0;
        let revenue = 0;
        
        const productsMap = {};
        this.products.forEach(p => {
            productsMap[p.id] = p;
        });
        
        for (const [productId, qty] of Object.entries(order.items)) {
            if (qty > 0 && productsMap[productId]) {
                const product = productsMap[productId];
                
                // Si le produit a un parent (c'est un "Demi"), déduire du stock du parent
                if (product.parentProductId) {
                    const stockRatio = product.stockRatio || 0.5;
                    const parentStockToDeduct = qty * stockRatio;
                    this.stock[product.parentProductId] = (this.stock[product.parentProductId] || 0) - parentStockToDeduct;
                } else {
                    // Produit normal, déduire de son propre stock
                    this.stock[productId] = (this.stock[productId] || 0) - qty;
                }
                
                // Calculer coût et revenu
                cost += qty * product.cost;
                revenue += qty * product.price;
            }
        }

        const profit = revenue - cost;

        // Ajouter à l'historique
        const orderRecord = {
            id: Date.now(),
            date: new Date().toISOString(),
            customerName: order.customerName || '',
            status: 'pending', // pending, completed, cancelled
            items: order.items,
            financial: {
                cost: cost,
                revenue: revenue,
                profit: profit
            }
        };

        this.history.unshift(orderRecord);
        this.saveToStorage();

        return {
            success: true,
            message: 'Commande enregistrée avec succès',
            order: orderRecord
        };
    }

    // Obtenir l'historique
    getHistory() {
        return this.history;
    }

    // Effacer l'historique
    clearHistory() {
        this.history = [];
        this.saveToStorage();
    }

    // Mettre à jour le statut d'une commande
    updateOrderStatus(orderId, newStatus) {
        const order = this.history.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Obtenir les commandes par statut
    getOrdersByStatus(status) {
        if (status === 'all') {
            return this.history;
        }
        return this.history.filter(order => order.status === status);
    }

    // Obtenir le nombre de commandes par statut
    getOrdersCount() {
        return {
            pending: this.history.filter(o => o.status === 'pending').length,
            completed: this.history.filter(o => o.status === 'completed').length,
            cancelled: this.history.filter(o => o.status === 'cancelled').length
        };
    }

    // Obtenir les statistiques
    getStats() {
        const today = new Date().toDateString();
        const todayOrders = this.history.filter(order => {
            const orderDate = new Date(order.date).toDateString();
            return orderDate === today;
        });

        // Calculer les totaux financiers
        let totalRevenue = 0;
        let totalProfit = 0;
        let todayRevenue = 0;
        let todayProfit = 0;

        this.history.forEach(order => {
            if (order.financial) {
                totalRevenue += order.financial.revenue;
                totalProfit += order.financial.profit;

                const orderDate = new Date(order.date).toDateString();
                if (orderDate === today) {
                    todayRevenue += order.financial.revenue;
                    todayProfit += order.financial.profit;
                }
            }
        });

        return {
            totalOrders: this.history.length,
            todayOrders: todayOrders.length,
            totalRevenue: totalRevenue,
            todayRevenue: todayRevenue,
            totalProfit: totalProfit,
            todayProfit: todayProfit
        };
    }
}

// ============================================
// INTERFACE UTILISATEUR
// ============================================

class UI {
    constructor(stockManager) {
        this.stockManager = stockManager;
        this.currentOrder = {}; // Objet dynamique pour tous les produits
        this.initializeEventListeners();
        this.updateAllDisplays();
    }

    // Initialiser tous les écouteurs d'événements
    initializeEventListeners() {
        // Navigation par onglets
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Commandes - Les event listeners sont maintenant dans le HTML généré dynamiquement
        document.getElementById('validate-order').addEventListener('click', () => this.validateOrder());
        document.getElementById('reset-order').addEventListener('click', () => this.resetOrderForm());

        // Boutons de confirmation des stocks
        document.getElementById('confirm-stock-btn').addEventListener('click', () => this.confirmStockChanges());
        document.getElementById('cancel-stock-btn').addEventListener('click', () => this.cancelStockChanges());

        // Gestion des stocks - Les event listeners sont maintenant dans le HTML généré dynamiquement

        // Gestion des produits
        document.getElementById('add-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewProduct();
        });

        // Afficher/masquer le champ prix demi selon la checkbox
        document.getElementById('product-half-available').addEventListener('change', (e) => {
            const halfPriceGroup = document.getElementById('half-price-group');
            halfPriceGroup.style.display = e.target.checked ? 'block' : 'none';
        });

        // Afficher/masquer le champ temps de cuisson selon le statut
        document.getElementById('product-cooking-status').addEventListener('change', (e) => {
            const cookingTimeGroup = document.getElementById('cooking-time-group');
            cookingTimeGroup.style.display = e.target.value === 'to-cook' ? 'block' : 'none';
        });

        // Gestion des sous-onglets dans Stocks
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subtab = e.target.dataset.subtab;
                
                // Retirer la classe active de tous les boutons et contenus
                document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
                
                // Ajouter la classe active au bouton et contenu sélectionnés
                e.target.classList.add('active');
                document.getElementById(subtab).classList.add('active');
                
                // Si on passe à l'onglet cuissons, démarrer le timer
                if (subtab === 'cuissons') {
                    this.startCookingTimer();
                    this.updateCookingBatchesDisplay();
                } else {
                    this.stopCookingTimer();
                }
            });
        });

        // Liste des commandes - Filtres
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterOrders(e.target.dataset.filter));
        });

        // Liste des commandes - Recherche
        document.getElementById('customer-search').addEventListener('input', (e) => this.searchOrders(e.target.value));

        // Historique
        document.getElementById('clear-history').addEventListener('click', () => this.clearHistory());
        document.getElementById('export-history').addEventListener('click', () => this.exportHistory());
    }

    // Changer d'onglet
    switchTab(tabName) {
        // Désactiver tous les onglets et contenus
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Activer l'onglet sélectionné
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        // Si on passe à l'onglet Stocks, mettre à jour l'historique
        if (tabName === 'stocks') {
            this.updateStockHistoryDisplay();
        }

        // Mettre à jour l'affichage selon l'onglet
        if (tabName === 'stocks') {
            this.updateStockDisplay();
        } else if (tabName === 'historique') {
            this.updateHistoryDisplay();
        } else if (tabName === 'commandes') {
            this.updateOrderDisplay();
        } else if (tabName === 'liste-commandes') {
            this.updateOrdersList();
        } else if (tabName === 'produits') {
            this.updateProductsList();
        }
    }

    // Mettre à jour tous les affichages
    updateAllDisplays() {
        this.updateOrderDisplay();
        this.updateStockDisplay();
        this.updateHistoryDisplay();
        this.updateProductsList();
        this.updateOrdersList();
    }

    // Mettre à jour l'affichage de la section commandes avec cartes produits
    updateOrderDisplay() {
        const products = this.stockManager.getProducts();
        const stock = this.stockManager.stock;
        const productsGrid = document.getElementById('products-grid');
        
        if (!productsGrid) return;
        
        let html = '';
        
        products.forEach(product => {
            // Pour les produits "Demi", utiliser le stock du produit parent
            let productStock;
            if (product.parentProductId) {
                // Stock du parent converti en unités de demi
                const parentStock = stock[product.parentProductId] || 0;
                productStock = parentStock * 2; // 1 entier = 2 demis
            } else {
                productStock = stock[product.id] || 0;
            }
            
            const currentQty = this.currentOrder[product.id] || 0;
            
            // Afficher l'image ou l'emoji
            const imageDisplay = product.image
                ? `<img src="${product.image}" alt="${product.name}" class="product-card-image">`
                : `<span class="product-card-icon">${product.icon}</span>`;
            
            const stockClass = productStock === 0 ? 'out-of-stock' : (productStock <= 3 ? 'low-stock' : '');
            const selectedClass = currentQty > 0 ? 'selected' : '';
            
            html += `
                <div class="product-card ${stockClass} ${selectedClass}" data-product="${product.id}" onclick="ui.handleProductCardClick('${product.id}')">
                    <div class="product-card-header">
                        ${imageDisplay}
                        <h3>${product.name}</h3>
                    </div>
                    <div class="product-card-info">
                        <span class="product-price" id="price-${product.id}">${product.price.toFixed(2)}€</span>
                        <span class="product-stock ${stockClass}" id="stock-${product.id}">Stock: ${productStock}</span>
                    </div>
                    <div class="product-card-quantity">
                        <button class="btn-decrement" onclick="event.stopPropagation(); ui.decrementProduct('${product.id}')">-</button>
                        <span class="quantity-display" id="qty-${product.id}">${currentQty}</span>
                        <button class="btn-increment" onclick="event.stopPropagation(); ui.handleProductCardClick('${product.id}')">+</button>
                    </div>
                </div>
            `;
        });
        
        productsGrid.innerHTML = html;
        this.updateOrderSummary();
    }

    // Mettre à jour une carte produit
    updateProductCard(productId, stock, price) {
        const card = document.querySelector(`[data-product="${productId}"]`);
        if (!card) return;

        const stockElement = document.getElementById(`stock-${productId}`);
        const priceElement = document.getElementById(`price-${productId}`);
        const qtyElement = document.getElementById(`qty-${productId}`);

        // Mettre à jour le prix
        if (priceElement) {
            priceElement.textContent = `${price.toFixed(2)}€`;
        }

        // Mettre à jour le stock
        if (stockElement) {
            stockElement.textContent = `Stock: ${stock}`;
            
            // Ajouter des classes selon le niveau de stock
            stockElement.classList.remove('low-stock', 'out-of-stock');
            if (stock === 0) {
                stockElement.classList.add('out-of-stock');
                card.classList.add('out-of-stock');
            } else if (stock <= 3) {
                stockElement.classList.add('low-stock');
                card.classList.remove('out-of-stock');
            } else {
                card.classList.remove('out-of-stock');
            }
        }

        // Mettre à jour la quantité sélectionnée
        const currentQty = this.currentOrder[this.getOrderKey(productId)] || 0;
        if (qtyElement) {
            qtyElement.textContent = currentQty;
            if (currentQty > 0) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
    }

    // Gérer le clic sur une carte produit
    async handleProductCardClick(productId) {
        const stock = this.stockManager.stock;
        const products = this.stockManager.getProducts();
        const product = products.find(p => p.id === productId);
        
        // Calculer le stock disponible
        let availableStock;
        let stockProductId = productId; // ID du produit dont on gère le stock
        
        if (product && product.parentProductId) {
            // Pour les produits "Demi", vérifier le stock du parent
            stockProductId = product.parentProductId;
            const parentStock = stock[product.parentProductId] || 0;
            availableStock = parentStock * 2; // 1 entier = 2 demis
        } else {
            availableStock = stock[productId] || 0;
        }
        
        const currentQty = this.currentOrder[productId] || 0;
        const newQty = currentQty + 1;
        
        // Vérifier si on dépasse le stock
        if (newQty > availableStock) {
            const shortage = newQty - availableStock;
            const result = await this.showStockAddDialog(product.name, shortage, stockProductId);
            
            if (result.confirmed && result.quantity > 0) {
                // Ajouter au stock
                this.stockManager.stock[stockProductId] = (this.stockManager.stock[stockProductId] || 0) + result.quantity;
                this.stockManager.addStockHistoryEntry(stockProductId, result.quantity, 'add');
                this.stockManager.saveToStorage();
                this.showNotification(`+${result.quantity} ${product.name} ajouté(s) au stock`, 'success');
            } else {
                // Ne pas ajouter à la commande si refusé
                return;
            }
        }

        // Incrémenter la quantité
        this.currentOrder[productId] = newQty;
        
        // Mettre à jour l'affichage
        this.updateOrderDisplay();
    }

    // Afficher une boîte de dialogue pour ajouter du stock
    showStockAddDialog(productName, shortage, productId) {
        return new Promise((resolve) => {
            // Créer la modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>⚠️ Stock insuffisant</h3>
                    <p>Il manque <strong>${shortage}</strong> unité(s) de <strong>${productName}</strong> en stock.</p>
                    <p>Voulez-vous en ajouter au stock ?</p>
                    <div class="form-group">
                        <label>Quantité à ajouter :</label>
                        <input type="number" id="stock-add-quantity" min="${shortage}" step="0.5" value="${shortage}" class="stock-input">
                    </div>
                    <div class="modal-buttons">
                        <button class="btn btn-success" id="confirm-add-stock">
                            <span class="btn-icon">✓</span> Ajouter au stock
                        </button>
                        <button class="btn btn-secondary" id="cancel-add-stock">
                            <span class="btn-icon">✕</span> Annuler
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const input = document.getElementById('stock-add-quantity');
            const confirmBtn = document.getElementById('confirm-add-stock');
            const cancelBtn = document.getElementById('cancel-add-stock');
            
            // Focus sur l'input
            setTimeout(() => input.focus(), 100);
            
            const cleanup = () => {
                document.body.removeChild(modal);
            };
            
            confirmBtn.addEventListener('click', () => {
                const quantity = parseFloat(input.value) || 0;
                cleanup();
                resolve({ confirmed: true, quantity });
            });
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve({ confirmed: false, quantity: 0 });
            });
            
            // Fermer avec Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve({ confirmed: false, quantity: 0 });
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    // Décrémenter la quantité d'un produit
    decrementProduct(productId) {
        // Décrémenter seulement si la quantité est supérieure à 0
        if (this.currentOrder[productId] && this.currentOrder[productId] > 0) {
            this.currentOrder[productId] -= 1;
            
            // Mettre à jour l'affichage
            this.updateOrderDisplay();
        }
    }

    // Mettre à jour le résumé de la commande
    updateOrderSummary() {
        const itemsList = document.getElementById('order-items-list');
        const totalElement = document.getElementById('total-amount');
        const products = this.stockManager.getProducts();

        const hasItems = Object.values(this.currentOrder).some(qty => qty > 0);

        if (!hasItems) {
            itemsList.innerHTML = '<p class="empty-cart">Aucun produit sélectionné</p>';
            totalElement.textContent = '0.00€';
            return;
        }

        let html = '';
        let total = 0;

        // Créer un map des produits par ID pour un accès rapide
        const productsMap = {};
        products.forEach(p => {
            productsMap[p.id] = p;
        });

        for (const [productId, qty] of Object.entries(this.currentOrder)) {
            if (qty > 0 && productsMap[productId]) {
                const product = productsMap[productId];
                const price = product.price;
                const itemTotal = qty * price;
                total += itemTotal;

                html += `
                    <div class="order-item">
                        <span class="order-item-name">${product.name}</span>
                        <div class="order-item-details">
                            <span class="order-item-qty">×${qty}</span>
                            <span class="order-item-price">${itemTotal.toFixed(2)}€</span>
                        </div>
                    </div>
                `;
            }
        }

        itemsList.innerHTML = html;
        totalElement.textContent = `${total.toFixed(2)}€`;
    }

    // Récupérer la commande depuis le formulaire
    getOrderFromForm() {
        return {
            customerName: document.getElementById('customer-name').value.trim(),
            items: { ...this.currentOrder } // Copie de tous les produits commandés
        };
    }

    // Valider une commande
    validateOrder() {
        const order = this.getOrderFromForm();
        
        // Vérifier qu'il y a au moins un produit
        const hasItems = Object.values(order.items).some(qty => qty > 0);

        if (!hasItems) {
            this.showNotification('Veuillez sélectionner au moins un produit', 'error');
            return;
        }

        const result = this.stockManager.processOrder(order);

        if (result.success) {
            this.showNotification('Commande enregistrée avec succès !', 'success');
            this.resetOrderForm();
            this.updateAllDisplays();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    // Réinitialiser le formulaire de commande
    resetOrderForm() {
        document.getElementById('customer-name').value = '';
        
        // Réinitialiser l'objet currentOrder (vider toutes les quantités)
        this.currentOrder = {};
        
        this.updateOrderDisplay();
    }

    // Mettre à jour l'affichage des stocks
    updateStockDisplay() {
        const products = this.stockManager.getProducts();
        const stock = this.stockManager.stock;
        const stockGrid = document.querySelector('.stock-cards-grid');
        
        if (!stockGrid) return;
        
        let html = '';
        const pendingChanges = this.pendingStockChanges || {};
        
        products.forEach(product => {
            // Ne pas afficher les produits "Demi" dans l'onglet Stocks
            if (product.parentProductId) {
                return;
            }
            
            const productStock = stock[product.id] || 0;
            const pendingChange = pendingChanges[product.id] || 0;
            const newStock = productStock + pendingChange;
            const stockClass = newStock === 0 ? 'out-of-stock' : (newStock <= 3 ? 'low-stock' : '');
            
            // Afficher l'image ou l'emoji
            const imageDisplay = product.image
                ? `<img src="${product.image}" alt="${product.name}" class="stock-icon-image">`
                : `<div class="stock-icon">${product.icon}</div>`;
            
            html += `
                <div class="stock-management-card ${pendingChange !== 0 ? 'has-pending-changes' : ''}">
                    ${imageDisplay}
                    <div class="stock-name">${product.name}</div>
                    <div class="stock-display-area">
                        ${pendingChange !== 0 ? `
                        <div class="stock-change-display">
                            <div class="stock-change-value ${pendingChange > 0 ? 'positive' : 'negative'}">
                                ${pendingChange > 0 ? '+' : ''}${pendingChange}
                            </div>
                            <div class="stock-change-label">Changement</div>
                        </div>
                        <div class="stock-current-display">
                            <div class="stock-current-small">${productStock}</div>
                            <div class="stock-arrow">→</div>
                            <div class="stock-current-small">${newStock}</div>
                        </div>
                        ` : `
                        <div class="stock-current-value ${stockClass}">${productStock}</div>
                        `}
                    </div>
                    <div class="stock-controls-area">
                        <div class="stock-controls">
                            <button class="btn-stock-minus" onclick="ui.decrementStockForProduct('${product.id}')">−</button>
                            <input type="number" class="stock-input" id="stock-input-${product.id}" min="0" step="0.5" value="1" />
                            <button class="btn-stock-plus" onclick="ui.incrementStockForProduct('${product.id}')">+</button>
                        </div>
                        <div class="stock-half-controls ${!product.halfAvailable ? 'empty' : ''}">
                            ${product.halfAvailable ? `
                            <button class="btn-stock-half-minus" onclick="ui.decrementStockForProduct('${product.id}', 0.5)">− 0.5</button>
                            <button class="btn-stock-half-plus" onclick="ui.incrementStockForProduct('${product.id}', 0.5)">+ 0.5</button>
                            ` : ''}
                        </div>
                        ${product.cookingStatus === 'to-cook' ? `
                        <div class="stock-cooking-controls">
                            <button class="btn-start-cooking" onclick="ui.showStartCookingDialog('${product.id}')">
                                🔥 Mettre en cuisson
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        stockGrid.innerHTML = html;
        
        // Afficher/masquer les boutons de confirmation
        this.updateStockConfirmButtons();
        
        // Mettre à jour l'historique aussi
        this.updateStockHistoryDisplay();
    }

    // Mettre à jour les boutons de confirmation
    updateStockConfirmButtons() {
        const hasPendingChanges = this.pendingStockChanges && Object.keys(this.pendingStockChanges).length > 0;
        const confirmBtn = document.getElementById('confirm-stock-btn');
        const cancelBtn = document.getElementById('cancel-stock-btn');
        
        if (confirmBtn && cancelBtn) {
            if (hasPendingChanges) {
                confirmBtn.style.display = 'inline-flex';
                cancelBtn.style.display = 'inline-flex';
            } else {
                confirmBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
            }
        }
    }

    // Afficher l'historique des stocks
    updateStockHistoryDisplay() {
        const stockHistory = this.stockManager.getStockHistory();
        const historyContainer = document.getElementById('stock-history-list');
        
        if (!historyContainer) return;
        
        if (stockHistory.length === 0) {
            historyContainer.innerHTML = '<p class="no-data">Aucun historique de stock disponible</p>';
            return;
        }
        
        let html = '<table class="stock-history-table"><thead><tr><th>Heure</th><th>Produit</th><th>Modification</th><th>Stock après</th></tr></thead><tbody>';
        
        stockHistory.forEach(entry => {
            const date = new Date(entry.date);
            const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            
            const typeClass = entry.type === 'add' ? 'positive' : 'negative';
            const typeIcon = entry.type === 'add' ? '↑' : '↓';
            
            html += `
                <tr class="stock-history-row ${typeClass}">
                    <td class="stock-history-time">
                        <div class="time">${timeStr}</div>
                        <div class="date">${dateStr}</div>
                    </td>
                    <td class="stock-history-product">${entry.productName}</td>
                    <td class="stock-history-change ${typeClass}">
                        <span class="change-icon">${typeIcon}</span>
                        <span class="change-value">${entry.quantity}</span>
                    </td>
                    <td class="stock-history-after">${entry.stockAfter}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        historyContainer.innerHTML = html;
    }

    // Préparer l'ajout au stock (sans confirmation)
    prepareStockChange(productId, quantity, type) {
        // Stocker temporairement les changements en attente
        if (!this.pendingStockChanges) {
            this.pendingStockChanges = {};
        }
        
        if (!this.pendingStockChanges[productId]) {
            this.pendingStockChanges[productId] = 0;
        }
        
        if (type === 'add') {
            this.pendingStockChanges[productId] += quantity;
        } else {
            this.pendingStockChanges[productId] -= quantity;
        }
        
        // Mettre à jour l'affichage pour montrer les changements en attente
        this.updateStockDisplay();
    }

    // Incrémenter le stock pour un produit spécifique
    incrementStockForProduct(productId, fixedQuantity = null) {
        let quantity;
        
        if (fixedQuantity !== null) {
            quantity = fixedQuantity;
        } else {
            const inputId = `stock-input-${productId}`;
            const input = document.getElementById(inputId);
            quantity = parseFloat(input.value) || 1;
        }
        
        this.prepareStockChange(productId, quantity, 'add');
    }

    // Décrémenter le stock pour un produit spécifique
    decrementStockForProduct(productId, fixedQuantity = null) {
        let quantity;
        
        if (fixedQuantity !== null) {
            quantity = fixedQuantity;
        } else {
            const inputId = `stock-input-${productId}`;
            const input = document.getElementById(inputId);
            quantity = parseFloat(input.value) || 1;
        }
        
        const currentStock = this.stockManager.stock[productId] || 0;
        const pendingChange = this.pendingStockChanges?.[productId] || 0;
        
        if (currentStock + pendingChange < quantity) {
            this.showNotification('Stock insuffisant pour cette opération', 'error');
            return;
        }
        
        this.prepareStockChange(productId, quantity, 'remove');
    }

    // Afficher la modal pour démarrer une cuisson
    showStartCookingDialog(productId) {
        const product = this.stockManager.getProducts().find(p => p.id === productId);
        if (!product) return;

        // Obtenir l'heure actuelle au format HH:MM
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🔥 Gestion de cuisson</h3>
                <p><strong>${product.name}</strong></p>
                <div class="form-group">
                    <label>Quantité :</label>
                    <input type="number" id="cooking-quantity" min="1" step="1" value="5" class="stock-input">
                </div>
                <div class="form-group">
                    <label>Statut :</label>
                    <select id="cooking-status" class="stock-input">
                        <option value="already-cooked">✅ Déjà cuit (ajouter au stock)</option>
                        <option value="start-now">🔥 Démarrer maintenant</option>
                        <option value="custom-time">🕐 Heure de mise en cuisson</option>
                    </select>
                </div>
                <div class="form-group" id="cooking-status-change-group" style="display: none;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="change-cooking-status" style="width: auto; cursor: pointer;">
                        <span>Marquer comme "Cuit" (prêt à vendre)</span>
                    </label>
                    <small style="color: #666; font-size: 0.85rem;">Le produit sera marqué comme cuit et prêt à la vente</small>
                </div>
                <div class="form-group" id="custom-time-group" style="display: none;">
                    <label>Heure de mise en cuisson :</label>
                    <input type="time" id="cooking-start-time" value="${currentTime}" class="stock-input">
                    <small style="color: #666; font-size: 0.85rem;">Temps de cuisson : ${product.cookingTime || 90} minutes</small>
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-success" id="confirm-cooking">
                        <span class="btn-icon">✓</span> Confirmer
                    </button>
                    <button class="btn btn-secondary" id="cancel-cooking">
                        <span class="btn-icon">✕</span> Annuler
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const quantityInput = document.getElementById('cooking-quantity');
        const statusSelect = document.getElementById('cooking-status');
        const customTimeGroup = document.getElementById('custom-time-group');
        const cookingStatusChangeGroup = document.getElementById('cooking-status-change-group');
        const changeCookingStatusCheckbox = document.getElementById('change-cooking-status');
        const startTimeInput = document.getElementById('cooking-start-time');
        const confirmBtn = document.getElementById('confirm-cooking');
        const cancelBtn = document.getElementById('cancel-cooking');

        // Afficher/masquer les champs selon le statut
        statusSelect.addEventListener('change', () => {
            const status = statusSelect.value;
            customTimeGroup.style.display = status === 'custom-time' ? 'block' : 'none';
            // Afficher la checkbox uniquement pour "Déjà cuit"
            cookingStatusChangeGroup.style.display = status === 'already-cooked' ? 'block' : 'none';
        });

        setTimeout(() => quantityInput.focus(), 100);

        const cleanup = () => {
            document.body.removeChild(modal);
        };

        confirmBtn.addEventListener('click', () => {
            const quantity = parseInt(quantityInput.value) || 1;
            const status = statusSelect.value;

            if (status === 'already-cooked') {
                // Ajouter directement au stock
                this.stockManager.updateStock(productId, quantity);
                
                // Mettre à jour le statut de cuisson si la checkbox est cochée
                if (changeCookingStatusCheckbox.checked) {
                    const products = this.stockManager.getProducts();
                    const productToUpdate = products.find(p => p.id === productId);
                    if (productToUpdate) {
                        productToUpdate.cookingStatus = 'cooked';
                        this.stockManager.saveProducts();
                        this.showNotification(`${quantity} ${product.name} ajouté(s) au stock et marqué comme "Cuit"`, 'success');
                    }
                } else {
                    this.showNotification(`${quantity} ${product.name} ajouté(s) au stock`, 'success');
                }
                
                this.updateStockDisplay();
            } else if (status === 'start-now') {
                // Démarrer une cuisson maintenant
                const cookingTime = product.cookingTime || 90;
                const result = this.stockManager.startCookingBatch(productId, quantity, cookingTime);
                
                if (result.success) {
                    this.showNotification(`Cuisson de ${quantity} ${product.name} démarrée !`, 'success');
                    this.updateCookingBatchesDisplay();
                } else {
                    this.showNotification(result.message, 'error');
                }
            } else if (status === 'custom-time') {
                // Calculer le temps restant depuis l'heure de mise en cuisson
                const startTime = startTimeInput.value;
                if (!startTime) {
                    this.showNotification('Veuillez saisir une heure de mise en cuisson', 'error');
                    return;
                }

                const [hours, minutes] = startTime.split(':').map(Number);
                const startDate = new Date();
                startDate.setHours(hours, minutes, 0, 0);
                
                const now = new Date();
                const elapsedMinutes = Math.floor((now - startDate) / 60000);
                const cookingTime = product.cookingTime || 90;
                const remainingMinutes = cookingTime - elapsedMinutes;

                if (remainingMinutes <= 0) {
                    // La cuisson est déjà terminée, ajouter au stock
                    this.stockManager.updateStock(productId, quantity);
                    this.showNotification(`${quantity} ${product.name} ajouté(s) au stock (cuisson terminée)`, 'success');
                    this.updateStockDisplay();
                } else {
                    // Créer un lot avec le temps restant
                    const result = this.stockManager.startCookingBatch(productId, quantity, remainingMinutes, startDate.toISOString());
                    
                    if (result.success) {
                        this.showNotification(`Cuisson de ${quantity} ${product.name} enregistrée (${remainingMinutes} min restantes)`, 'success');
                        this.updateCookingBatchesDisplay();
                    } else {
                        this.showNotification(result.message, 'error');
                    }
                }
            }

            cleanup();
        });

        cancelBtn.addEventListener('click', cleanup);

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Afficher les lots de cuisson
    updateCookingBatchesDisplay() {
        const batches = this.stockManager.getActiveCookingBatches();
        const container = document.getElementById('cooking-batches-container');
        
        if (!container) return;

        if (batches.length === 0) {
            container.innerHTML = '<p class="no-data">Aucune cuisson en cours</p>';
            return;
        }

        // Vérifier et mettre à jour les statuts
        this.stockManager.checkCookingBatches();

        let html = '<div class="cooking-batches-grid">';

        batches.forEach(batch => {
            const now = new Date();
            const endTime = new Date(batch.endTime);
            const startTime = new Date(batch.startTime);
            const totalTime = endTime - startTime;
            const elapsed = now - startTime;
            const remaining = Math.max(0, endTime - now);
            
            const progress = Math.min(100, (elapsed / totalTime) * 100);
            const minutesRemaining = Math.ceil(remaining / 60000);
            
            const statusClass = batch.status === 'ready' ? 'ready' : 'cooking';
            const statusText = batch.status === 'ready' ? 'PRÊT !' : `${minutesRemaining} min restantes`;
            const statusIcon = batch.status === 'ready' ? '✅' : '⏱️';

            const endTimeStr = endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            html += `
                <div class="cooking-batch-card ${statusClass}">
                    <div class="batch-header">
                        <h4>${batch.productName}</h4>
                        <span class="batch-quantity">×${batch.quantity}</span>
                    </div>
                    <div class="batch-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">${Math.round(progress)}%</div>
                    </div>
                    <div class="batch-status ${statusClass}">
                        ${statusIcon} ${statusText}
                    </div>
                    <div class="batch-time">Prêt à: ${endTimeStr}</div>
                    <div class="batch-actions">
                        ${batch.status === 'ready' ? `
                            <button class="btn btn-success btn-small" onclick="ui.transferBatchToStock(${batch.id})">
                                📦 Transférer en stock
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-small" onclick="ui.cancelBatch(${batch.id})">
                            ❌ Annuler
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // Transférer un lot en stock
    transferBatchToStock(batchId) {
        const result = this.stockManager.transferBatchToStock(batchId);
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            this.updateCookingBatchesDisplay();
            this.updateStockDisplay();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    // Annuler un lot de cuisson
    cancelBatch(batchId) {
        if (confirm('Voulez-vous vraiment annuler cette cuisson ?')) {
            this.stockManager.cancelCookingBatch(batchId);
            this.showNotification('Cuisson annulée', 'info');
            this.updateCookingBatchesDisplay();
        }
    }

    // Démarrer le timer de mise à jour des cuissons
    startCookingTimer() {
        // Arrêter le timer existant s'il y en a un
        this.stopCookingTimer();
        
        // Mettre à jour toutes les 10 secondes
        this.cookingTimerInterval = setInterval(() => {
            const updated = this.stockManager.checkCookingBatches();
            this.updateCookingBatchesDisplay();
            
            // Notification sonore si un lot est prêt
            if (updated) {
                const readyBatches = this.stockManager.getActiveCookingBatches().filter(b => b.status === 'ready');
                if (readyBatches.length > 0) {
                    this.showNotification(`${readyBatches.length} cuisson(s) prête(s) !`, 'success');
                }
            }
        }, 10000); // 10 secondes
    }

    // Arrêter le timer de mise à jour des cuissons
    stopCookingTimer() {
        if (this.cookingTimerInterval) {
            clearInterval(this.cookingTimerInterval);
            this.cookingTimerInterval = null;
        }
    }

    // Confirmer les changements de stock
    confirmStockChanges() {
        if (!this.pendingStockChanges || Object.keys(this.pendingStockChanges).length === 0) {
            this.showNotification('Aucun changement à confirmer', 'info');
            return;
        }
        
        // Appliquer tous les changements
        for (const [productId, change] of Object.entries(this.pendingStockChanges)) {
            if (change !== 0) {
                const currentStock = this.stockManager.stock[productId] || 0;
                this.stockManager.stock[productId] = currentStock + change;
                
                // Ajouter à l'historique
                const type = change > 0 ? 'add' : 'remove';
                this.stockManager.addStockHistoryEntry(productId, Math.abs(change), type);
            }
        }
        
        this.stockManager.saveToStorage();
        this.pendingStockChanges = {};
        
        this.showNotification('Modifications du stock confirmées !', 'success');
        this.updateAllDisplays();
    }

    // Annuler les changements de stock
    cancelStockChanges() {
        if (!this.pendingStockChanges || Object.keys(this.pendingStockChanges).length === 0) {
            this.showNotification('Aucun changement à annuler', 'info');
            return;
        }
        
        this.pendingStockChanges = {};
        this.showNotification('Modifications annulées', 'info');
        this.updateStockDisplay();
    }

    // Mettre à jour la liste des commandes
    updateOrdersList(filter = 'all') {
        const orders = this.stockManager.getOrdersByStatus(filter);
        const counts = this.stockManager.getOrdersCount();
        const ordersList = document.getElementById('orders-list');
        const products = this.stockManager.getProducts();

        // Créer un map des produits pour récupérer les noms
        const productsMap = {};
        products.forEach(p => {
            productsMap[p.id] = p;
        });

        // Mettre à jour les compteurs
        document.getElementById('pending-count').textContent = counts.pending;
        document.getElementById('completed-count').textContent = counts.completed;
        document.getElementById('cancelled-count').textContent = counts.cancelled;

        if (orders.length === 0) {
            ordersList.innerHTML = '<p class="empty-message">Aucune commande</p>';
            return;
        }

        // Calculer les totaux par produit (uniquement pour les commandes "en attente")
        const productTotals = {};
        orders.forEach(order => {
            // Ne compter que les commandes en attente
            if (order.status === 'pending') {
                for (const [productId, qty] of Object.entries(order.items)) {
                    if (qty > 0) {
                        if (!productTotals[productId]) {
                            productTotals[productId] = 0;
                        }
                        productTotals[productId] += qty;
                    }
                }
            }
        });

        // Afficher le récapitulatif des totaux seulement s'il y a des commandes en attente
        let html = '';
        if (Object.keys(productTotals).length > 0) {
            html += '<div class="orders-summary"><h3>📊 Récapitulatif des produits en attente</h3><ul class="product-totals">';
            for (const [productId, total] of Object.entries(productTotals)) {
                const productName = productsMap[productId] ? productsMap[productId].name : productId;
                html += `<li><strong>${productName}:</strong> ${total}</li>`;
            }
            html += '</ul></div><hr style="margin: 20px 0; border: 1px solid #e0e0e0;">';
        }

        // Afficher les commandes
        orders.forEach(order => {
            const date = new Date(order.date);
            const dateStr = date.toLocaleDateString('fr-FR');
            const timeStr = date.toLocaleTimeString('fr-FR');
            const customerName = order.customerName || 'Client anonyme';
            
            // Déterminer la classe de statut
            let statusClass = '';
            let statusText = '';
            switch(order.status) {
                case 'pending':
                    statusClass = 'status-pending';
                    statusText = 'En attente';
                    break;
                case 'completed':
                    statusClass = 'status-completed';
                    statusText = 'Traitée';
                    break;
                case 'cancelled':
                    statusClass = 'status-cancelled';
                    statusText = 'Annulée';
                    break;
            }

            html += `
                <div class="order-card ${statusClass}">
                    <div class="order-header">
                        <div class="order-info">
                            <span class="order-id">#${order.id}</span>
                            <span class="order-customer">${customerName}</span>
                            <span class="order-date">${dateStr} à ${timeStr}</span>
                        </div>
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-body">
                        <div class="order-items">
                            <h4>Produits:</h4>
                            <ul>
            `;

            // Afficher dynamiquement tous les produits de la commande
            for (const [productId, qty] of Object.entries(order.items)) {
                if (qty > 0) {
                    const productName = productsMap[productId] ? productsMap[productId].name : productId;
                    html += `<li>${productName}: ${qty}</li>`;
                }
            }

            html += `</ul></div>`;

            if (order.financial) {
                html += `
                    <div class="order-financial">
                        <p><strong>Montant:</strong> ${order.financial.revenue.toFixed(2)} €</p>
                    </div>
                `;
            }

            html += `
                    </div>
                    <div class="order-actions">
            `;

            if (order.status === 'pending') {
                html += `
                    <button class="btn btn-success btn-sm" onclick="ui.changeOrderStatus(${order.id}, 'completed')">
                        ✓ Marquer comme traitée
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="ui.changeOrderStatus(${order.id}, 'cancelled')">
                        ✗ Annuler
                    </button>
                `;
            } else if (order.status === 'completed') {
                html += `
                    <button class="btn btn-secondary btn-sm" onclick="ui.changeOrderStatus(${order.id}, 'pending')">
                        ↺ Remettre en attente
                    </button>
                `;
            } else if (order.status === 'cancelled') {
                html += `
                    <button class="btn btn-secondary btn-sm" onclick="ui.changeOrderStatus(${order.id}, 'pending')">
                        ↺ Remettre en attente
                    </button>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        });

        ordersList.innerHTML = html;
    }

    // Filtrer les commandes
    filterOrders(filter) {
        // Mettre à jour les boutons actifs
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        this.updateOrdersList(filter);
    }

    // Changer le statut d'une commande
    changeOrderStatus(orderId, newStatus) {
        if (this.stockManager.updateOrderStatus(orderId, newStatus)) {
            this.showNotification('Statut de la commande mis à jour', 'success');
            // Récupérer le filtre actif
            const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
            this.updateOrdersList(activeFilter);
            this.updateHistoryDisplay(); // Mettre à jour aussi l'historique
        } else {
            this.showNotification('Erreur lors de la mise à jour', 'error');
        }
    }

    // Rechercher des commandes par nom de client
    searchOrders(searchTerm) {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        let orders = this.stockManager.getOrdersByStatus(activeFilter);
        
        // Filtrer par nom de client si un terme de recherche est fourni
        if (searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase();
            orders = orders.filter(order => {
                const customerName = (order.customerName || 'client anonyme').toLowerCase();
                return customerName.includes(searchLower);
            });
        }
        
        // Afficher les résultats
        const ordersList = document.getElementById('orders-list');
        const counts = this.stockManager.getOrdersCount();
        
        // Mettre à jour les compteurs
        document.getElementById('pending-count').textContent = counts.pending;
        document.getElementById('completed-count').textContent = counts.completed;
        document.getElementById('cancelled-count').textContent = counts.cancelled;
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<p class="empty-message">Aucune commande trouvée</p>';
            return;
        }
        
        // Générer le HTML des commandes filtrées
        let html = '';
        orders.forEach(order => {
            const date = new Date(order.date);
            const dateStr = date.toLocaleDateString('fr-FR');
            const timeStr = date.toLocaleTimeString('fr-FR');
            const customerName = order.customerName || 'Client anonyme';
            
            // Déterminer la classe de statut
            let statusClass = '';
            let statusText = '';
            switch(order.status) {
                case 'pending':
                    statusClass = 'status-pending';
                    statusText = 'En attente';
                    break;
                case 'completed':
                    statusClass = 'status-completed';
                    statusText = 'Traitée';
                    break;
                case 'cancelled':
                    statusClass = 'status-cancelled';
                    statusText = 'Annulée';
                    break;
            }

            html += `
                <div class="order-card ${statusClass}">
                    <div class="order-header">
                        <div class="order-info">
                            <span class="order-id">#${order.id}</span>
                            <span class="order-customer">${customerName}</span>
                            <span class="order-date">${dateStr} à ${timeStr}</span>
                        </div>
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-body">
                        <div class="order-items">
                            <h4>Produits:</h4>
                            <ul>
            `;

            if (order.items.pouletEntier > 0) html += `<li>Poulet entier: ${order.items.pouletEntier}</li>`;
            if (order.items.demiPoulet > 0) html += `<li>Demi-poulet: ${order.items.demiPoulet}</li>`;
            if (order.items.quartPoulet > 0) html += `<li>Quart de poulet: ${order.items.quartPoulet}</li>`;
            if (order.items.jambonEntier > 0) html += `<li>Jambon entier: ${order.items.jambonEntier}</li>`;
            if (order.items.demiJambon > 0) html += `<li>Demi-jambon: ${order.items.demiJambon}</li>`;

            html += `</ul></div>`;

            if (order.financial) {
                html += `
                    <div class="order-financial">
                        <p><strong>Montant:</strong> ${order.financial.revenue.toFixed(2)} €</p>
                    </div>
                `;
            }

            html += `
                    </div>
                    <div class="order-actions">
            `;

            if (order.status === 'pending') {
                html += `
                    <button class="btn btn-success btn-sm" onclick="ui.changeOrderStatus(${order.id}, 'completed')">
                        ✓ Marquer comme traitée
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="ui.changeOrderStatus(${order.id}, 'cancelled')">
                        ✗ Annuler
                    </button>
                `;
            } else if (order.status === 'completed') {
                html += `
                    <button class="btn btn-secondary btn-sm" onclick="ui.changeOrderStatus(${order.id}, 'pending')">
                        ↺ Remettre en attente
                    </button>
                `;
            } else if (order.status === 'cancelled') {
                html += `
                    <button class="btn btn-secondary btn-sm" onclick="ui.changeOrderStatus(${order.id}, 'pending')">
                        ↺ Remettre en attente
                    </button>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        });

        ordersList.innerHTML = html;
    }

    // Mettre à jour l'affichage de l'historique
    updateHistoryDisplay() {
        const history = this.stockManager.getHistory();
        const stats = this.stockManager.getStats();
        const historyList = document.getElementById('history-list');

        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('today-orders').textContent = stats.todayOrders;
        document.getElementById('total-revenue').textContent = stats.totalRevenue.toFixed(2) + ' €';
        document.getElementById('today-revenue').textContent = stats.todayRevenue.toFixed(2) + ' €';
        document.getElementById('total-profit').textContent = stats.totalProfit.toFixed(2) + ' €';
        document.getElementById('today-profit').textContent = stats.todayProfit.toFixed(2) + ' €';

        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-message">Aucune commande enregistrée</p>';
            return;
        }

        const products = this.stockManager.getProducts();
        const productsMap = {};
        products.forEach(p => {
            productsMap[p.id] = p;
        });

        // Calculer les totaux par produit (uniquement pour les commandes traitées)
        const productTotals = {};
        history.forEach(order => {
            // Ne compter que les commandes traitées
            if (order.status === 'completed') {
                for (const [productId, qty] of Object.entries(order.items)) {
                    if (qty > 0) {
                        if (!productTotals[productId]) {
                            productTotals[productId] = 0;
                        }
                        productTotals[productId] += qty;
                    }
                }
            }
        });

        // Afficher le récapitulatif des totaux des ventes
        let html = '';
        if (Object.keys(productTotals).length > 0) {
            html += '<div class="orders-summary"><h3>📊 Récapitulatif des ventes (commandes traitées)</h3><ul class="product-totals">';
            for (const [productId, total] of Object.entries(productTotals)) {
                const productName = productsMap[productId] ? productsMap[productId].name : productId;
                html += `<li><strong>${productName}:</strong> ${total}</li>`;
            }
            html += '</ul></div><hr style="margin: 20px 0; border: 1px solid #e0e0e0;">';
        }

        history.forEach(order => {
            const date = new Date(order.date);
            const dateStr = date.toLocaleDateString('fr-FR');
            const timeStr = date.toLocaleTimeString('fr-FR');

            const customerName = order.customerName ? `<span class="customer-name">Client: ${order.customerName}</span>` : '';
            
            html += `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-date">${dateStr} à ${timeStr}</span>
                        ${customerName}
                        <span class="history-id">#${order.id}</span>
                    </div>
                    <div class="history-details">
                        <h4>Produits vendus:</h4>
                        <ul>
            `;

            // Afficher dynamiquement tous les produits de la commande
            for (const [productId, qty] of Object.entries(order.items)) {
                if (qty > 0) {
                    const productName = productsMap[productId] ? productsMap[productId].name : productId;
                    html += `<li>${productName}: ${qty}</li>`;
                }
            }

            html += `</ul>`;

            // Afficher les informations financières si disponibles
            if (order.financial) {
                html += `
                    <div class="financial-info">
                        <p><strong>Montant:</strong> ${order.financial.revenue.toFixed(2)} €</p>
                        <p><strong>Coût:</strong> ${order.financial.cost.toFixed(2)} €</p>
                        <p><strong>Marge:</strong> ${order.financial.profit.toFixed(2)} €</p>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        });

        historyList.innerHTML = html;
    }

    // Effacer l'historique
    clearHistory() {
        if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
            this.stockManager.clearHistory();
            this.showNotification('Historique effacé', 'success');
            this.updateHistoryDisplay();
        }
    }

    // Exporter l'historique en CSV
    exportHistory() {
        const history = this.stockManager.getHistory();
        const products = this.stockManager.getProducts();
        
        if (history.length === 0) {
            this.showNotification('Aucune donnée à exporter', 'error');
            return;
        }

        // Créer un map des produits pour récupérer les noms
        const productsMap = {};
        products.forEach(p => {
            productsMap[p.id] = p.name;
        });

        // Récupérer tous les IDs de produits uniques dans l'historique
        const allProductIds = new Set();
        history.forEach(order => {
            Object.keys(order.items).forEach(id => allProductIds.add(id));
        });
        const productIds = Array.from(allProductIds);

        // Créer l'en-tête CSV
        let csv = 'Date,Heure,Client';
        productIds.forEach(id => {
            const name = productsMap[id] || id;
            csv += `,${name}`;
        });
        csv += ',Montant,Coût,Marge\n';

        // Ajouter les données
        history.forEach(order => {
            const date = new Date(order.date);
            const dateStr = date.toLocaleDateString('fr-FR');
            const timeStr = date.toLocaleTimeString('fr-FR');
            const customerName = order.customerName || '';
            const revenue = order.financial ? order.financial.revenue.toFixed(2) : '0';
            const cost = order.financial ? order.financial.cost.toFixed(2) : '0';
            const profit = order.financial ? order.financial.profit.toFixed(2) : '0';

            csv += `${dateStr},${timeStr},"${customerName}"`;
            
            // Ajouter les quantités pour chaque produit
            productIds.forEach(id => {
                const qty = order.items[id] || 0;
                csv += `,${qty}`;
            });
            
            csv += `,${revenue},${cost},${profit}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `historique_rotisserie_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification('Historique exporté avec succès', 'success');
    }

    // ============================================
    // GESTION DES PRODUITS
    // ============================================

    // Afficher la liste des produits
    updateProductsList() {
        try {
            console.log('updateProductsList called');
            const products = this.stockManager.getProducts();
            console.log('Products retrieved:', products);
            
            const productsList = document.getElementById('products-list');
            
            if (!productsList) {
                console.error('Element products-list not found');
                return;
            }
            
            console.log('Updating products list with', products.length, 'products');
            
            if (products.length === 0) {
                productsList.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Aucun produit disponible</p>';
                return;
            }
            
            let html = '';
            
            products.forEach(product => {
                const margin = product.price - product.cost;
                const marginClass = margin >= 0 ? 'profit-positive' : 'profit-negative';
                
                // Afficher l'image ou l'emoji
                const imageDisplay = product.image
                    ? `<img src="${product.image}" alt="${product.name}" class="product-item-image">`
                    : `<span class="product-item-icon">${product.icon}</span>`;
                
                html += `
                    <div class="product-item-card">
                        <div class="product-item-header">
                            ${imageDisplay}
                            <h3>${product.name}</h3>
                        </div>
                        <div class="product-item-details">
                            <p><strong>Prix d'achat:</strong> ${product.cost.toFixed(2)} €</p>
                            <p><strong>Prix de vente entier:</strong> ${product.price.toFixed(2)} €</p>
                            ${product.halfAvailable ? `<p><strong>Prix de vente demi:</strong> ${product.halfPrice.toFixed(2)} €</p>` : ''}
                            <p><strong>Vendable en moitié:</strong> ${product.halfAvailable ? '✅ Oui' : '❌ Non'}</p>
                            <p><strong>Marge:</strong> <span class="${marginClass}">${margin.toFixed(2)} €</span></p>
                        </div>
                        <div class="product-item-actions">
                            <button class="btn-edit" onclick="ui.editProduct('${product.id}')">
                                ✏️ Modifier
                            </button>
                            <button class="btn-delete" onclick="ui.confirmDeleteProduct('${product.id}')">
                                🗑️ Supprimer
                            </button>
                        </div>
                    </div>
                `;
            });
            
            productsList.innerHTML = html;
            console.log('Products list updated successfully');
        } catch (error) {
            console.error('Error in updateProductsList:', error);
        }
    }

    // Ajouter un nouveau produit
    async addNewProduct() {
        const name = document.getElementById('product-name').value.trim();
        const imageFile = document.getElementById('product-image').files[0];
        const cost = parseFloat(document.getElementById('product-cost').value) || 0;
        const price = parseFloat(document.getElementById('product-price').value) || 0;
        const halfAvailable = document.getElementById('product-half-available').checked;
        const halfPrice = halfAvailable ? (parseFloat(document.getElementById('product-half-price').value) || 0) : 0;
        const cookingStatus = document.getElementById('product-cooking-status').value;
        const cookingTime = cookingStatus === 'to-cook' ? (parseInt(document.getElementById('product-cooking-time').value) || 90) : 90;

        if (!name) {
            this.showNotification('Veuillez entrer un nom de produit', 'error');
            return;
        }

        try {
            let imageData = null;
            
            // Si une image est uploadée, la convertir en base64
            if (imageFile) {
                imageData = await this.readFileAsDataURL(imageFile);
            }

            const newProduct = this.stockManager.addProduct({
                name,
                image: imageData,
                icon: '🍗', // Emoji par défaut
                halfAvailable,
                cost,
                price,
                halfPrice,
                cookingStatus,
                cookingTime
            });

            this.showNotification(`Produit "${name}" ajouté avec succès`, 'success');
            
            // Réinitialiser le formulaire
            document.getElementById('add-product-form').reset();
            document.getElementById('half-price-group').style.display = 'none';
            document.getElementById('cooking-time-group').style.display = 'none';
            
            // Forcer le rafraîchissement immédiat de la liste des produits
            setTimeout(() => {
                this.updateProductsList();
                this.updateAllDisplays();
            }, 100);
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    // Lire un fichier comme Data URL (base64)
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    // Modifier un produit
    editProduct(productId) {
        const products = this.stockManager.getProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            this.showNotification('Produit non trouvé', 'error');
            return;
        }

        // Créer un formulaire de modification dans une modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Modifier le produit</h2>
                <form id="edit-product-form" class="product-form">
                    <input type="text" id="edit-product-name" value="${product.name}" placeholder="Nom du produit" required>
                    <input type="text" id="edit-product-icon" value="${product.icon}" placeholder="Icône" maxlength="2">
                    <select id="edit-product-category">
                        <option value="poulet" ${product.category === 'poulet' ? 'selected' : ''}>🍗 Poulet</option>
                        <option value="jambon" ${product.category === 'jambon' ? 'selected' : ''}>🥓 Jambon</option>
                        <option value="autre" ${product.category === 'autre' ? 'selected' : ''}>🍽️ Autre</option>
                    </select>
                    <select id="edit-product-unit">
                        <option value="piece" ${product.unit === 'piece' ? 'selected' : ''}>Pièce</option>
                        <option value="kg" ${product.unit === 'kg' ? 'selected' : ''}>Kg</option>
                        <option value="portion" ${product.unit === 'portion' ? 'selected' : ''}>Portion</option>
                    </select>
                    <input type="number" id="edit-product-cost" value="${product.cost}" placeholder="Prix d'achat" step="0.01" min="0">
                    <input type="number" id="edit-product-price" value="${product.price}" placeholder="Prix de vente" step="0.01" min="0">
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">💾 Enregistrer</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">❌ Annuler</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Gérer la soumission du formulaire
        document.getElementById('edit-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const updates = {
                name: document.getElementById('edit-product-name').value.trim(),
                icon: document.getElementById('edit-product-icon').value.trim(),
                category: document.getElementById('edit-product-category').value,
                unit: document.getElementById('edit-product-unit').value,
                cost: parseFloat(document.getElementById('edit-product-cost').value),
                price: parseFloat(document.getElementById('edit-product-price').value)
            };

            try {
                this.stockManager.updateProduct(productId, updates);
                this.showNotification('Produit modifié avec succès', 'success');
                modal.remove();
                this.updateProductsList();
                this.updateAllDisplays();
            } catch (error) {
                this.showNotification(error.message, 'error');
            }
        });
    }

    // Confirmer la suppression d'un produit
    confirmDeleteProduct(productId) {
        const products = this.stockManager.getProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            this.showNotification('Produit non trouvé', 'error');
            return;
        }

        if (confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?\n\nCette action est irréversible et supprimera également le stock associé.`)) {
            try {
                this.stockManager.deleteProduct(productId);
                this.showNotification(`Produit "${product.name}" supprimé`, 'success');
                this.updateProductsList();
                this.updateAllDisplays();
            } catch (error) {
                this.showNotification(error.message, 'error');
            }
        }
    }

    // Afficher une notification
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// ============================================
// INITIALISATION DE L'APPLICATION
// ============================================

// Variable globale pour accéder à l'UI depuis les boutons inline
let ui;

document.addEventListener('DOMContentLoaded', () => {
    const stockManager = new StockManager();
    ui = new UI(stockManager);
    
    console.log('Application de gestion de rôtisserie initialisée');
});

// Made with Bob
