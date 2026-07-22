# AllieFlix 🎬

Application web privée de bibliothèque et de sélection de films pour Kathie et Alyssia.

## Structure

```text
allieflix/
├── public/
│   ├── css/styles.css        # Styles de l’application
│   ├── js/app.js             # Logique métier et interface
│   ├── js/config.js          # Configuration des services côté client
│   ├── js/firebase.js        # Initialisation Firebase / Firestore
│   ├── index.html            # Structure principale
│   ├── 404.html              # Page introuvable
│   ├── icon-512.png
│   └── manifest.json
├── .firebaserc               # Projet Firebase utilisé
├── firebase.json             # Configuration Firebase Hosting
└── .gitignore
```

## Données existantes

Le déploiement du dossier `public/` ne supprime pas les films, notes, commentaires ou historiques présents dans Firestore. L’application reste connectée au projet Firebase `films-allie`.

## Tester localement

Avec Firebase CLI installé :

```bash
firebase emulators:start --only hosting
```

Ou avec un petit serveur statique local. Il ne faut pas ouvrir `index.html` directement en `file://`, car les modules JavaScript utilisent des imports ES.

## Déployer sur Firebase Hosting

```bash
firebase deploy --only hosting
```

## GitHub

Le dépôt peut contenir directement tous les fichiers à la racine de ce dossier. Le cache local `.firebase/` a volontairement été retiré du projet.

Pour automatiser plus tard la mise en ligne à chaque modification sur GitHub, utiliser l’intégration officielle Firebase Hosting + GitHub depuis la Firebase CLI.

## Sécurité

La configuration Firebase Web est visible côté navigateur par nature. La protection des données dépend donc des règles Firestore et, si l’application devient accessible publiquement, d’un système d’authentification adapté.
