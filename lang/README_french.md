# Bot Discord de Gestion des Tickets Sentinel

## Introduction
Il s'agit d'un bot de ticket qui vise à fournir une solution gratuite et open source pour gérer les tickets sur Discord. Le bot est conçu pour être léger, sans filigranes ni bloatware inutile. Il permet aux utilisateurs de créer, suivre et gérer des tickets de manière transparente.

## Prérequis
- Testé sur la dernière version de Node.js v18

## Table des matières
- [🛠️ Installation](#installation)
- [🔄 Mise à jour](#mise-à-jour)
- [✨ Fonctionnalités](#fonctionnalités)
- [📚 Documentation](#documentation)
- [🐛 Signalement de bugs](#signalement-de-bugs)
- [📃 Licence](#licence)

## Installation
1. Installez Node.js si ce n'est pas déjà fait (v18 recommandée) : [Guide d'installation de Node.js](https://nodejs.org/fr/download/)
2. Clonez le dépôt : `git clone https://github.com/ralphkb/sentinel-tickets.git` ou téléchargez la dernière version : https://github.com/ralphkb/sentinel-tickets/releases
3. Accédez au répertoire du projet, par exemple : `cd ticket-bot-project` ou le répertoire où vous avez téléchargé les fichiers de la version.
4. Exécutez `npm install` pour installer les dépendances.
5. Renommez .env.example en .env et config.yml.example en config.yml.
6. Ouvrez le fichier .env et remplissez-le avec le jeton de votre bot, l'ID de la guilde et l'ID du client.
7. Ouvrez config.yml pour configurer les paramètres et les messages selon vos préférences, assurez-vous de configurer correctement les catégories de tickets.
8. Lancez le bot : `npm start`

## Mise à jour
1. Faites une sauvegarde de votre répertoire de bot actuel en cas de problèmes afin d'avoir la possibilité de revenir en arrière.
2. Assurez-vous de ne pas supprimer votre répertoire `data` sinon vous pourriez rencontrer des problèmes avec des tickets que vous n'avez pas encore supprimés.
3. Téléchargez la nouvelle version/les nouveaux fichiers et remplacez les fichiers actuels par ceux que vous avez téléchargés.
4. Si vous avez déjà suivi le processus d'installation, vous pouvez utiliser le dernier `config.yml.example` que vous avez téléchargé pour ajouter manuellement de nouvelles options de configuration à votre `config.yml`.
5. Si des dépendances ont été mises à jour, vous devrez supprimer votre répertoire `node_modules` et exécuter `npm install` à nouveau après avoir téléchargé les nouveaux fichiers.
6. Démarrez le bot mis à jour en utilisant `npm start`

## Fonctionnalités

- Jusqu'à 25 catégories : Organisez les demandes de support dans différentes catégories.
- Panneau de ticket intuitif : Créez et gérez les tickets facilement à l'aide de boutons ou d'un menu déroulant.
- Questions modales : Rassemblez les informations nécessaires avant d'ouvrir un ticket.
- Configuration pour personnaliser de nombreux messages et options.
- Option pour configurer les rôles de support par catégorie de ticket.
- Option pour exiger un ou plusieurs rôles pour créer un ticket par catégorie de ticket.
- Option pour mentionner les rôles de support à la création d'un ticket par catégorie de ticket.
- Fonctionnalité d'heures de travail avec une option pour spécifier le fuseau horaire et bloquer la création de tickets en dehors des heures de travail.
- Option pour configurer le nombre maximum de tickets ouverts à la fois.
- Fonctionnalité de réclamation de tickets activable/désactivable.
- Sauvegarde automatique des transcriptions lors de la suppression d'un ticket et suppression forcée.
- Option pour sauvegarder manuellement une transcription avec des images téléchargées, utilisez avec précaution car cela augmente la taille de la transcription.
- Option pour envoyer un DM aux utilisateurs lors de la suppression d'un ticket avec leur transcription et un embed contenant des informations utiles.
- Système de notation/retour d'information configurable avec des journaux des réponses.
- Option pour sélectionner le type de transcription, peut être HTML ou TXT cependant HTML est recommandé.
- Journaux de tickets pour plusieurs événements de ticket, tels que la création, la fermeture, la suppression, la suppression forcée, la réouverture, la réclamation, la désappropriation, etc.
- Journaux précis et organisés des erreurs et de tous les événements de ticket dans un fichier logs.txt.
- Option pour modifier l'activité du bot.
- Plusieurs commandes : Gérez efficacement les tickets avec différentes commandes.
    - Envoyer le panneau de tickets dans n'importe quel canal
    - Ajouter des utilisateurs ou des rôles à un ticket
    - Supprimer des utilisateurs ou des rôles d'un ticket
    - Renommer un canal de ticket
    - Alerte Créateur de Ticket
    - Fermer un ticket pour les archiver jusqu'à leur suppression
    - Supprimer des tickets
    - Réouvrir des tickets
    - Mettre sur liste noire des utilisateurs ou des rôles
    - Sauvegarder les transcriptions
    - Réclamer/Annuler la réclamation des tickets
    - Déplacer les tickets vers une autre catégorie
    - Épingler les tickets dans une catégorie
    - Ajouter un slowmode personnalisé à un ticket
    - Transférer la propriété du ticket à un autre utilisateur
    - Ajouter une priorité à un ticket
- Statistiques utiles telles que :
    - Total des tickets
    - Total des tickets ouverts
    - Total des tickets réclamés
    - Total des avis
    - Note moyenne

## Documentation
Le wiki sera amélioré au fil du temps et peut être consulté ici : https://github.com/ralphkb/sentinel-tickets/wiki

## Signalement de bugs
- Pour les rapports de bugs, ouvrez un problème [ici](https://github.com/ralphkb/sentinel-tickets/issues).  
Ceci est un projet gratuit sur lequel j'aime travailler pendant mon temps libre, je ne peux pas garantir un support mais je ferai de mon mieux pour corriger les bugs, résoudre les problèmes et ajouter de nouvelles fonctionnalités ! Je suis toujours en train d'apprendre et de m'améliorer, merci pour votre compréhension