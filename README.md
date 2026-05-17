# Will'Paint - Application locale de devis peinture

Will'Paint est une application locale simple pour créer des devis de peinture sur PC ou téléphone.
Elle fonctionne avec des fichiers HTML, CSS et JavaScript, sans installation complexe.

## Lancer l'application sur PC

Méthode la plus simple :

1. Ouvrir le dossier `C:\Users\sylva\Documents\Appli peinture`.
2. Double-cliquer sur `lancer-application.bat`.
3. Le navigateur s'ouvre avec l'application Will'Paint.

Autre méthode :

1. Ouvrir le dossier `C:\Users\sylva\Documents\Appli peinture`.
2. Double-cliquer sur `index.html`.

## Informations entreprise

Les informations Will'Paint sont enregistrées dans `Paramètres entreprise` et réutilisées automatiquement sur tous les devis :

- Will'Paint
- willpaint@outlook.fr
- 06 50 80 80 83
- 6 rue des Pautes, 38430 Moirans
- SIRET : 10338965600010

Un logo pourra être ajouté depuis la page `Paramètres entreprise`.

## Créer un devis

1. Aller dans l'onglet `Devis`.
2. Remplir les informations client et chantier.
3. Vérifier les prestations.
4. Utiliser `Ajouter ligne` pour une prestation chiffrée.
5. Utiliser `Ajouter texte libre` pour une remarque, une condition ou une précision technique.
6. Ajouter des photos chantier si besoin.
7. Cliquer sur `Calculer`.
8. Cliquer sur `Sauvegarder devis`.

La TVA par défaut est de `21,20 %` pour la première année. Elle peut être changée dans le devis si besoin.

## Générer le PDF

1. Cliquer sur `Générer devis PDF`.
2. Dans la fenêtre d'impression du navigateur, choisir `Enregistrer au format PDF`.
3. Enregistrer le fichier dans le dossier souhaité, par exemple `exports`.

## Envoyer au client

1. Générer d'abord le PDF.
2. Cliquer sur `Envoyer au client`.
3. L'application mail s'ouvre avec le destinataire, le sujet et le message préparés.
4. Ajouter le PDF en pièce jointe dans l'application mail.

Limite importante : une application HTML locale ne peut pas attacher automatiquement un PDF à un email sans logiciel serveur ou application installée.

## Historique

L'onglet `Historique` permet de retrouver les devis sauvegardés dans le navigateur.
Les données restent sur l'appareil utilisé.

## Exports

- `JSON` exporte toutes les données du devis.
- `CSV` exporte le tableau des prestations pour tableur.
- `LibreOffice` exporte un fichier HTML ouvrable dans LibreOffice Writer.

## Compatibilité LibreOffice future

Le dossier `templates` contient un modèle avec les champs prévus :

- `{{nom_client}}`
- `{{adresse_client}}`
- `{{date_devis}}`
- `{{numero_devis}}`
- `{{total_ht}}`
- `{{tva}}`
- `{{total_ttc}}`
- `{{tableau_prestations}}`

Une version future pourra remplacer automatiquement ces champs dans un vrai modèle `.odt`, puis exporter en PDF via LibreOffice.

## Évolutions prévues

L'architecture prépare déjà :

- application téléphone / PWA
- fonctionnement hors ligne
- historique clients
- factures
- acomptes
- signature tactile
- sauvegarde cloud
- export Writer `.odt`
