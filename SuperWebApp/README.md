# 🍗 Application de Gestion de Rôtisserie

Application web one-page pour gérer les commandes, les stocks, les prix et l'historique des ventes d'une rôtisserie.

## 📋 Fonctionnalités

### 1. Gestion des Commandes
- Interface intuitive pour prendre les commandes rapidement
- **Champ nom du client** pour identifier chaque commande (optionnel)
- Sélection des produits avec affichage du stock disponible en temps réel
- **Calcul automatique du montant** de la commande
- Validation automatique de la disponibilité du stock
- Déduction automatique du stock après chaque vente
- Résumé de la commande avant validation avec montant total

### 2. Gestion des Stocks
- Stock basé sur les unités de base (poulets entiers et jambons entiers)
- Conversion automatique en portions :
  - 1 poulet entier = 2 demi-poulets = 4 quarts de poulet
  - 1 jambon entier = 2 demi-jambons
- Affichage du nombre de portions disponibles pour chaque produit
- Deux modes de gestion :
  - **Ajouter au stock** : Ajoute des unités au stock existant
  - **Définir le stock** : Remplace complètement le stock actuel
- Alertes visuelles en cas de stock faible (clignotement rouge)

### 3. Gestion des Prix
- **Configuration des prix d'achat** (coût des unités de base)
  - Prix d'achat poulet entier
  - Prix d'achat jambon entier
- **Configuration des prix de vente** pour chaque produit
  - Poulet entier, demi-poulet, quart de poulet
  - Jambon entier, demi-jambon
- **Calcul automatique des marges bénéficiaires** par produit
  - Affichage du profit en euros et en pourcentage
  - Mise à jour en temps réel lors de la modification des prix
- Sauvegarde des prix dans le navigateur

### 4. Historique des Ventes et Statistiques
- Liste chronologique de toutes les commandes avec nom du client
- Affichage de la date et l'heure de chaque vente
- Détail des produits vendus
- **Informations financières par commande** :
  - Montant de la vente
  - Coût des produits
  - Marge bénéficiaire
- Suivi du stock avant et après chaque vente
- **Statistiques complètes** :
  - Nombre total de commandes et commandes du jour
  - **Chiffre d'affaires total et du jour**
  - **Marge bénéficiaire totale et du jour**
- Export de l'historique au format CSV (avec données financières)
- Possibilité d'effacer l'historique

## 🚀 Installation et Utilisation

### Installation
1. Téléchargez les 3 fichiers :
   - `index.html`
   - `app.js`
   - `styles.css`

2. Placez-les dans le même dossier

3. Ouvrez le fichier `index.html` dans votre navigateur web

**C'est tout !** Aucune installation supplémentaire n'est nécessaire.

### Première Utilisation

1. **Définir le stock initial**
   - Cliquez sur l'onglet "📦 Stocks"
   - Dans la section "Définir le Stock", entrez vos quantités
   - Cliquez sur "Définir le stock"

2. **Configurer les prix** (recommandé avant la première vente)
   - Cliquez sur l'onglet "💰 Prix"
   - Entrez les prix d'achat (coût) des unités de base
   - Entrez les prix de vente pour chaque produit
   - Vérifiez les marges calculées automatiquement
   - Cliquez sur "Enregistrer les prix"

3. **Prendre une commande**
   - Cliquez sur l'onglet "📝 Commandes"
   - Entrez le nom du client (optionnel)
   - Sélectionnez les quantités de chaque produit
   - Vérifiez le résumé de la commande avec le montant
   - Cliquez sur "Valider la commande"

4. **Consulter l'historique et les statistiques**
   - Cliquez sur l'onglet "📊 Historique"
   - Consultez le chiffre d'affaires et les marges
   - Consultez toutes vos ventes passées avec détails financiers
   - Exportez les données si nécessaire

## 📱 Compatibilité

- ✅ Fonctionne sur ordinateur, tablette et smartphone
- ✅ Compatible avec tous les navigateurs modernes (Chrome, Firefox, Safari, Edge)
- ✅ Pas besoin de connexion internet après le premier chargement
- ✅ Les données sont sauvegardées automatiquement dans votre navigateur

## 💾 Sauvegarde des Données

Les données sont automatiquement sauvegardées dans le navigateur (localStorage) :
- Stock actuel
- Historique complet des commandes

**Important** : Les données sont liées au navigateur utilisé. Si vous changez de navigateur ou d'ordinateur, les données ne seront pas transférées automatiquement.

### Sauvegarde manuelle
Pour sauvegarder vos données :
1. Allez dans l'onglet "📊 Historique"
2. Cliquez sur "Exporter (CSV)"
3. Le fichier sera téléchargé sur votre ordinateur

## 🎯 Produits Disponibles

### Poulet
- **Poulet entier** : Consomme 1 poulet du stock
- **Demi-poulet** : Consomme 0.5 poulet du stock
- **Quart de poulet** : Consomme 0.25 poulet du stock

### Jambon
- **Jambon entier** : Consomme 1 jambon du stock
- **Demi-jambon** : Consomme 0.5 jambon du stock

## 🔔 Alertes et Notifications

### Alertes de Stock Faible
- Le stock clignote en rouge quand :
  - Poulets < 5 unités
  - Jambons < 3 unités

### Notifications
- ✅ Confirmation de commande validée (avec montant)
- ⚠️ Alerte de stock insuffisant
- ✅ Confirmation de mise à jour du stock
- ✅ Confirmation d'enregistrement des prix
- ✅ Confirmation d'export de données

### Calculs Automatiques
- **Marges bénéficiaires** : Calculées en temps réel selon les prix configurés
- **Chiffre d'affaires** : Somme de toutes les ventes
- **Profit total** : Différence entre le CA et les coûts

## 📊 Exemple d'Utilisation Quotidienne

### Configuration initiale (une seule fois)
1. Ouvrir l'application
2. Aller dans "💰 Prix"
3. Configurer tous les prix d'achat et de vente
4. Enregistrer

### Début de journée
1. Ouvrir l'application
2. Aller dans "📦 Stocks"
3. Ajouter le stock du jour (ex: +20 poulets, +10 jambons)

### Pendant la journée
1. Rester sur l'onglet "📝 Commandes"
2. Pour chaque client :
   - Entrer le nom du client (optionnel)
   - Sélectionner les produits
   - Vérifier le montant
   - Valider la commande
   - Le stock et les statistiques se mettent à jour automatiquement

### Fin de journée
1. Consulter l'onglet "📊 Historique"
2. Vérifier le chiffre d'affaires du jour
3. Vérifier la marge bénéficiaire du jour
4. Vérifier le nombre de commandes du jour
5. Exporter les données si nécessaire
6. Vérifier le stock restant dans "📦 Stocks"

## 🛠️ Dépannage

### Les données ont disparu
- Vérifiez que vous utilisez le même navigateur
- Assurez-vous de ne pas avoir effacé les données du navigateur
- Vérifiez que vous n'êtes pas en mode navigation privée

### L'application ne fonctionne pas
- Vérifiez que les 3 fichiers sont dans le même dossier
- Essayez de rafraîchir la page (F5)
- Essayez un autre navigateur
- Vérifiez la console du navigateur (F12) pour les erreurs

### Le stock ne se met pas à jour
- Rafraîchissez la page
- Vérifiez que vous avez bien cliqué sur "Valider la commande"
- Vérifiez que le stock était suffisant

## 📝 Notes Techniques

### Technologies utilisées
- HTML5
- CSS3 (avec variables CSS et animations)
- JavaScript vanilla (pas de framework)
- localStorage pour la persistance des données

### Structure des fichiers
```
rotisserie/
├── index.html    (Structure de l'application)
├── app.js        (Logique métier et interactions)
└── styles.css    (Design et mise en page)
```

### Stockage des données
Les données sont stockées au format JSON dans localStorage sous la clé `rotisserie_data` :
```json
{
  "poulets": 25.5,
  "jambons": 12.0,
  "prices": {
    "cost": {
      "poulet": 5.50,
      "jambon": 8.00
    },
    "sell": {
      "pouletEntier": 12.00,
      "demiPoulet": 6.50,
      "quartPoulet": 3.50,
      "jambonEntier": 15.00,
      "demiJambon": 8.00
    }
  },
  "history": [...]
}
```

## 🔒 Sécurité et Confidentialité

- ✅ Toutes les données restent sur votre ordinateur
- ✅ Aucune donnée n'est envoyée sur internet
- ✅ Pas de compte utilisateur nécessaire
- ✅ Pas de collecte de données personnelles

## 📞 Support

Pour toute question ou problème :
1. Consultez d'abord la section "Dépannage"
2. Vérifiez que vous utilisez la dernière version des fichiers
3. Testez dans un autre navigateur

## 🎨 Personnalisation

Vous pouvez personnaliser l'apparence en modifiant le fichier `styles.css` :
- Couleurs : Variables CSS au début du fichier
- Tailles : Modifiez les valeurs de padding, margin, font-size
- Disposition : Modifiez les propriétés grid et flex

## 📄 Licence

Cette application est fournie telle quelle, sans garantie. Vous êtes libre de l'utiliser et de la modifier selon vos besoins.

---

**Version** : 1.0.0  
**Dernière mise à jour** : Mai 2026