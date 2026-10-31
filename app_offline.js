/**
 * SportData fonctionne d'abord hors ligne.
 * Les profils et l'historique des athlètes sont stockés dans IndexedDB.
 * Le profil utilisateur, les préférences et les petits réglages sont stockés dans localStorage.
 *
 * Repères dans le fichier :
 * - Traductions, IndexedDB, mode hors ligne et synchronisation distante facultative
 * - Authentification, animations de présentation et démarrage de l'application
 * - Conversion des données, gestion des athlètes et de l'historique, sauvegardes, navigation
 * - Tableau de bord, liste des athlètes, analyses et graphiques de progression
 * - Scores, barèmes personnalisés, fiche athlète et rapports
 * - Validation des formulaires, code PIN administrateur et installation PWA
 *
 * Pour modifier les textes affichés, mettre à jour LANGUAGE_TEXT et utiliser tr()
 * dans le code HTML généré dynamiquement.
 * Pour ajouter une donnée d'athlète, mettre à jour ensemble le formulaire, les
 * règles de validation et les fonctions de conversion des données.
 */
'use strict';

window.addEventListener('error', event => {
  console.error('Global JS error:', event.message || event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
});

/* ═══════════════════════════════════════════════════════════
   SPORTDATA — STOCKAGE LOCAL, FONCTIONNEMENT HORS LIGNE

   Profils et historique des athlètes : IndexedDB
   Profil et préférences : localStorage
   ═══════════════════════════════════════════════════════════ */

/* ── ÉTAT DU RÉSEAU ET DE LA LANGUE ──────────────────────── */
let isOnline        = navigator.onLine;
const OFFLINE_ONLY  = true;
let currentLanguage = localStorage.getItem('sportdata_language') || 'en';

const LANGUAGE_TEXT = {
  fr: {},
  en: {
    'SPORTS INTELLIGENCE · AFRICA': 'SPORTS INTELLIGENCE · AFRICA',
    'Passer': 'Skip',
    'PROFIL ATHLÈTE': 'ATHLETE PROFILE',
    'ANALYSE ACTIVE': 'LIVE ANALYSIS',
    'Potentiel détecté': 'Potential detected',
    'Exemple illustratif — données fictives': 'Illustrative example — fictional data',
    'REPÉRER · MESURER · ACCOMPAGNER': 'DISCOVER · MEASURE · SUPPORT',
    'Taille · 178 cm': 'Height · 178 cm',
    'Poids · 68 kg': 'Weight · 68 kg',
    'Sprint 100m · 11.2 s': '100m sprint · 11.2 s',
    'Vitesse max · 31 km/h': 'Top speed · 31 km/h',
    'Endurance · 82/100': 'Endurance · 82/100',
    'Chaque talent mérite': 'Every talent deserves',
    'de briller.': 'a chance to shine.',
    'La plateforme qui aide les acteurs du sport à repérer les talents et suivre leur progression.': 'The platform that helps sports professionals discover talent and track their progress.',
    'Données conservées sur cet appareil · Fonctionne hors ligne': 'Your data stays on this device · Works offline',
    'Suivez les profils et les performances de chaque athlète.': 'Track every athlete’s profile and performance.',
    'Retrouvez vos données sur cet appareil, même hors ligne.': 'Keep your data on this device, even offline.',
    'Visualisez les progrès et repérez les prochains talents.': 'See progress clearly and discover tomorrow’s talent.',
    'Passer ⏭': 'Skip ⏭', 'Entrer dans la plateforme': 'Enter the platform',
    "Voir l'offre": 'View plans', 'ACCÈS À SPORTDATA': 'ACCESS SPORTDATA',
    'Choisissez votre offre': 'Choose your plan',
    'Accédez à la plateforme et accompagnez la progression des talents sportifs.': 'Access the platform and support athletes as they develop.',
    'Abonnement mensuel': 'Monthly subscription',
    "Pour un accès d'un mois à la plateforme.": 'For one month of platform access.',
    'Meilleure valeur': 'Best value', 'Abonnement annuel': 'Annual subscription',
    "Pour un accès d'un an à la plateforme.": 'For one year of platform access.',
    'Taux EUR fixe : 1 EUR = 655,957 XOF. Le taux USD est actualisé en ligne.': 'Fixed EUR rate: 1 EUR = 655.957 XOF. The USD rate is updated online.',
    'Taux USD actualisé le': 'USD rate updated on',
    'Dernier taux USD enregistré le': 'Last saved USD rate on',
    'Taux USD indicatif : 1 USD =': 'Indicative USD rate: 1 USD =',
    ' XOF. Mise à jour indisponible, taux indicatif utilisé.': ' XOF. Update unavailable; indicative rate used.',
    ' (taux enregistré hors connexion).': ' (saved rate, offline).',
    ' — taux actualisé en ligne.': ' — rate updated online.',
    '. Taux EUR fixe : 1 EUR = 655,957 XOF.': '. Fixed EUR rate: 1 EUR = 655.957 XOF.',
    'Accéder à la plateforme': 'Access the platform',
    'Choisir cette offre': 'Choose this plan',
    'Sélectionnez une formule pour continuer.': 'Select a plan to continue.',
    '← Retour aux offres': '← Back to plans',
    'VOTRE FORMULE': 'YOUR PLAN',
    "Votre demande d'abonnement": 'Your subscription request',
    'Renseignez vos coordonnées pour poursuivre.': 'Enter your contact details to continue.',
    'Choisissez une offre': 'Choose a plan',
    "Payer l'abonnement": 'Pay for subscription',
    "Vous serez redirigé vers le formulaire de paiement sécurisé XPAYE de l'offre choisie.": 'You will be redirected to the XPAYE secure payment form for your selected plan.',
    "Pas encore d'offre ?": 'Looking for a plan?',
    'Souscrire à une offre': 'Subscribe to a plan',
    'Déjà abonné ?': 'Already subscribed?',
    'Connectez-vous ou créez un compte pour continuer.': 'Sign in or create an account to continue.',
    "← Retour à l'accueil": '← Back to home',
    'Revoir la présentation': 'Replay introduction', '↻ Revoir la présentation': '↻ Replay introduction', 'Exemple illustratif — pas une donnée réelle': 'Illustrative example - not real data', 'Bienvenue': 'Welcome',
    'Connectez-vous à votre compte SportData': 'Sign in to your SportData account',
    'Adresse email': 'Email address', 'Mot de passe': 'Password',
    'Se connecter': 'Sign in', 'Nouveau sur SportData ?': 'New to SportData?',
    'Créer un compte': 'Create an account', 'Démo : admin@sportdata.africa / admin123': 'Demo: admin@sportdata.africa / admin123',
    'Créer un compte': 'Create an account', 'Commencez à suivre les athlètes africains': 'Start tracking African athletes',
    'Prénom': 'First name', 'Nom': 'Last name', 'Organisation': 'Organization',
    'Déjà un compte ?': 'Already have an account?', 'Principal': 'Main',
    'Dashboard': 'Dashboard', 'Athlètes': 'Athletes', 'Ajouter Athlète': 'Add athlete',
    'Analyse': 'Analysis', 'Analytiques': 'Analytics', 'Comparaison': 'Comparison',
    'Historique': 'History', 'Progression': 'Progress', 'Contenu': 'Content',
    'Médiathèque': 'Media library', 'Rapports PDF': 'PDF reports', 'Paramètres': 'Settings',
    'Déconnexion': 'Sign out', 'Recherche rapide': 'Quick search', 'Export PDF': 'PDF export',
    'Notifications': 'Notifications', 'Tout effacer': 'Clear all', 'Installer': 'Install',
    "Installer l'application": 'Install the app',
    'Ajouter': 'Add', 'Rechercher un athlète, un sport…': 'Search for an athlete or sport…',
    "Vue d'ensemble": 'Overview', "L'intelligence athlétique africaine en un coup d'œil": 'African athletic intelligence at a glance',
    'Athlètes récents': 'Recent athletes', 'Répartition par sport': 'Breakdown by sport',
    'Top Performers': 'Top performers', 'Scanner 3D Athlète': '3D athlete scanner',
    'Coach IA': 'AI coach', 'Réseau de Scouts': 'Scout network', 'Réinitialiser': 'Reset',
    'Ajouter un athlète': 'Add an athlete', 'Sauvegarder le profil': 'Save profile',
    'Tous les sports': 'All sports', 'Tous les pays': 'All countries',
    'Nom A→Z': 'Name A→Z', 'Âge croissant': 'Age (ascending)', 'Score IA': 'AI score',
    'Tous les genres': 'All genders', 'Tous les niveaux': 'All levels',
    'Aucun athlète trouvé.': 'No athletes found.', 'Ajouter le premier →': 'Add the first one →',
    'Afrique': 'Africa', 'ans': 'years', 'Voir': 'View', 'Éditer': 'Edit',
    'Suppr.': 'Delete', 'Score IA basé sur': 'AI score based on',
    'Profil': 'Profile', 'Physiologie': 'Physiology', 'Analyse IA': 'AI analysis',
    'Normes': 'Benchmarks', 'Médias': 'Media',
    'Taille': 'Height', 'Poids': 'Weight', 'IMC': 'BMI', 'Poste': 'Position', 'Envergure': 'Arm span',
    'Long. jambe': 'Leg length', 'Pays': 'Country', 'FC repos': 'Resting heart rate',
    '% Graisse': 'Body fat', 'Masse musc.': 'Muscle mass', 'Saut vertical': 'Vertical jump',
    'Modifier': 'Edit', 'Supprimer': 'Delete',
    'Aucune donnée de performance.': 'No performance data.',
    'Aucun média uploadé.': 'No media uploaded.',
    'Aucun historique.': 'No history recorded.',
    "Voir l'historique →": 'View history →',
    'Faible': 'Low', 'Moyen': 'Average', 'Bon': 'Good', 'Très bon': 'Very good',
    'Insuffisance pondérale': 'Underweight', 'Corpulence normale': 'Normal weight',
    'Surpoids': 'Overweight', 'Obésité': 'Obesity',
    'Normes scientifiques (référence adulte)': 'Scientific standards (adult reference)',
    'ACSM / Cooper Institute (référence adulte)': 'ACSM / Cooper Institute (adult reference)',
    'Organisation mondiale de la santé (référence adulte)': 'World Health Organization (adult reference)',
    'Ces classifications sont établies pour une population adulte. Pour un athlète de moins de 18 ans, en pleine croissance, elles restent indicatives et doivent être interprétées avec prudence.': 'These classifications are intended for adults. For athletes under 18 who are still growing, they are indicative only and should be interpreted with caution.',
    'Aucun barème défini pour ce sport.': 'No benchmarks are defined for this sport.',
    'Configurer →': 'Configure →',
    'Aucune mesure sport-spécifique renseignée pour cet athlète.': 'No sport-specific measurements have been entered for this athlete.',
    'Barème personnalisé': 'Custom benchmarks',
    'Ce barème est celui que vous avez défini dans Réglages → Barèmes de référence pour': 'These benchmarks are defined in Settings → Performance benchmarks for',
    'Ce n’est pas une norme officielle internationale.': 'These are not official international standards.',
    "Ce n'est pas une norme officielle internationale.": 'These are not official international standards.',
    'tous sports confondus (échantillon limité)': 'all sports (limited sample)',
    'se maintient': 'continues', 'jours de suivi': 'days of tracking',
    'percentile': 'percentile',
    'Pas assez de données de performance pour estimer un niveau.': 'Not enough performance data to estimate a level.',
    'Renseignez au moins 2 mesures parmi : sprint, vitesse, VO₂, force, endurance, détente.': 'Enter at least 2 measurements from: sprint, speed, VO₂, strength, endurance, or jump height.',
    'Comparaison': 'Comparison', 'Points forts': 'Strengths', 'À travailler': 'To improve',
    'Projection à 5 ans': '5-year projection',     'En progression': 'Improving', 'En baisse': 'Declining', 'Stable': 'Stable',
    "Ajoutez au moins 3 mesures dans l'onglet Historique pour activer la projection.": 'Add at least 3 measurements in the History tab to enable the projection.',
    'Les mesures existantes couvrent une trop courte période (min. ~6 mois nécessaires).': 'The existing measurements cover too short a period (at least ~6 months are needed).',
    'Pas assez de mesures répétées (sprint, vitesse, VO₂, force, endurance, détente) pour dégager une tendance.': 'Not enough repeated measurements (sprint, speed, VO₂, strength, endurance, jump height) to identify a trend.',
    'Pas assez d’athlètes comparables dans la base pour situer cette projection.': 'Not enough comparable athletes in the database to assess this projection.',
    'Historique insuffisant pour projeter une tendance.': 'Not enough history to project a trend.',
    'Si la tendance actuelle': 'If the current trend',
    'Niveau estimé': 'Estimated level',
    'Enregistrez un nouvel athlète et capturez ses données': 'Register a new athlete and record their data',
    'Complétude du profil': 'Profile completeness', 'Sélectionner…': 'Select…',
    'Cliquer pour uploader des vidéos': 'Click to upload videos',
    'Informations de base': 'Basic information',
    'Vitesse max (km/h)': 'Top speed (km/h)',
    "Observations particulières sur l'athlète…": 'Notes about the athlete…',
    'Sauvegarder': 'Save',
    'Insights de performance sur tout l’effectif': 'Performance insights across your roster',
    "Insights de performance sur tout l'effectif": 'Performance insights across your roster',
    'Souplesse': 'Flexibility', 'Saut': 'Jump',
    "Exportez les profils et statistiques en PDF": 'Export athlete profiles and statistics as PDF',
    "Rapport d'effectif complet": 'Complete roster report',
    'Statistiques globales, distribution des sports, performances moyennes.': 'Overall statistics, sport breakdown, and average performance.',
    'Exporter PDF': 'Export PDF', 'Exporter Profil': 'Export profile', 'Exporter Rapport': 'Export report',
    'Taille →': 'Height →', '↑ Poids': '↑ Weight',
    "Distribution d'Âge": 'Age distribution',
    'Cliquer pour uploader': 'Click to upload',
    'Profil utilisateur': 'User profile', 'Langue de la plateforme': 'Platform language',
    'Langue': 'Language', 'Données & Stockage': 'Data & storage', 'Athlètes enregistrés': 'Registered athletes',
    'Stockage utilisé': 'Storage used', 'Dernier ajout': 'Last added', 'Exporter JSON': 'Export JSON',
    'Importer JSON': 'Import JSON', 'Réinitialiser toutes les données': 'Reset all data',
    'Sur cet appareil': 'On this device', 'Compte en ligne': 'Online account',
    'Retrouvez ici votre profil, vos sauvegardes et les réglages de la plateforme.': 'Manage your profile, backups, and platform preferences here.',
    'À propos de SportData': 'About SportData',
    'Professionnel': 'Professional', 'Sprint 100m': '100m sprint', 'Vitesse max': 'Top speed',
    'Détente': 'Jump height', 'Force': 'Strength', 'Endurance': 'Endurance',
    'Langue d’affichage': 'Display language', 'Choisissez la langue des menus et des textes.': 'Choose the language used for menus and text.',
    'Mon profil': 'My profile', 'Modifiez le nom et l’organisation affichés dans votre espace.': 'Change the name and organization shown in your workspace.',
    'Sauvegarde des données': 'Data backup', 'Emplacement': 'Location',
    'Télécharger une sauvegarde': 'Download a backup', 'Restaurer une sauvegarde': 'Restore a backup',
    'Supprimer toutes les données': 'Delete all data',
    'Restaurer': 'Restore', 'Importer': 'Import',
    'Cette action remplacera les fiches et l’historique actuellement enregistrés sur cet appareil.': 'This will replace the records and history currently saved on this device.',
    'Les fiches du fichier seront ajoutées ou mises à jour.': 'Records in the file will be added or updated.',
    'Repères de performance par sport': 'Performance benchmarks by sport',
    'Personnalisez les seuils utilisés pour situer les performances d’un athlète. Choisissez un sport, modifiez les valeurs si nécessaire, puis enregistrez. Ces repères sont les vôtres : ils ne sont pas des normes universelles.': 'Customize the thresholds used to assess an athlete’s performance. Choose a sport, adjust values if needed, and save. These benchmarks are yours; they are not universal standards.',
    'Sur petit écran, faites défiler le tableau horizontalement pour voir tous les niveaux.': 'On a small screen, scroll the table horizontally to see every level.',
    'Enregistrer les repères': 'Save benchmarks',
    'Code PIN administrateur': 'Administrator PIN',
    'Ce code protège les sections réservées à l’administration. Il est distinct du mot de passe de votre compte.': 'This code protects administrator-only sections. It is separate from your account password.',
    'Réglages du code': 'PIN settings', 'Code administrateur': 'Administrator code', 'Configuré': 'Set up',
    'Durée avant expiration': 'Time before expiry', 'Blocage après 3 erreurs': 'Lock after 3 incorrect attempts',
    'Accès administrateur': 'Administrator access', 'Modifier le code PIN': 'Change PIN',
    'Fermer l’accès administrateur': 'Close administrator access', 'Code PIN actuel': 'Current PIN',
    'Nouveau code (4 à 8 chiffres)': 'New PIN (4 to 8 digits)', 'Confirmer le nouveau code': 'Confirm new PIN',
    'Historique des accès': 'Access history', 'Aucun accès enregistré.': 'No access recorded.',
    'Emplacement des données': 'Data location',
    'Les données restent dans ce navigateur, sur cet appareil. Elles ne se synchronisent pas avec vos autres appareils.': 'Data stays in this browser on this device. It does not sync with your other devices.',
    'Les données sont associées à votre compte et accessibles en ligne.': 'Data is linked to your account and available online.',
    'La sauvegarde JSON est téléchargée sur cet appareil. Restaurer un fichier remplace les données actuelles : téléchargez d’abord une copie si vous souhaitez les conserver.': 'The JSON backup is downloaded to this device. Restoring a file replaces current data; download a copy first if you want to keep it.',
    'La sauvegarde JSON est téléchargée sur cet appareil. L’import ajoute ou met à jour les fiches présentes dans le fichier.': 'The JSON backup is downloaded to this device. Importing adds or updates the records in the file.',
    'Supprime tous les profils d’athlètes et leur historique de cet espace. Cette action est définitive.': 'Deletes all athlete profiles and their history from this workspace. This action cannot be undone.',
    'Enregistrer le barème': 'Save standards', 'Annuler': 'Cancel', 'Enregistrer': 'Save',
    'Aucune notification': 'No notifications', 'Aucun athlète.': 'No athletes.', 'Ajouter.': 'Add one.',
    'vous@sportdata.africa': 'you@sportdata.africa', 'Min. 6 caractères': 'Min. 6 characters',
    'Ajouter un athlète': 'Add an athlete', 'Progression individuelle': 'Individual progress',
    'Historique des performances': 'Performance history', 'Vue d\'ensemble': 'Overview',
    'Total Athlètes': 'Total athletes', 'Âge moyen (ans)': 'Average age (years)',
    'Taille moy. (cm)': 'Average height (cm)', 'Poids moy. (kg)': 'Average weight (kg)',
    'cette semaine': 'this week', 'Vivier de talents': 'Talent pool', 'Aucune donnée.': 'No data.',
    'Voir tous →': 'View all →', 'Analytiques →': 'Analytics →', 'Ajoutez des données de vitesse.': 'Add speed data.',
    'Bientôt disponible': 'Coming soon', 'Scan anthropométrique complet via smartphone. Génération de modèles 3D depuis la vidéo.': 'Full anthropometric scan via smartphone. Generate 3D models from video.',
    'ML pour prédire le potentiel, détecter les risques de blessure et ajuster l’entraînement.': 'ML to predict potential, detect injury risks, and adjust training.',
    'Connectez athlètes et clubs professionnels via des profils vérifiés et un système de matching.': 'Connect athletes and professional clubs through verified profiles and matching.',
    'Rechercher…': 'Search…', 'Âge min': 'Min age', 'Âge max': 'Max age',
    'Choisir…': 'Choose…', 'Masculin': 'Male', 'Féminin': 'Female',
    'Nom complet': 'Full name', 'Genre': 'Gender', 'Âge': 'Age', 'Sport': 'Sport',
    'Pays': 'Country', 'Ville': 'City', 'Niveau': 'Level', 'Poste / Position': 'Position',
    'Données Anthropométriques': 'Anthropometric data', 'Performance Physique': 'Physical performance',
    'Données Physiologiques': 'Physiological data', 'Photo de profil': 'Profile photo',
    'Vidéos de performance': 'Performance videos', 'Observations / Notes': 'Observations / Notes',
    'Taille (cm)': 'Height (cm)', 'Poids (kg)': 'Weight (kg)', 'Envergure (cm)': 'Arm span (cm)',
    'Long. jambe (cm)': 'Leg length (cm)', 'Tour de poitrine (cm)': 'Chest (cm)', 'Tour de taille (cm)': 'Waist (cm)',
    'Saut vertical (cm)': 'Vertical jump (cm)', 'Force (1-100)': 'Strength (1-100)', 'Endurance (1-100)': 'Endurance (1-100)',
    'FC repos (bpm)': 'Resting heart rate (bpm)', '% Graisse corporelle': 'Body fat %',
    'Masse musculaire (kg)': 'Muscle mass (kg)', 'Souplesse (1-100)': 'Flexibility (1-100)',
    'Sélectionner l’athlète': 'Select athlete', 'Athlète A': 'Athlete A', 'Athlète B': 'Athlete B',
    'Sécurité PIN': 'PIN security', 'Accès Administrateur': 'Administrator access',
    'Saisissez le PIN pour accéder à cette section': 'Enter the PIN to access this section',
    'Médiathèque': 'Media library', 'Photos': 'Photos', 'Vidéos': 'Videos',
    'Rapport d’effectif complet': 'Complete roster report', 'Profil individuel': 'Individual profile',
    'Rapport analytique': 'Analytics report', 'Imprimer / Sauvegarder PDF': 'Print / Save PDF',
    'Fermer': 'Close', 'Réinitialiser toutes les données': 'Reset all data',
    'Barèmes de référence par sport': 'Reference standards by sport', 'Enregistrer le barème': 'Save standards',
    'Synchronisation…': 'Syncing…', 'Enregistrement…': 'Saving…', 'Mise à jour…': 'Updating…',
    'Connexion…': 'Signing in…', 'Chargement du mode local…': 'Loading local mode…',
    'Parcourez et gérez votre effectif': 'Browse and manage your roster', 'Plus récents': 'Most recent',
    'Débutant': 'Beginner', 'Intermédiaire': 'Intermediate', 'Avancé': 'Advanced',
    'Aucune donnée disponible.': 'No data available.', 'Athlètes par Sport': 'Athletes by sport',
    'Répartition par Pays': 'Breakdown by country', 'Comparez les statistiques de deux athlètes côte à côte': 'Compare two athletes side by side',
    'Sélectionnez deux athlètes pour lancer la comparaison': 'Select two athletes to start the comparison',
    'Suivez l’évolution d’un athlète dans le temps': 'Track an athlete\'s progress over time',
    "Suivez l'évolution d'un athlète dans le temps": "Track an athlete's progress over time",
    'Sélectionner l’athlète': 'Select the athlete', 'Sélectionnez un athlète pour voir son évolution': 'Select an athlete to view their progress',
    "Sélectionner l'athlète": 'Select the athlete', "Sélectionnez un athlète pour voir son évolution": 'Select an athlete to view their progress',
    'Graphes d’évolution annuelle par athlète': 'Annual progress charts by athlete',
    "Graphes d'évolution annuelle par athlète": 'Annual progress charts by athlete',
    'Sélectionnez un athlète pour voir ses graphes de progression': 'Select an athlete to view progress charts',
    'Photos et vidéos de tous les athlètes': 'Photos and videos of all athletes',
    'Aucune photo. Ajoutez des photos lors de l’enregistrement des athlètes.': 'No photos. Add photos when saving athletes.',
    'Aucune vidéo. Uploadez des vidéos lors de l’ajout d’athlètes.': 'No videos. Upload videos when adding athletes.',
    'Liste complète de tous les athlètes avec leurs statistiques principales.': 'Complete list of all athletes with key statistics.',
    'Fiche complète d’un athlète : données, performances, physiologie.': 'Complete athlete profile: data, performance, and physiology.',
    'Aperçu du rapport': 'Report preview', 'Données de performance': 'Performance data',
    'Répartition par Niveau': 'Breakdown by level', 'Distribution d’Âge': 'Age distribution',
    'Taille vs Poids': 'Height vs weight', 'Top Vitesses (km/h)': 'Top speeds (km/h)',
    'Scores moyens': 'Average scores', 'Top Sprinters 100m (s)': 'Top 100m sprinters (s)',
    'Sélectionnez un athlète': 'Select an athlete', 'Aucune photo': 'No photo', 'Aucune vidéo': 'No video',
    "Fiche complète d'un athlète : données, performances, physiologie.": 'Complete athlete profile: data, performance, and physiology.',
    "Aucune photo. Ajoutez des photos lors de l'enregistrement des athlètes.": 'No photos. Add photos when saving athletes.',
    "Aucune vidéo. Uploadez des vidéos lors de l'ajout d'athlètes.": 'No videos. Upload videos when adding athletes.',
    'athlète': 'athlete', 'athlètes': 'athletes', 'entrée': 'entry', 'entrées': 'entries',
    'Métriques corporelles': 'Body metrics', '3D Vision · Métriques corporelles': '3D Vision · Body metrics', 'Réseau · Recrutement': 'Network · Recruitment',
    "ML pour prédire le potentiel, détecter les risques de blessure et ajuster l'entraînement.": 'ML to predict potential, detect injury risks, and adjust training.',
    'ML · Analytique prédictive': 'ML · Predictive analytics', 'Réseau · Recrutement': 'Network · Recruitment',
  },
};

// Traduit les textes statiques ainsi que les attributs d'accessibilité connus.
function translatePage() {
  const dictionary = LANGUAGE_TEXT[currentLanguage] || {};
  document.querySelectorAll('body *').forEach(element => {
    if (element.children.length) return;
    const original = element.textContent.trim();
    if (dictionary[original]) element.textContent = dictionary[original];
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walker.nextNode())) {
    const parentName = textNode.parentElement?.tagName;
    const original = textNode.textContent.trim();
    if (parentName !== 'SCRIPT' && parentName !== 'STYLE' && dictionary[original]) {
      textNode.textContent = textNode.textContent.replace(original, dictionary[original]);
    }
  }
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(input => {
    const translated = dictionary[input.placeholder];
    if (translated) input.placeholder = translated;
  });
  document.querySelectorAll('[title], [aria-label], img[alt]').forEach(element => {
    ['title', 'aria-label', 'alt'].forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]);
    });
  });
  document.querySelectorAll('#language-select-auth, #language-select-top, #language-select-settings').forEach(select => {
    select.value = currentLanguage;
  });
  document.querySelectorAll('.language-choice button').forEach(button => {
    button.classList.toggle('active', button.dataset.language === currentLanguage);
  });
  document.documentElement.lang = currentLanguage;
}

// Enregistre la langue choisie puis recharge la page pour reconstruire les textes proprement.
function setLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'fr';
  localStorage.setItem('sportdata_language', currentLanguage);
  window.location.reload();
}

// Traduit une phrase connue dans l'interface générée ; laisse les autres inchangées.
function tr(text) {
  return currentLanguage === 'en' ? (LANGUAGE_TEXT.en[text] || text) : text;
}

/* ── CLÉS ET BASE DE DONNÉES HORS LIGNE ──────────────────── */
const OFK = {
  ATHLETES:    'sportdata_offline_athletes',
  HISTORY:     'sportdata_offline_history',
  QUEUE:       'sportdata_offline_queue',
  LAST_SYNC:   'sportdata_last_sync',
  NORMS:       'sportdata_offline_norms',
};

const OFFLINE_DB_NAME = 'sportdata-local';
const OFFLINE_DB_VERSION = 1;
let offlineDbPromise;
let offlineMigrationPromise;
const EUR_PER_XOF = 1 / 655.957;
const INITIAL_XOF_PER_USD = 582.5;
const SUBSCRIPTION_RATE_KEY = 'sportdata_subscription_usd_xof_rate';
let xofPerUsdRate = INITIAL_XOF_PER_USD;
let rateUpdatedAt = null;
let rateStatusKind = 'indicative';
let lastRateCheck = 0;

// Ouvre IndexedDB une seule fois afin que les appels simultanés partagent la connexion.
function openOfflineDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('Le stockage local de la tablette n’est pas disponible.'));
  }
  if (!offlineDbPromise) {
    offlineDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('athletes')) {
          db.createObjectStore('athletes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('history')) {
          const history = db.createObjectStore('history', { keyPath: 'id' });
          history.createIndex('athlete_id', 'athlete_id', { unique: false });
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => {
        offlineDbPromise = null;
        reject(request.error || new Error('Impossible d’ouvrir le stockage local.'));
      };
      request.onblocked = () => {
        offlineDbPromise = null;
        reject(new Error('La mise à jour du stockage local est bloquée par un autre onglet.'));
      };
    });
  }
  return offlineDbPromise;
}

// Exécute une opération de lecture/écriture et signale les erreurs ou annulations IndexedDB.
function offlineTransaction(storeNames, mode, run) {
  return openOfflineDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Erreur du stockage local.'));
    transaction.onabort = () => reject(transaction.error || new Error('Écriture locale annulée.'));
    try {
      run(transaction);
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  }));
}

function getOfflineStoreRecords(storeName) {
  return openOfflineDatabase().then(db => new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Lecture locale impossible.'));
  }));
}

async function replaceOfflineRecords(storeName, records) {
  await offlineTransaction([storeName], 'readwrite', transaction => {
    const store = transaction.objectStore(storeName);
    store.clear();
    records.forEach(record => store.put(record));
  });
}

// N'exécute qu'une fois par session la migration de localStorage vers IndexedDB.
function migrateLegacyOfflineData() {
  if (!offlineMigrationPromise) {
    offlineMigrationPromise = migrateLegacyOfflineDataOnce().catch(error => {
      offlineMigrationPromise = null;
      throw error;
    });
  }
  return offlineMigrationPromise;
}

async function migrateLegacyOfflineDataOnce() {
  const db = await openOfflineDatabase();
  const [athletes, history] = await Promise.all([
    new Promise((resolve, reject) => {
      const request = db.transaction('athletes', 'readonly').objectStore('athletes').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
    new Promise((resolve, reject) => {
      const request = db.transaction('history', 'readonly').objectStore('history').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
  ]);

  if (!athletes) {
    const legacyAthletes = getOfflineData(OFK.ATHLETES);
    if (Array.isArray(legacyAthletes) && legacyAthletes.length) {
      await replaceOfflineRecords('athletes', legacyAthletes.filter(a => a && a.id));
    }
    localStorage.removeItem(OFK.ATHLETES);
  }
  if (!history) {
    const legacyHistory = getOfflineData(OFK.HISTORY) || {};
    const records = Object.entries(legacyHistory).flatMap(([athleteId, entries]) =>
      (Array.isArray(entries) ? entries : []).map(entry => ({
        ...entry,
        id: entry.id || generateUUID(),
        athlete_id: athleteId,
      }))
    );
    if (records.length) await replaceOfflineRecords('history', records);
    localStorage.removeItem(OFK.HISTORY);
  }
}

async function saveOfflineHistoryEntry(athleteId, entry) {
  const record = { ...entry, id: entry.id || generateUUID(), athlete_id: athleteId };
  await offlineTransaction(['history'], 'readwrite', transaction => {
    transaction.objectStore('history').put(record);
  });
  return record;
}

async function deleteOfflineAthleteData(athleteId) {
  await offlineTransaction(['athletes', 'history'], 'readwrite', transaction => {
    transaction.objectStore('athletes').delete(athleteId);
    const history = transaction.objectStore('history');
    const request = history.index('athlete_id').openCursor(IDBKeyRange.only(athleteId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
}

/* ── ÉTAT DU RÉSEAU ──────────────────────────────────────── */
window.addEventListener('online',  () => { isOnline = true;  onNetworkChange(true);  });
window.addEventListener('offline', () => { isOnline = false; onNetworkChange(false); });

async function onNetworkChange(online) {
  updateNetworkBanner(online);
  if (online && currentUser && !OFFLINE_ONLY) {
    await syncOfflineToSupabase();
  }
}

function updateNetworkBanner(online) {
  let banner = document.getElementById('network-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'network-banner';
    banner.style.cssText = [
      'position:fixed;top:0;left:0;right:0;z-index:99999',
      'padding:8px 16px;text-align:center;font-size:13px;font-weight:600',
      'transition:all .3s;font-family:var(--font-body)',
    ].join(';');
    document.body.appendChild(banner);
  }
  if (online) {
    banner.style.background = 'rgba(52,211,153,0.15)';
    banner.style.color      = '#34d399';
    banner.style.borderBottom = '1px solid rgba(52,211,153,0.3)';
    banner.textContent = OFFLINE_ONLY
      ? '✓ Internet disponible — données conservées sur cet appareil'
      : '✓ Connecté — données synchronisées avec Supabase';
    setTimeout(() => { banner.style.display = 'none'; }, 3000);
  } else {
    banner.style.display    = 'block';
    banner.style.background = 'rgba(251,191,36,0.15)';
    banner.style.color      = '#fbbf24';
    banner.style.borderBottom = '1px solid rgba(251,191,36,0.3)';
    banner.textContent = '⚡ Mode hors-ligne — données sauvegardées localement';
  }
}

/* ── OUTILS LOCALSTORAGE ─────────────────────────────────── */
function getOfflineData(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function setOfflineData(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function addToQueue(action) {
  const queue = getOfflineData(OFK.QUEUE) || [];
  queue.push({ ...action, timestamp: Date.now(), id: generateUUID() });
  setOfflineData(OFK.QUEUE, queue);
}

/* ── CHARGEMENT DES DONNÉES ──────────────────────────────── */
// Migre d'abord les anciennes données, puis charge les profils depuis IndexedDB.
async function loadAthletesHybrid() {
  if (!OFFLINE_ONLY && isOnline && currentUser) {
    try {
      // Charger les données depuis Supabase.
      const { data, error } = await db.from('athletes')
        .select('*').eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        athletes = data.map(dbToAthlete);
        await replaceOfflineRecords('athletes', athletes);
        setOfflineData(OFK.LAST_SYNC, Date.now());
        return;
      }
    } catch(e) { console.warn('Supabase indisponible, mode offline'); }
  }
  await migrateLegacyOfflineData();
  athletes = (await getOfflineStoreRecords('athletes')).map(athlete => ({
    ...athlete,
    videos: hydrateAthleteVideos(athlete.videos),
  }));
  if (!isOnline) updateNetworkBanner(false);
}

async function loadAllHistoryHybrid() {
  if (!OFFLINE_ONLY && isOnline && currentUser) {
    try {
      const { data, error } = await db.from('performance_history')
        .select('*').eq('user_id', currentUser.id)
        .order('entry_date', { ascending: true });
      if (!error && data) {
        historyData = {};
        (data || []).forEach(r => {
          if (!historyData[r.athlete_id]) historyData[r.athlete_id] = [];
          historyData[r.athlete_id].push(dbToHistory(r));
        });
        const records = Object.entries(historyData).flatMap(([athleteId, entries]) =>
          entries.map(entry => ({ ...entry, athlete_id: athleteId }))
        );
        await replaceOfflineRecords('history', records);
        return;
      }
    } catch(e) { console.warn('Historique: mode offline'); }
  }
  await migrateLegacyOfflineData();
  historyData = {};
  (await getOfflineStoreRecords('history')).forEach(entry => {
    if (!historyData[entry.athlete_id]) historyData[entry.athlete_id] = [];
    historyData[entry.athlete_id].push(entry);
  });
}

/* ── ENREGISTREMENT DES DONNÉES ──────────────────────────── */
// Met à jour le stockage local en priorité ; le mode distant utilise la file de synchronisation.
async function saveAthleteHybrid(dbData, editId, localVideos = []) {
  console.log('saveAthleteHybrid: start', { id: dbData.id, editId, isOnline });
  const isEdit = !!editId;

  // Enregistrer immédiatement sur l'appareil, même si le réseau est disponible.
  const localAthlete = {
    ...dbToAthlete({ ...dbData, id: dbData.id, created_at: new Date().toISOString() }),
    videos: hydrateAthleteVideos(localVideos.length ? localVideos : dbData.video_urls || []),
  };
  await offlineTransaction(['athletes'], 'readwrite', transaction => {
    transaction.objectStore('athletes').put(localAthlete);
  });
  const idx = athletes.findIndex(a => a.id === dbData.id);
  if (idx >= 0) athletes[idx] = localAthlete;
  else athletes.unshift(localAthlete);

  if (OFFLINE_ONLY) return { error: null };

  if (!OFFLINE_ONLY && isOnline) {
    try {
      const { error } = isEdit
        ? await db.from('athletes').update(dbData).eq('id', editId)
        : await db.from('athletes').insert(dbData);
      if (!error) {
        setOfflineData(OFK.LAST_SYNC, Date.now());
        return { error: null };
      }
      console.warn('saveAthleteHybrid: Supabase returned error', error);
    } catch(e) {
      console.warn('saveAthleteHybrid: network/db operation failed', e);
    }
  }

  // Ajouter l'opération à la file d'attente de synchronisation.
  addToQueue({ type: isEdit ? 'update' : 'insert', table: 'athletes', data: dbData, id: dbData.id });
  toast('💾 Sauvegardé localement — sera synchronisé en ligne', 'info');
  return { error: null };
}

async function deleteAthleteHybrid(id) {
  await deleteOfflineAthleteData(id);
  athletes = athletes.filter(a => a.id !== id);

  if (OFFLINE_ONLY) return;

  if (!OFFLINE_ONLY && isOnline) {
    try {
      await db.from('performance_history').delete().eq('athlete_id', id);
      await db.from('athletes').delete().eq('id', id);
      return;
    } catch(e) {}
  }
  addToQueue({ type: 'delete', table: 'athletes', id });
}

async function saveHistoryHybrid(entry) {
  const localEntry = {
    id: entry.id || generateUUID(),
    date: entry.entry_date, note: entry.note || '',
    weight: String(entry.weight||''), sprint: String(entry.sprint||''),
    vo2: String(entry.vo2||''), speed: String(entry.speed||''),
    strength: String(entry.strength||''), endurance: String(entry.endurance||''),
  };
  const savedEntry = await saveOfflineHistoryEntry(entry.athlete_id, localEntry);
  if (!historyData[entry.athlete_id]) historyData[entry.athlete_id] = [];
  historyData[entry.athlete_id].push(savedEntry);

  if (OFFLINE_ONLY) return { error: null };

  if (!OFFLINE_ONLY && isOnline) {
    try {
      const { error } = await db.from('performance_history').insert(entry);
      if (!error) return { error: null };
    } catch(e) {}
  }
  addToQueue({ type: 'insert', table: 'performance_history', data: entry });
  toast('💾 Mesure sauvegardée localement', 'info');
  return { error: null };
}

/* ── SYNCHRONISATION DISTANTE FACULTATIVE ────────────────── */
// Rejoue les opérations en attente et ne retire de la file que celles traitées avec succès.
async function syncOfflineToSupabase() {
  const queue = getOfflineData(OFK.QUEUE) || [];
  if (!queue.length) return;

  toast(`🔄 Synchronisation de ${queue.length} action(s)…`, 'info');

  const failed = [];
  for (const action of queue) {
    try {
      if (action.table === 'athletes') {
        if (action.type === 'insert') await db.from('athletes').upsert(action.data);
        else if (action.type === 'update') await db.from('athletes').update(action.data).eq('id', action.id);
        else if (action.type === 'delete') await db.from('athletes').delete().eq('id', action.id);
      } else if (action.table === 'performance_history') {
        await db.from('performance_history').upsert(action.data);
      }
    } catch(e) {
      failed.push(action);
    }
  }

  setOfflineData(OFK.QUEUE, failed);


  if (!failed.length) {
    toast(`✅ ${queue.length} action(s) synchronisée(s) !`, 'success');
    // Recharger les données depuis Supabase.
    await loadAthletesHybrid();
    await loadAllHistoryHybrid();
    renderDashboard();
  } else {
    toast(`⚠️ ${failed.length} action(s) non synchronisée(s)`, 'error');
  }
}

/* ── ÉTAT HORS LIGNE DANS LES PARAMÈTRES ─────────────────── */
function getOfflineStatus() {
  const queue  = getOfflineData(OFK.QUEUE) || [];
  const last   = getOfflineData(OFK.LAST_SYNC);
  return {
    isOnline,
    pendingSync: queue.length,
    lastSync: last ? new Date(last).toLocaleString('fr-FR') : 'Jamais',
    cachedAthletes: athletes.length,
  };
}


/* ══ CONFIGURATION ══════════════════════════════════════════
   ⚠️  Remplacez ces deux valeurs par les vôtres
   Tableau de bord Supabase → Paramètres → API
   ═══════════════════════════════════════════════════════════ */
const SUPABASE_URL  = 'https://xmajjadlogqmfprjxmnc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWpqYWRsb2dxbWZwcmp4bW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzgxMDQsImV4cCI6MjA5NjQxNDEwNH0.bmNOHgtHJztWGCXKn7T9gAcqc_SS8NxROABq2UbD4oM';

/* Client désactivé temporairement : l'application fonctionne en local. */
const db = null;

/* ══ ÉTAT PARTAGÉ DE L'APPLICATION ═════════════════════════ */
let currentUser      = null;
let athletes         = [];
let historyData      = {};
let editPhotoData    = null;   // Aperçu local encodé en base64.
let editPhotoFile    = null;   // Fichier photo sélectionné pour l'envoi.
let editVideos       = [];     // Médias vidéo : nom et URL ou aperçu local.
let openAthleteId    = null;
let historyAthleteId = null;
let currentPage      = 'dashboard';
let pinVerified      = false;
let pinLockTimer     = null;
let progressionYearFilter = 'all';
let progressionAthleteId  = null;
let _pinCallback     = null;
let _pinRequiredLevel= 'admin';
let _pinAttempts     = 0;
let _pinBlockedUntil = 0;
let _pinDigits       = [];
let toastT           = null;


/* ══ INDICATEUR DE CHARGEMENT ══════════════════════════════ */
function showLoading(show) {
  let el = document.getElementById('sd-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sd-loading';
    el.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:rgba(10,15,30,.85);backdrop-filter:blur(6px)',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px'
    ].join(';');
    el.innerHTML = `
      <img src="sportdata-logo.png" alt="SportData"
        style="width:min(220px,60vw);height:auto;object-fit:contain;animation:sdLoadingPulse 1.8s ease-in-out infinite"/>
      <p style="color:#94a3b8;font-size:14px;font-family:'DM Sans',sans-serif" id="sd-loading-msg">
        Chargement…
      </p>
      <style>@keyframes sdLoadingPulse{50%{opacity:.72;transform:scale(.98)}}</style>`;
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
}
function setLoadingMsg(msg) {
  const el = document.getElementById('sd-loading-msg');
  if (el) el.textContent = msg;
}

/* ══ INITIALISATION ET GESTION DES ÉVÉNEMENTS ══════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  translatePage();
  loadCachedSubscriptionRate();
  renderOfferPrices();
  refreshSubscriptionRate();
  showLoading(true);
  setLoadingMsg('Chargement du mode local…');

  const savedUser = getOfflineData('sportdata_local_session');
  if (savedUser) {
    currentUser = savedUser;
    await bootApp();
  } else {
    showLoading(false);
    startIntroSequence();
  }

  // Raccourcis clavier disponibles dans toute l'application.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAthleteModal(); closeHistoryModal();
      const qsb = document.getElementById('quick-search-bar');
      if (qsb && !qsb.classList.contains('hidden')) toggleSearch();
      const pin = document.getElementById('pin-modal');
      if (pin && !pin.classList.contains('hidden')) closePinModal();
    }
    const pin = document.getElementById('pin-modal');
    if (pin && !pin.classList.contains('hidden')) {
      if (e.key >= '0' && e.key <= '9') { pinKeyPress(e.key); e.preventDefault(); }
      if (e.key === 'Backspace') { pinKeyPress('del'); e.preventDefault(); }
    }
  });
});

/* ══ AUTHENTIFICATION ET PRÉSENTATION ══════════════════════ */
let selectedOffer = null;

function showScreen(s) {
  document.querySelectorAll('.auth-screen').forEach(x => x.classList.remove('active'));
  const el = document.getElementById('screen-' + s);
  if (el) el.classList.add('active');
  if (s === 'offer') refreshSubscriptionRate();
}

function loadCachedSubscriptionRate() {
  const cached = getOfflineData(SUBSCRIPTION_RATE_KEY);
  if (!cached || !Number.isFinite(cached.rate) || cached.rate <= 0) return;
  xofPerUsdRate = cached.rate;
  rateUpdatedAt = cached.updatedAt || null;
  rateStatusKind = rateUpdatedAt ? 'cached' : 'indicative';
}

function formatSubscriptionPrice(amount, currency) {
  const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
  if (currency === 'XOF') {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)} XOF`;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getOfferPrices(amountXof) {
  return {
    XOF: formatSubscriptionPrice(amountXof, 'XOF'),
    EUR: formatSubscriptionPrice(amountXof * EUR_PER_XOF, 'EUR'),
    USD: formatSubscriptionPrice(amountXof / xofPerUsdRate, 'USD'),
  };
}

function renderOfferPrices() {
  const amounts = { monthly: 20000, annual: 220000 };
  Object.entries(amounts).forEach(([plan, amount]) => {
    const xofElement = document.querySelector(`[data-offer-xof="${plan}"]`);
    const eurElement = document.querySelector(`[data-offer-currency="${plan}-eur"]`);
    const usdElement = document.querySelector(`[data-offer-currency="${plan}-usd"]`);
    const prices = getOfferPrices(amount);
    if (xofElement) xofElement.textContent = prices.XOF;
    if (eurElement) eurElement.textContent = prices.EUR;
    if (usdElement) usdElement.textContent = prices.USD;
  });

  const rateStatus = document.getElementById('offer-rate-status');
  if (!rateStatus) return;
  const rate = formatSubscriptionPrice(xofPerUsdRate, 'XOF');
  if (rateStatusKind !== 'indicative' && rateUpdatedAt) {
    const updated = new Date(rateUpdatedAt);
    const date = Number.isNaN(updated.getTime())
      ? ''
      : updated.toLocaleDateString(currentLanguage === 'fr' ? 'fr-FR' : 'en-US');
    const status = rateStatusKind === 'live' ? tr('Taux USD actualisé le') : tr('Dernier taux USD enregistré le');
    const source = rateStatusKind === 'live'
      ? tr(' — taux actualisé en ligne.')
      : `${tr('. Taux EUR fixe : 1 EUR = 655,957 XOF.')}${tr(' (taux enregistré hors connexion).')}`;
    rateStatus.textContent = `${status} ${date}: 1 USD = ${rate}${source}`;
  } else {
    rateStatus.textContent = `${tr('Taux USD indicatif : 1 USD =')} ${rate}${tr(' XOF. Mise à jour indisponible, taux indicatif utilisé.')}`;
  }
}

async function refreshSubscriptionRate() {
  if (!navigator.onLine || Date.now() - lastRateCheck < 15 * 60 * 1000) return;
  lastRateCheck = Date.now();
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/XOF', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Exchange-rate service returned HTTP ${response.status}`);
    const data = await response.json();
    const usdPerXof = data?.result === 'success' ? Number(data.rates?.USD) : NaN;
    if (!Number.isFinite(usdPerXof) || usdPerXof <= 0) {
      throw new Error('Exchange-rate service returned an invalid USD rate');
    }

    xofPerUsdRate = 1 / usdPerXof;
    rateUpdatedAt = new Date((Number(data.time_last_update_unix) || Date.now() / 1000) * 1000).toISOString();
    rateStatusKind = 'live';
    try {
      localStorage.setItem(SUBSCRIPTION_RATE_KEY, JSON.stringify({
        rate: xofPerUsdRate,
        updatedAt: rateUpdatedAt,
      }));
    } catch (error) {
      console.warn('Unable to cache the refreshed subscription USD rate:', error);
    }
    renderOfferPrices();
  } catch (error) {
    console.warn('Unable to refresh the subscription USD rate; using the last saved rate:', error);
    renderOfferPrices();
  }
}

function selectOffer(plan, card) {
  const offers = {
    monthly: { name: 'Abonnement mensuel', amountXof: 20000 },
    annual: { name: 'Abonnement annuel', amountXof: 220000 },
  };
  const offer = offers[plan];
  if (!offer || !card || card.disabled) return;

  selectedOffer = { plan, ...offer, prices: getOfferPrices(offer.amountXof), xofPerUsdRate };
  document.querySelectorAll('.offer-plan').forEach(item => {
    item.disabled = true;
    item.classList.toggle('is-zooming', item === card);
    item.classList.toggle('is-dimmed', item !== card);
  });
  document.getElementById('selected-offer-name').textContent = tr(offer.name);
  document.getElementById('selected-offer-price').textContent =
    `${selectedOffer.prices.XOF} · ${selectedOffer.prices.EUR} · ${selectedOffer.prices.USD}`;
  document.getElementById('signup-error').classList.add('hidden');

  window.setTimeout(() => {
    document.querySelectorAll('.offer-plan').forEach(item => {
      item.disabled = false;
      item.classList.remove('is-zooming', 'is-dimmed');
    });
    showScreen('signup');
    document.getElementById('signup-fname').focus();
  }, 420);
}

/* ── Introduction animée façon "vidéo" — 100% locale, sans
   fichier vidéo (préserve le cache offline et le poids de l'app) ── */
const INTRO_LINES_FR = [
  'Suivez les profils et les performances de chaque athlète.',
  'Retrouvez vos données sur cet appareil, même hors ligne.',
  'Visualisez les progrès et repérez les prochains talents.',
];
const INTRO_LINES_EN = [
  'Track every athlete’s profile and performance.',
  'Keep your data on this device, even offline.',
  'See progress clearly and discover tomorrow’s talent.',
];
const INTRO_LINES = currentLanguage === 'en' ? INTRO_LINES_EN : INTRO_LINES_FR;

// Affiche la présentation ou la connexion selon que l'utilisateur l'a déjà vue.
function startIntroSequence(){
  translatePage();
  introInitCanvas();
  if (sessionStorage.getItem('sportdata_intro_seen')) { showScreen('login'); return; }
  showScreen('intro');
  introRevealLines();
  introStartAthlete();
}

function replayIntro(){
  sessionStorage.removeItem('sportdata_intro_seen');
  startIntroSequence();
}

function skipIntro(){ finishIntro(); }

function finishIntro(){
  sessionStorage.setItem('sportdata_intro_seen', '1');
  introStopAthlete();
  showScreen('login');
}

function introRevealLines(){
  const box = document.getElementById('intro-lines');
  const actions = document.getElementById('intro-actions');
  if (!box) return;
  box.innerHTML = '';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  INTRO_LINES.forEach((line, idx) => {
    const p = document.createElement('p');
    p.className = 'intro-line';
    p.textContent = line;
    if (reduceMotion) p.classList.add('show');
    box.appendChild(p);
    if (!reduceMotion) setTimeout(() => p.classList.add('show'), 180 + idx * 280);
  });
  const total = reduceMotion ? 0 : 180 + INTRO_LINES.length * 280 + 250;
  setTimeout(() => actions?.classList.remove('hidden'), total);
}

/* Champ de particules connectées — effet "réseau de données" */
// Dessine un réseau animé de particules sans charger d'image ni de vidéo externe.
function introInitCanvas(){
  const canvas = document.getElementById('intro-canvas');
  if (!canvas || canvas._sdInited) return;
  canvas._sdInited = true;
  const ctx = canvas.getContext('2d');
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas._sdWidth = rect.width;
    canvas._sdHeight = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const N = window.innerWidth < 640 ? 26 : 46;
  const pts = Array.from({length:N}, () => ({
    x: Math.random()*canvas._sdWidth, y: Math.random()*canvas._sdHeight,
    vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3,
  }));

  let raf;
  function tick(){
    ctx.clearRect(0,0,canvas._sdWidth,canvas._sdHeight);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas._sdWidth)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas._sdHeight) p.vy *= -1;
    });
    for (let i=0;i<N;i++){
      for (let j=i+1;j<N;j++){
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if (d<140){
          ctx.strokeStyle = `rgba(34,211,238,${0.14*(1-d/140)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = 'rgba(34,211,238,0.75)';
    pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x,p.y,1.6,0,Math.PI*2); ctx.fill(); });
    raf = requestAnimationFrame(tick);
  }
  tick();

  // Arrête l'animation uniquement lorsque le masque d'authentification disparaît
  // après une connexion réussie, et non lors d'un simple changement d'écran.
  const overlayEl = document.getElementById('auth-overlay');
  const observer = new MutationObserver(() => {
    if (overlayEl.style.display === 'none') {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas._sdInited = false;
    }
  });
  if (overlayEl) observer.observe(overlayEl, {attributes:true, attributeFilter:['style']});
}

/* ── SQUELETTE 3D ANIMÉ (page de présentation) ────────────────
   Rotation calculée mathématiquement à chaque frame (rotation
   autour de l'axe Y, projection avec effet de profondeur) et
   dessinée sur canvas — pas de modèle 3D externe, tout est
   généré localement. ── */
const HOLO_POINTS = {
  head:      {x:0,   y:-98, z:0},
  neck:      {x:0,   y:-78, z:0},
  shoulderL: {x:-24, y:-70, z:2},
  shoulderR: {x:24,  y:-70, z:2},
  elbowL:    {x:-36, y:-40, z:14},
  elbowR:    {x:36,  y:-40, z:14},
  handL:     {x:-32, y:-8,  z:20},
  handR:     {x:32,  y:-8,  z:20},
  hipMid:    {x:0,   y:-2,  z:0},
  hipL:      {x:-15, y:-2,  z:0},
  hipR:      {x:15,  y:-2,  z:0},
  kneeL:     {x:-18, y:36,  z:10},
  kneeR:     {x:18,  y:36,  z:10},
  footL:     {x:-16, y:76,  z:4},
  footR:     {x:16,  y:76,  z:4},
};
const HOLO_EDGES = [
  ['neck','head'], ['neck','shoulderL'], ['neck','shoulderR'],
  ['shoulderL','elbowL'], ['elbowL','handL'],
  ['shoulderR','elbowR'], ['elbowR','handR'],
  ['neck','hipMid'], ['hipL','hipR'],
  ['hipL','kneeL'], ['kneeL','footL'],
  ['hipR','kneeR'], ['kneeR','footR'],
];

let holoRaf = null, holoTheta = 0, holoRunning = false, holoResizeFn = null;

// Anime le squelette de l'athlète sur le canevas et l'adapte à son conteneur.
function introStartAthlete(){
  const canvas = document.getElementById('holo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (holoResizeFn) window.removeEventListener('resize', holoResizeFn);
  holoResizeFn = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas._sdWidth = rect.width;
    canvas._sdHeight = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  holoResizeFn();
  window.addEventListener('resize', holoResizeFn);
  holoRunning = true;

  function project(p, theta, t){
    const cos = Math.cos(theta), sin = Math.sin(theta);
    return {
      x: p.x*cos + p.z*sin,
      z: -p.x*sin + p.z*cos,
      y: p.y + Math.sin(t*0.0015)*3, // légère respiration
    };
  }

  function tick(t){
    if (!holoRunning) return;
    ctx.clearRect(0,0,canvas._sdWidth,canvas._sdHeight);
    const cx = canvas._sdWidth/2, cy = canvas._sdHeight/2 + 6;
    holoTheta += 0.008;

    const proj = {};
    Object.entries(HOLO_POINTS).forEach(([k,p]) => { proj[k] = project(p, holoTheta, t||0); });

    // Plateforme de scan au sol
    ctx.strokeStyle = 'rgba(34,211,238,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy+82, 55, 12, 0, 0, Math.PI*2);
    ctx.stroke();

    // Tri peintre : dessiner du plus loin au plus proche pour un rendu cohérent
    const order = HOLO_EDGES.slice().sort((a,b) => {
      const za = (proj[a[0]].z+proj[a[1]].z)/2, zb = (proj[b[0]].z+proj[b[1]].z)/2;
      return za-zb;
    });
    order.forEach(([k1,k2]) => {
      const p1=proj[k1], p2=proj[k2];
      const depth = ((p1.z+p2.z)/2 + 25)/50;
      ctx.strokeStyle = `rgba(34,211,238,${Math.max(0.35,Math.min(1,0.5+depth*0.5))})`;
      ctx.lineWidth = Math.max(1, 1.2+depth*1.6);
      ctx.beginPath();
      ctx.moveTo(cx+p1.x, cy+p1.y);
      ctx.lineTo(cx+p2.x, cy+p2.y);
      ctx.stroke();
    });

    // Articulations (points lumineux)
    Object.entries(proj).forEach(([k,p]) => {
      if (k==='head') return;
      const depth = (p.z+25)/50;
      ctx.fillStyle = `rgba(125,211,252,${Math.max(0.4,Math.min(1,0.55+depth*0.45))})`;
      ctx.beginPath();
      ctx.arc(cx+p.x, cy+p.y, Math.max(1.6,2+depth*1.4), 0, Math.PI*2);
      ctx.fill();
    });

    // Tête (halo lumineux)
    const h = proj.head, hDepth = (h.z+25)/50;
    ctx.save();
    ctx.shadowColor = 'rgba(34,211,238,0.8)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = `rgba(34,211,238,${Math.max(0.5,Math.min(1,0.6+hDepth*0.4))})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx+h.x, cy+h.y, 11, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    holoRaf = requestAnimationFrame(tick);
  }
  holoRaf = requestAnimationFrame(tick);
}

function introStopAthlete(){
  holoRunning = false;
  if (holoRaf) cancelAnimationFrame(holoRaf);
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if (!email || !pass) { showErr(errEl, 'Veuillez remplir tous les champs.'); return; }

  const loginBtn = document.querySelector('#screen-login .btn-primary');
  if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Connexion…'; }

  if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = '<span>Se connecter</span>'; }

  const users = getOfflineData('sportdata_local_users') || [];
  const user = users.find(item => item.email.toLowerCase() === email.toLowerCase() && item.password === pass)
    || (email.toLowerCase() === 'admin@sportdata.africa' && pass === 'admin123'
      ? { id: 'local-admin', email, fname: 'Admin', lname: '', org: 'SportData', role: 'admin' }
      : null);
  if (!user) {
    showErr(errEl, 'Email ou mot de passe incorrect.');
    return;
  }
  currentUser = { ...user };
  delete currentUser.password;
  setOfflineData('sportdata_local_session', currentUser);
  await bootApp();
}

async function handleSignup(event) {
  event.preventDefault();
  const fname = document.getElementById('signup-fname').value.trim();
  const lname = document.getElementById('signup-lname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const org   = document.getElementById('signup-org').value.trim();
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');

  if (!selectedOffer) {
    showErr(errEl, 'Veuillez d’abord choisir une offre.');
    return;
  }
  if (!fname || !lname || !email || !org) {
    showErr(errEl, 'Veuillez remplir tous les champs obligatoires.'); return;
  }

  const paymentUrls = {
    monthly: 'https://formulaire-pro.xpaye.africa/formulaire/7773',
    annual: 'https://formulaire-pro.xpaye.africa/formulaire/7774',
  };
  const paymentUrl = paymentUrls[selectedOffer.plan];
  if (!paymentUrl) {
    showErr(errEl, 'Le lien de paiement de cette offre n’est pas configuré.');
    return;
  }
  window.location.assign(paymentUrl);
}

async function handleLogout() {
  currentUser = null; athletes = []; historyData = {};
  setOfflineData('sportdata_local_session', null);
  pinVerified = false;
  if (pinLockTimer) clearTimeout(pinLockTimer);
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-overlay').style.display = 'flex';
  showScreen('login');
}

function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

/* ══ PROFIL UTILISATEUR ═════════════════════════════════════ */
async function loadProfile(user) {
  const { data } = await db.from('profiles').select('*').eq('id', user.id).single();
  return {
    id:    user.id,
    email: user.email,
    fname: data?.fname || user.user_metadata?.fname || 'Utilisateur',
    lname: data?.lname || user.user_metadata?.lname || '',
    org:   data?.org   || user.user_metadata?.org   || '',
    role:  data?.role  || 'scout',
  };
}

/* ══ DÉMARRAGE DE L'APPLICATION ═════════════════════════════ */
// Charge les données nécessaires avant d'afficher le tableau de bord.
async function bootApp() {
  setLoadingMsg('Chargement des données…');
  await Promise.all([loadAthletes(), loadAllHistory()]);
  showLoading(false);

  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sidebar-name').textContent =
    `${currentUser.fname} ${currentUser.lname}`;
  document.getElementById('sidebar-avatar').textContent =
    (currentUser.fname[0] || 'A').toUpperCase();
  document.getElementById('sidebar-org').textContent =
    currentUser.org || 'Scout / Coach';

  navigate('dashboard');
  await renderNotifDot();
}

/* ══ CHARGEMENT DISTANT (SI OFFLINE_ONLY EST DÉSACTIVÉ) ═══ */
async function loadAthletes() { return loadAthletesHybrid(); }
async function _loadAthletes_supabase() {
  const { data, error } = await db
    .from('athletes')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('loadAthletes:', error); return; }
  athletes = (data || []).map(dbToAthlete);
}

async function loadAllHistory() { return loadAllHistoryHybrid(); }
async function _loadAllHistory_supabase() {
  const { data, error } = await db
    .from('performance_history')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('entry_date', { ascending: true });

  if (error) { console.error('loadAllHistory:', error); return; }
  historyData = {};
  (data || []).forEach(r => {
    if (!historyData[r.athlete_id]) historyData[r.athlete_id] = [];
    historyData[r.athlete_id].push(dbToHistory(r));
  });
}

/* ══ CONVERSION ENTRE LA BASE ET L'APPLICATION ═════════════ */
// Garder ces correspondances à jour lors de l'ajout ou du renommage d'un champ athlète.
function dbToAthlete(r) {
  const n = v => (v !== null && v !== undefined) ? String(v) : '';
  return {
    id: r.id, name: r.name, age: n(r.age), sport: r.sport,
    gender: r.gender||'',
    email: r.email||'', country: r.country||'', city: r.city||'', level: r.level||'',
    position: r.position||'',
    height: n(r.height), weight: n(r.weight), armspan: n(r.armspan),
    leglength: n(r.leglength), chest: n(r.chest), waist: n(r.waist),
    sprint: n(r.sprint), jump: n(r.jump), vo2: n(r.vo2), speed: n(r.speed),
    strength: n(r.strength), endurance: n(r.endurance),
    hr: n(r.hr), bodyfat: n(r.bodyfat), muscle: n(r.muscle), flexibility: n(r.flexibility),
    notes: r.notes||'',
    photo: r.photo_url || null,
    videos: Array.isArray(r.video_urls) ? r.video_urls : [],
    createdAt: new Date(r.created_at).getTime(),
  };
}

function dbToHistory(r) {
  const n = v => (v !== null && v !== undefined) ? String(v) : '';
  return {
    id: r.id, date: r.entry_date, note: r.note||'',
    weight: n(r.weight), sprint: n(r.sprint), vo2: n(r.vo2),
    speed: n(r.speed), strength: n(r.strength), endurance: n(r.endurance),
  };
}

function athleteToDb(a) {
  const num = x => (x !== '' && x !== null && x !== undefined) ? parseFloat(x) : null;
  return {
    user_id: currentUser.id,
    name: a.name, sport: a.sport,
    age: num(a.age), email: a.email||null, country: a.country||null,
    city: a.city||null, level: a.level||null,
    position: a.position||null,
    gender: a.gender||null,
    height: num(a.height), weight: num(a.weight),
    armspan: num(a.armspan), leglength: num(a.leglength),
    chest: num(a.chest), waist: num(a.waist),
    sprint: num(a.sprint), jump: num(a.jump),
    vo2: num(a.vo2), speed: num(a.speed),
    strength: num(a.strength), endurance: num(a.endurance),
    hr: num(a.hr), bodyfat: num(a.bodyfat),
    muscle: num(a.muscle), flexibility: num(a.flexibility),
    notes: a.notes||null,
  };
}

async function upsertAthleteWithFallback(dbData, editId) {
  const primary = editId
    ? await db.from('athletes').update(dbData).eq('id', editId)
    : await db.from('athletes').insert(dbData);
  if (!primary.error) return primary;

  const message = primary.error.message || '';
  if (!message.includes("Could not find the 'gender' column")) {
    return primary;
  }

  return await rawAthleteUpsert(dbData, editId);
}

async function rawAthleteUpsert(dbData, editId) {
  console.log('rawAthleteUpsert: start', { editId, data: dbData });
  const { data: { session } } = await db.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { error: { message: 'Impossible de récupérer le token d’authentification.' } };
  }

  const url = `${SUPABASE_URL}/rest/v1/athletes${editId ? `?id=eq.${encodeURIComponent(editId)}` : ''}`;
  const method = editId ? 'PATCH' : 'POST';
  const headers = {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(dbData),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      console.warn('rawAthleteUpsert: non-ok response', response.status, err);
      return { error: { message: err.message || response.statusText } };
    }

    const data = await response.json().catch(() => null);
    return { error: null, data };
  } catch (e) {
    console.error('rawAthleteUpsert: fetch failed', e);
    return { error: { message: e.message || 'Fetch failed' } };
  }
}

/* ══ ENVOI FACULTATIF DES MÉDIAS VERS LE STOCKAGE DISTANT ═ */
async function uploadPhoto(file, athleteId) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${currentUser.id}/${athleteId}/photo.${ext}`;
  const { error } = await db.storage
    .from('athlete-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('uploadPhoto:', error); return null; }
  return db.storage.from('athlete-photos').getPublicUrl(path).data.publicUrl;
}

async function uploadVideo(file, athleteId, idx) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${currentUser.id}/${athleteId}/video_${idx}_${Date.now()}.${ext}`;
  const { error } = await db.storage
    .from('athlete-videos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('uploadVideo:', error); return null; }
  return {
    name: file.name,
    data: db.storage.from('athlete-videos').getPublicUrl(path).data.publicUrl,
  };
}

async function deleteStorageFiles(athleteId) {
  for (const bucket of ['athlete-photos', 'athlete-videos']) {
    try {
      const { data: files } = await db.storage
        .from(bucket).list(`${currentUser.id}/${athleteId}`);
      if (files?.length) {
        await db.storage.from(bucket)
          .remove(files.map(f => `${currentUser.id}/${athleteId}/${f.name}`));
      }
    } catch(e) { console.warn('deleteStorageFiles:', e); }
  }
}

/* ══ CRÉATION, MODIFICATION ET SUPPRESSION D'ATHLÈTES ══════ */
// Valide le formulaire, enregistre l'athlète et ses médias, puis actualise les vues concernées.
async function saveAthlete() {
  console.log('saveAthlete: start');
  try {
    if (!validateAthleteForm()) {
      console.log('saveAthlete: validation failed');
      return;
    }

    const name  = gv('f-name');
    const sport = gv('f-sport');
    const editId = gv('f-edit-id');
    const isEdit = !!editId;
    const athleteId = editId || generateUUID();
    console.log('saveAthlete: form values', { name, sport, editId, athleteId, isEdit });

    showLoading(true);
    setLoadingMsg(isEdit ? 'Mise à jour…' : 'Enregistrement…');

  // Envoyer la photo si un nouveau fichier a été sélectionné.
  let photoUrl = editPhotoData; // URL existante ou valeur nulle.
  if (editPhotoFile && !OFFLINE_ONLY) {
    setLoadingMsg('Upload photo…');
    photoUrl = await uploadPhoto(editPhotoFile, athleteId);
  }

  // Envoyer les nouvelles vidéos.
  let videoUrls = editVideos.filter(v => v.data && v.data.startsWith('http'));
  const pendingVideos = editVideos.filter(v => v.pendingUpload && v.blob instanceof Blob);
  for (let i = 0; i < pendingVideos.length && !OFFLINE_ONLY; i++) {
    setLoadingMsg(`Upload vidéo ${i+1}/${pendingVideos.length}…`);
    const result = await uploadVideo(pendingVideos[i].blob, athleteId, i);
    if (result) videoUrls.push(result);
  }
  const localVideos = editVideos.map(({ name, data, blob, type }) => ({
    name,
    ...(data?.startsWith('http') || data?.startsWith('data:') ? { data } : {}),
    ...(blob instanceof Blob ? { blob, type: type || blob.type } : {}),
  }));

  const dbData = {
    ...athleteToDb({
      name, sport,
      gender: gv('f-gender'),
      age: gv('f-age'), email: gv('f-email'), country: gv('f-country'),
      city: gv('f-city'), level: gv('f-level'), position: gv('f-position'),
      height: gv('f-height'), weight: gv('f-weight'),
      armspan: gv('f-armspan'), leglength: gv('f-leglength'),
      chest: gv('f-chest'), waist: gv('f-waist'),
      sprint: gv('f-sprint'), jump: gv('f-jump'),
      vo2: gv('f-vo2'), speed: gv('f-speed'),
      strength: gv('f-strength'), endurance: gv('f-endurance'),
      hr: gv('f-hr'), bodyfat: gv('f-bodyfat'),
      muscle: gv('f-muscle'), flexibility: gv('f-flexibility'),
      notes: gv('f-notes'),
    }),
    id: athleteId,
    photo_url: photoUrl,
    video_urls: videoUrls,
  };

  console.log('saveAthlete: ready to save dbData', dbData);
  const { error } = await saveAthleteHybrid(dbData, editId, localVideos);

  if (error) {
    showLoading(false);
    console.log('saveAthlete: saveAthleteHybrid returned error', error);
    toast('Erreur : ' + error.message, 'error');
    console.error(error);
    return;
  }

  setLoadingMsg('Synchronisation…');
  await loadAthletes();
  showLoading(false);

  const msg = isEdit ? `${name} mis à jour !` : `${name} ajouté à l'effectif !`;
  toast(msg, 'success');
  await addNotif(isEdit ? `✏️ ${name} modifié.` : `✅ Nouvel athlète : ${name} (${sport}).`);
  resetAthleteForm();
  navigate('athletes');
  } catch (e) {
    showLoading(false);
    console.error('saveAthlete: unexpected error', e);
    toast(`Impossible de sauvegarder sur la tablette : ${e.message || 'erreur de stockage local.'}`, 'error');
  }
}

async function deleteAthlete(id) {
  const a = athletes.find(x => x.id === id);
  const name = a ? a.name : 'Athlète';
  showLoading(true); setLoadingMsg('Suppression…');

  if (OFFLINE_ONLY) {
    await deleteAthleteHybrid(id);
    delete historyData[id];
    showLoading(false);
    toast(`${name} supprimé.`, 'error');
    await addNotif(`🗑️ ${name} supprimé de l'effectif.`, 'error');
    renderAthletes(); renderDashboard();
    return;
  }

  // Supprimer historique lié
  await db.from('performance_history').delete().eq('athlete_id', id);

  // Supprimer l'athlète
  const { error } = await db.from('athletes').delete().eq('id', id);
  if (error) {
    showLoading(false);
    toast('Erreur suppression : ' + error.message, 'error'); return;
  }

  // Supprimer les fichiers du stockage distant.
  await deleteStorageFiles(id);

  await loadAthletes();
  delete historyData[id];
  showLoading(false);

  toast(`${name} supprimé.`, 'error');
  await addNotif(`🗑️ ${name} supprimé de l'effectif.`, 'error');
  renderAthletes(); renderDashboard();
}

function confirmDelete(id, e) {
  if (e) e.stopPropagation();
  openPinModal(() => {
    if (!confirm('Supprimer cet athlète ? Cette action est irréversible.')) return;
    deleteAthlete(id);
  }, 'pdg');
}

/* ══ GESTION DES PHOTOS ET VIDÉOS DU FORMULAIRE ════════════ */
function handlePhotoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  editPhotoFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    editPhotoData = ev.target.result;
    const p = document.getElementById('photo-preview');
    p.src = editPhotoData; p.classList.remove('hidden');
    document.getElementById('photo-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function handleVideoUpload(e) {
  Array.from(e.target.files).forEach(file => {
    const url = URL.createObjectURL(file);
    editVideos.push({ name: file.name, data: url, blob: file, type: file.type, pendingUpload: true });
  });
  e.target.value = '';
  renderVideoPreview();
}

function hydrateAthleteVideos(videos) {
  if (!Array.isArray(videos)) return [];
  return videos.map(video => {
    const item = typeof video === 'string' ? { name: 'Vidéo', data: video } : { ...video };
    if (item.blob instanceof Blob) {
      if (item.data?.startsWith('blob:')) URL.revokeObjectURL(item.data);
      item.data = URL.createObjectURL(item.blob);
      item.pendingUpload = false;
    }
    return item;
  });
}

function removeVideoPreview(index) {
  const video = editVideos[index];
  if (video?.data?.startsWith('blob:')) URL.revokeObjectURL(video.data);
  editVideos.splice(index, 1);
  renderVideoPreview();
}

/* ══ HISTORIQUE DES PERFORMANCES ═══════════════════════════ */
// Enregistre une mesure datée puis actualise l'historique et les vues de progression.
async function saveHistoryEntry() {
  const id   = document.getElementById('history-athlete-select')?.value;
  const date = document.getElementById('h-date')?.value;
  if (!id)   { toast('Sélectionnez un athlète.', 'error'); return; }
  if (!date) { toast('Choisissez une date.', 'error'); return; }

  const num = field => {
    const val = parseFloat(document.getElementById(field)?.value);
    return isNaN(val) ? null : val;
  };

  const entry = {
    athlete_id: id,
    user_id:    currentUser.id,
    entry_date: date,
    note:       document.getElementById('h-note')?.value || null,
    weight:     num('h-weight'), sprint:    num('h-sprint'),
    vo2:        num('h-vo2'),    speed:     num('h-speed'),
    strength:   num('h-strength'), endurance: num('h-endurance'),
  };

  const { error } = await saveHistoryHybrid(entry);
  if (error) { toast('Erreur : ' + error.message, 'error'); return; }

  await loadAllHistory();
  closeHistoryModal();
  toast('Mesure enregistrée !', 'success');
  const a = athletes.find(x => x.id === id);
  await addNotif(`📊 Nouvelle mesure pour ${a?.name || 'un athlète'}.`);
  renderHistory();
  if (currentPage === 'progression') renderProgression();
  if (window._progressionRefreshNeeded) {
    window._progressionRefreshNeeded = false;
    renderProgression();
  }
}

async function deleteHistoryEntry(athleteId, date) {
  if (!confirm('Supprimer cette mesure ?')) return;
  const entry = historyData[athleteId]?.find(e => e.date === date);
  if (OFFLINE_ONLY) {
    if (entry?.id) {
      await offlineTransaction(['history'], 'readwrite', transaction => {
        transaction.objectStore('history').delete(entry.id);
      });
    }
    historyData[athleteId] = (historyData[athleteId] || []).filter(item => item !== entry);
    toast('Mesure supprimée.', 'info');
    renderProgression();
    return;
  }
  if (!entry?.id) {
    // Solution de secours : supprimer la mesure à partir de sa date.
    await db.from('performance_history')
      .delete().eq('athlete_id', athleteId).eq('entry_date', date);
  } else {
    await db.from('performance_history').delete().eq('id', entry.id);
  }
  await loadAllHistory();
  toast('Mesure supprimée.', 'info');
  renderProgression();
}

/* ══ NOTIFICATIONS (MODE DISTANT UNIQUEMENT) ══════════════ */
async function addNotif(msg, type = 'info') {
  if (OFFLINE_ONLY) return;
  await db.from('notifications').insert({
    user_id: currentUser.id, message: msg, type,
  });
  await renderNotifDot();
}

async function renderNotifDot() {
  if (OFFLINE_ONLY) {
    const dot = document.getElementById('notif-dot');
    if (dot) dot.classList.add('hidden');
    return;
  }
  const { count } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id)
    .eq('read', false);
  const dot = document.getElementById('notif-dot');
  if (dot) dot.classList.toggle('hidden', !count);
}

async function toggleNotifPanel() {
  const p = document.getElementById('notif-panel');
  p.classList.toggle('hidden');
  if (OFFLINE_ONLY) return;
  if (!p.classList.contains('hidden')) {
    const { data } = await db
      .from('notifications').select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(25);
    const list = document.getElementById('notif-list');
    if (list) {
      list.innerHTML = (data||[]).length
        ? data.map(n => `
            <div class="notif-item">
              ${esc(n.message)}
              <span class="notif-time">${timeAgo(new Date(n.created_at).getTime())}</span>
            </div>`).join('')
        : '<p class="notif-empty">Aucune notification</p>';
    }
    // Marquer comme lu
    await db.from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id).eq('read', false);
    await renderNotifDot();
  }
}

async function clearNotifications() {
  if (OFFLINE_ONLY) return;
  await db.from('notifications').delete().eq('user_id', currentUser.id);
  const list = document.getElementById('notif-list');
  if (list) list.innerHTML = '<p class="notif-empty">Aucune notification</p>';
  await renderNotifDot();
}

/* ══ JOURNAL DES ACCÈS PIN (MODE DISTANT UNIQUEMENT) ══════ */
async function logPinAccess(status) {
  if (OFFLINE_ONLY) return;
  await db.from('pin_logs').insert({
    user_id:    currentUser.id,
    user_name:  `${currentUser.fname} ${currentUser.lname}`,
    user_email: currentUser.email,
    status,
    page: 'add-athlete',
  });
}

async function renderPinLogs() {
  const container = document.getElementById('pin-logs-list');
  if (!container) return;

  if (OFFLINE_ONLY) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:13px;text-align:center;padding:20px">Logs PIN locaux non disponibles.</p>';
    return;
  }

  const { data: logs } = await db
    .from('pin_logs').select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!logs?.length) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:13px;text-align:center;padding:20px">Aucun accès enregistré.</p>';
    return;
  }

  const total   = logs.length;
  const success = logs.filter(l => l.status === 'success').length;
  const fails   = total - success;
  const lastSucc = logs.find(l => l.status === 'success');

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div class="pin-log-stat">
        <span class="pin-log-stat-val">${total}</span>
        <span class="pin-log-stat-label">Total accès</span>
      </div>
      <div class="pin-log-stat" style="border-color:rgba(52,211,153,0.2)">
        <span class="pin-log-stat-val" style="color:var(--success)">${success}</span>
        <span class="pin-log-stat-label">Succès</span>
      </div>
      <div class="pin-log-stat" style="border-color:rgba(248,113,113,0.2)">
        <span class="pin-log-stat-val" style="color:var(--danger)">${fails}</span>
        <span class="pin-log-stat-label">Échecs</span>
      </div>
    </div>
    ${lastSucc ? `<p style="font-size:12px;color:var(--text-3);margin-bottom:12px">
      Dernier accès : <strong style="color:var(--text)">${esc(lastSucc.user_name)}</strong>
      — ${timeAgo(new Date(lastSucc.created_at).getTime())}
    </p>` : ''}
    <div class="pin-log-entries">
      ${logs.map(log => `
        <div class="pin-log-entry ${log.status}">
          <div class="pin-log-icon">
            ${log.status === 'success'
              ? '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8l4 4 6-6" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
              : '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M4 4l8 8M12 4l-8 8" stroke="#f87171" stroke-width="1.5" stroke-linecap="round"/></svg>'}
          </div>
          <div class="pin-log-info">
            <span class="pin-log-user">${esc(log.user_name || '—')}</span>
            <span class="pin-log-email">${esc(log.user_email || '—')}</span>
          </div>
          <div class="pin-log-meta">
            <span class="pin-log-status ${log.status}">${log.status === 'success' ? 'Succès' : 'Échec'}</span>
            <span class="pin-log-time">${timeAgo(new Date(log.created_at).getTime())}</span>
          </div>
        </div>`).join('')}
    </div>`;
}

async function clearPinLogs() {
  if (!confirm('Effacer tous les logs d\'accès PIN ?')) return;
  if (OFFLINE_ONLY) {
    toast('Les logs PIN locaux ne sont pas activés.', 'info');
    return;
  }
  await db.from('pin_logs').delete().eq('user_id', currentUser.id);
  await renderPinLogs();
  toast('Logs PIN effacés.', 'info');
}

/* ══ PARAMÈTRES UTILISATEUR ET BARÈMES DE PERFORMANCE ══════ */
// Remplit les paramètres selon le profil actif et le mode de stockage utilisé.
async function renderSettings() {
  if (!currentUser) return;
  const el = id => document.getElementById(id);
  if (el('s-fname')) el('s-fname').value = currentUser.fname || '';
  if (el('s-lname')) el('s-lname').value = currentUser.lname || '';
  if (el('s-org'))   el('s-org').value   = currentUser.org   || '';
  setText('settings-display-name',  `${currentUser.fname} ${currentUser.lname}`);
  setText('settings-display-email', currentUser.email);
  const av = el('settings-avatar-display');
  if (av) av.textContent = (currentUser.fname[0] || 'A').toUpperCase();
  setText('s-athlete-count', athletes.length);
  const storageLocation = OFFLINE_ONLY ? tr('Sur cet appareil') : tr('Compte en ligne');
  setText('s-storage-location', storageLocation);
  setText('about-storage-mode', storageLocation);
  setText('settings-storage-explanation', OFFLINE_ONLY
    ? tr('Les données restent dans ce navigateur, sur cet appareil. Elles ne se synchronisent pas avec vos autres appareils.')
    : tr('Les données sont associées à votre compte et accessibles en ligne.'));
  setText('settings-backup-note', OFFLINE_ONLY
    ? tr('La sauvegarde JSON est téléchargée sur cet appareil. Restaurer un fichier remplace les données actuelles : téléchargez d’abord une copie si vous souhaitez les conserver.')
    : tr('La sauvegarde JSON est téléchargée sur cet appareil. L’import ajoute ou met à jour les fiches présentes dans le fichier.'));
  el('settings-pin-logs')?.classList.toggle('hidden', OFFLINE_ONLY);
  const last = [...athletes].sort((a,b) => (b.createdAt||0)-(a.createdAt||0))[0];
  setText('s-last-added', last ? timeAgo(last.createdAt) : '—');
  // État de la session PIN
  const statusEl = el('pin-session-status');
  if (statusEl) {
    statusEl.textContent = pinVerified ? 'Active' : 'Inactive';
    statusEl.style.color = pinVerified ? 'var(--success)' : 'var(--text-3)';
  }
  await renderPinLogs();
  renderNormsEditor();
}

async function saveSettings() {
  const fname = document.getElementById('s-fname')?.value.trim();
  const lname = document.getElementById('s-lname')?.value.trim();
  const org   = document.getElementById('s-org')?.value.trim();
  if (!fname||!lname) { toast('Prénom et nom obligatoires.', 'error'); return; }

  if (!OFFLINE_ONLY) {
    const { error } = await db.from('profiles')
      .update({ fname, lname, org }).eq('id', currentUser.id);
    if (error) { toast('Erreur : ' + error.message, 'error'); return; }
  }

  currentUser = { ...currentUser, fname, lname, org };
  setOfflineData('sportdata_local_session', currentUser);
  document.getElementById('sidebar-name').textContent = `${fname} ${lname}`;
  document.getElementById('sidebar-avatar').textContent = fname[0].toUpperCase();
  document.getElementById('sidebar-org').textContent = org || 'Scout / Coach';
  toast('Profil mis à jour !', 'success');
  await renderSettings();
}

async function savePinChange() {
  const current = document.getElementById('pin-current')?.value;
  const newPin  = document.getElementById('pin-new')?.value;
  const confirm2 = document.getElementById('pin-confirm')?.value;
  const errEl   = document.getElementById('pin-change-error');

  const showPinErr = msg => {
    if (errEl) { errEl.textContent = msg; errEl.style.display='block'; }
  };

  if (!current||!newPin||!confirm2) { showPinErr('Tous les champs sont obligatoires.'); return; }

  // En mode distant, vérifier le PIN actuel à partir de la session.
  // En mode démo sur l'appareil, accepter la valeur DEFAULT_ADMIN_PIN.
  const storedPin = getPinStored('admin');
  if (current !== storedPin) { showPinErr('PIN actuel incorrect.'); return; }
  if (!/^\d{4,8}$/.test(newPin)) { showPinErr('Le PIN doit contenir 4 à 8 chiffres.'); return; }
  if (newPin !== confirm2) { showPinErr('Les deux PIN ne correspondent pas.'); return; }

  setPinStored(newPin);
  toast('PIN modifié !', 'success');
  await addNotif('🔑 PIN administrateur modifié.');
  ['pin-current','pin-new','pin-confirm'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  if (errEl) errEl.style.display='none';
  document.getElementById('change-pin-form')?.classList.add('hidden');
}

/* ══ EXPORTATION ET IMPORTATION DES DONNÉES LOCALES ═══════ */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Impossible de lire une vidéo pour la sauvegarde.'));
    reader.readAsDataURL(blob);
  });
}

// Télécharge une copie JSON, y compris les vidéos locales stockées dans IndexedDB.
async function exportDataJSON() {
  try {
    const exportedAthletes = await Promise.all(athletes.map(async athlete => ({
      ...athlete,
      videos: await Promise.all((athlete.videos || []).map(async video => {
        if (!(video.blob instanceof Blob)) return video;
        return { name: video.name, data: await blobToDataUrl(video.blob) };
      })),
    })));
    const data = {
      athletes: exportedAthletes,
      historyData,
      exportedAt: new Date().toISOString(),
      version: '3.0-supabase',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `sportdata_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Données exportées !', 'success');
  } catch (error) {
    console.error('exportDataJSON:', error);
    toast(`Export impossible : ${error.message || 'erreur de lecture des vidéos.'}`, 'error');
  }
}

// Vérifie le fichier importé avant de remplacer ou de compléter les données existantes.
async function importDataJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d.athletes || !Array.isArray(d.athletes)) throw new Error('Format invalide');
      const actionLabel = OFFLINE_ONLY ? tr('Restaurer') : tr('Importer');
      const countLabel = d.athletes.length === 1 ? tr('athlète') : tr('athlètes');
      const details = OFFLINE_ONLY
        ? tr('Cette action remplacera les fiches et l’historique actuellement enregistrés sur cet appareil.')
        : tr('Les fiches du fichier seront ajoutées ou mises à jour.');
      const importMessage = `${actionLabel} ${d.athletes.length} ${countLabel} ? ${details}`;
      if (!confirm(importMessage)) return;

      if (OFFLINE_ONLY) {
        const importedAthletes = d.athletes.filter(a => a && a.id);
        const importedHistory = Object.entries(d.historyData || {}).flatMap(([athleteId, entries]) =>
          (Array.isArray(entries) ? entries : []).map(entry => ({
            ...entry,
            id: entry.id || generateUUID(),
            athlete_id: athleteId,
          }))
        );
        await Promise.all([
          replaceOfflineRecords('athletes', importedAthletes),
          replaceOfflineRecords('history', importedHistory),
        ]);
        await Promise.all([loadAthletes(), loadAllHistory()]);
        toast(`${d.athletes.length} athlète(s) importé(s) !`, 'success');
        navigate('dashboard');
        return;
      }

      showLoading(true);
      let imported = 0;
      for (const a of d.athletes) {
        setLoadingMsg(`Import athlète ${++imported}/${d.athletes.length}…`);
        const dbData = {
          ...athleteToDb(a),
          id: a.id,
          photo_url:  a.photo && a.photo.startsWith('http') ? a.photo : null,
          video_urls: (a.videos||[]).filter(v => typeof v === 'object' && v.data?.startsWith('http')),
        };
        await db.from('athletes').upsert(dbData);
      }

      // Importer l'historique des mesures.
      if (d.historyData) {
        for (const [athleteId, entries] of Object.entries(d.historyData)) {
          for (const en of entries) {
            const num = x => parseFloat(en[x]) || null;
            await db.from('performance_history').upsert({
              athlete_id: athleteId, user_id: currentUser.id,
              entry_date: en.date, note: en.note||null,
              weight: num('weight'), sprint: num('sprint'),
              vo2: num('vo2'), speed: num('speed'),
              strength: num('strength'), endurance: num('endurance'),
            });
          }
        }
      }

      await Promise.all([loadAthletes(), loadAllHistory()]);
      showLoading(false);
      toast(`${d.athletes.length} athlètes importés !`, 'success');
      navigate('dashboard');
    } catch(err) {
      showLoading(false);
      toast(`Import impossible : ${err.message || 'erreur de stockage local.'}`, 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

async function clearAllData() {
  if (!confirm('⚠️ Supprimer TOUS les athlètes et l\'historique ? Irréversible !')) return;
  if (!confirm('Confirmez une seconde fois — action irréversible.')) return;
  showLoading(true);
  if (OFFLINE_ONLY) {
    await Promise.all([
      replaceOfflineRecords('athletes', []),
      replaceOfflineRecords('history', []),
    ]);
    setOfflineData(OFK.QUEUE, []);
    await Promise.all([loadAthletes(), loadAllHistory()]);
    showLoading(false);
    toast('Toutes les données supprimées.', 'error');
    navigate('dashboard');
    return;
  }
  await db.from('performance_history').delete().eq('user_id', currentUser.id);
  await db.from('athletes').delete().eq('user_id', currentUser.id);
  await Promise.all([loadAthletes(), loadAllHistory()]);
  showLoading(false);
  toast('Toutes les données supprimées.', 'error');
  navigate('dashboard');
}

/* ══ NAVIGATION ET PAGES PROTÉGÉES PAR LE CODE PIN ════════ */
// Applique les contrôles PIN puis affiche la page demandée et lance son rendu.
const TITLES = {
  dashboard:'Dashboard', athletes:'Athlètes', 'add-athlete':'Ajouter un athlète',
  progression:'Progression individuelle', analytics:'Analytiques',
  compare:'Comparaison', history:'Historique', media:'Médiathèque',
  reports:'Rapports PDF', settings:'Paramètres',
};

function navigate(page) {
  /* ── Garde PIN : bloquer la page d'ajout si le PIN n'est pas vérifié ── */
  if (page === 'add-athlete' && pinVerified !== 'admin' && pinVerified !== 'pdg') {
    // Ne pas modifier currentPage et ne pas afficher la page.
    openPinModal(() => {
      // Cette fonction de rappel s'exécute uniquement après validation du PIN.
      _showPage('add-athlete');
      resetAthleteForm();
      document.getElementById('form-page-title').textContent = 'Ajouter un athlète';
      document.getElementById('save-btn-text').textContent   = 'Sauvegarder';
      startPinLockTimer();
    }, 'admin');
    return; // Arrêter ici : la page reste masquée.
  }

  /* ── Garde PIN : accès Paramètres */
  if (page === 'settings' && pinVerified !== 'pdg') {
    openPinModal(() => {
      _showPage('settings');
      renderSettings();
      startPinLockTimer();
    }, 'pdg');
    return;
  }

  /* ── Navigation normale ── */
  _showPage(page);

  const renderMap = {
    dashboard:   renderDashboard,
    athletes:    renderAthletes,
    analytics:   renderAnalytics,
    compare:     renderComparePage,
    history:     renderHistoryPage,
    media:       renderMedia,
    reports:     renderReportsPage,
    settings:    renderSettings,
    progression: renderProgressionPage,
    'add-athlete': () => {
      resetAthleteForm();
      document.getElementById('form-page-title').textContent = 'Ajouter un athlète';
      document.getElementById('save-btn-text').textContent   = 'Sauvegarder';
      refreshSportSuggestions();
      startPinLockTimer();
    },
  };
  if (renderMap[page]) renderMap[page]();
  translatePage();
}

/* Affiche une page qui ne nécessite pas de vérification du code PIN administrateur. */
function _showPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById('page-' + page);
  if (t) t.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.page === page));
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = tr(TITLES[page] || '');
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ══ RÉINITIALISATION DU FORMULAIRE ATHLÈTE ════════════════ */
function resetAthleteForm() {
  document.getElementById('f-edit-id').value = '';
  ['f-name','f-gender','f-age','f-sport','f-email','f-country','f-city','f-level','f-position',
   'f-height','f-weight','f-armspan','f-leglength','f-chest','f-waist',
   'f-sprint','f-jump','f-vo2','f-speed','f-strength','f-endurance',
   'f-hr','f-bodyfat','f-muscle','f-flexibility','f-notes'
  ].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });

  editPhotoData = null; editPhotoFile = null;
  editVideos.forEach(video => {
    if (video.data?.startsWith('blob:')) URL.revokeObjectURL(video.data);
  });
  editVideos = [];
  progressionYearFilter = 'all';

  const p = document.getElementById('photo-preview');
  if(p) { p.src=''; p.classList.add('hidden'); }
  const ph = document.getElementById('photo-placeholder');
  if(ph) ph.classList.remove('hidden');
  const vpl = document.getElementById('video-preview-list');
  if(vpl) vpl.innerHTML = '';

  // Réinitialiser les états de validation.
  document.querySelectorAll('.field-error,.field-ok').forEach(el => {
    el.classList.remove('field-error','field-ok'); el.title='';
  });
  document.querySelectorAll('.field-error-msg').forEach(el => {
    el.classList.remove('visible'); el.textContent='';
  });
  document.getElementById('form-error-banner')?.classList.remove('visible');
  document.getElementById('duplicate-warning')?.classList.remove('visible');
  updateFormProgress();
}

function renderVideoPreview() {
  const c = document.getElementById('video-preview-list'); if(!c) return;
  c.innerHTML = editVideos.map((vd, i) => `
    <div class="video-preview-item">
      <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/>
        <path d="M6 6l4 2-4 2V6z" fill="currentColor"/>
      </svg>
      <span>${esc(vd.name)}</span>
      <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer"
        onclick="removeVideoPreview(${i})">✕</button>
    </div>`).join('');
}

function editAthlete(id) {
  const a = athletes.find(x => x.id === id); if(!a) return;
  const proceed = () => {
    _showPage('add-athlete');
    document.getElementById('form-page-title').textContent = "Modifier l'athlète";
    document.getElementById('save-btn-text').textContent   = 'Mettre à jour';
    const map = {
    'edit-id':'id', name:'name', gender:'gender', age:'age', sport:'sport', email:'email',
    country:'country', city:'city', level:'level', position:'position', height:'height', weight:'weight',
    armspan:'armspan', leglength:'leglength', chest:'chest', waist:'waist',
    sprint:'sprint', jump:'jump', vo2:'vo2', speed:'speed',
    strength:'strength', endurance:'endurance', hr:'hr', bodyfat:'bodyfat',
    muscle:'muscle', flexibility:'flexibility', notes:'notes',
  };
  Object.entries(map).forEach(([fid, key]) => {
    const el = document.getElementById('f-'+fid); if(el) el.value = a[key]||'';
  });
  refreshSportSuggestions();
  updatePositionSuggestions();
  if (a.photo) {
    editPhotoData = a.photo; editPhotoFile = null;
    const p = document.getElementById('photo-preview');
    p.src = a.photo; p.classList.remove('hidden');
    document.getElementById('photo-placeholder').classList.add('hidden');
  }
  editVideos = a.videos ? hydrateAthleteVideos(a.videos) : [];
  renderVideoPreview();
  updateFormProgress();
  };

  if (pinVerified === 'admin' || pinVerified === 'pdg') {
    proceed();
    return;
  }

  openPinModal(proceed, 'pdg');
}

/* ══ OUTILS PARTAGÉS POUR L'INTERFACE ET LES DONNÉES ═══════ */
function esc(s) {
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function gv(id) { const el=document.getElementById(id); return el && typeof el.value === 'string' ? el.value.trim() : ''; }
function uid()  { return generateUUID(); }
function generateUUID() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
  } catch (e) {
    console.warn('generateUUID: crypto.randomUUID unavailable', e);
  }
  try {
    const bytes = (window.crypto && typeof window.crypto.getRandomValues === 'function')
      ? window.crypto.getRandomValues(new Uint8Array(16))
      : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
  } catch (e) {
    const fallback = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    console.warn('generateUUID: fallback uuid used', e, fallback);
    return fallback;
  }
}
function initials(n) { if(!n) return '?'; return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function avg(arr)    { if(!arr||!arr.length) return 0; return arr.reduce((s,v)=>s+v,0)/arr.length; }
function pct(val,mn,mx) { if(mx===mn) return 50; return((val-mn)/(mx-mn))*100; }
function sportCounts()  { const d={}; athletes.forEach(a=>{d[a.sport]=(d[a.sport]||0)+1;}); return d; }
function setText(id,val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function noData() { return '<p style="color:var(--text-3);font-size:13px;text-align:center;padding:20px">Aucune donnée disponible.</p>'; }
function formatDate(d) {
  if(!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}); }
  catch { return d; }
}
function timeAgo(ts) {
  const diff=Date.now()-ts, m=60000, h=3600000, d=86400000;
  if(diff<m)  return "à l'instant";
  if(diff<h)  return Math.floor(diff/m)+'min';
  if(diff<d)  return Math.floor(diff/h)+'h';
  return Math.floor(diff/d)+'j';
}
function showErr2(el, msg) { el.textContent=msg; el.classList.remove('hidden'); }

/* Affiche brièvement un message de succès, d'erreur ou d'information. */
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  if(toastT) clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.add('hidden'), 3500);
}


/* ══ CONSTANTES ET FONCTIONS D'AFFICHAGE (issues de app.js) ═ */

const SPORT_COLORS = {
  'Football':'#22d3ee','Athlétisme':'#34d399','Basketball':'#fbbf24',
  'Natation':'#60a5fa','Boxe':'#f87171','Rugby':'#a78bfa',
  'Tennis':'#fb923c','Cyclisme':'#4ade80','Volleyball':'#e879f9',
  'Judo':'#f43f5e','Taekwondo':'#38bdf8','Autre':'#94a3b8',
  // Noms anglais conservés pour assurer la compatibilité avec les anciennes données.
  'Athletics':'#34d399','Swimming':'#60a5fa','Boxing':'#f87171','Cycling':'#4ade80',
};

const FIELD_RULES = {
  'f-name':      { required: true,  min: 2,    max: 80,   label: 'Nom complet', length: true },
  'f-gender':    { required: true,  label: 'Genre' },
  'f-age':       { required: true,  min: 8,    max: 50,   label: 'Âge' },
  'f-sport':     { required: true,  label: 'Sport' },
  'f-email':     { required: false, pattern: /^[^@]+@[^@]+\.[^@]+$/, label: 'Email' },
  'f-height':    { required: false, min: 100,  max: 230,  label: 'Taille' },
  'f-weight':    { required: false, min: 30,   max: 200,  label: 'Poids' },
  'f-armspan':   { required: false, min: 100,  max: 250,  label: 'Envergure' },
  'f-leglength': { required: false, min: 50,   max: 130,  label: 'Long. jambe' },
  'f-chest':     { required: false, min: 60,   max: 160,  label: 'Tour poitrine' },
  'f-waist':     { required: false, min: 50,   max: 150,  label: 'Tour taille' },
  'f-sprint':    { required: false, min: 9.5,  max: 25,   label: 'Sprint 100m' },
  'f-jump':      { required: false, min: 10,   max: 120,  label: 'Saut vertical' },
  'f-vo2':       { required: false, min: 20,   max: 90,   label: 'VO₂ Max' },
  'f-speed':     { required: false, min: 10,   max: 50,   label: 'Vitesse max' },
  'f-strength':  { required: false, min: 1,    max: 100,  label: 'Force' },
  'f-endurance': { required: false, min: 1,    max: 100,  label: 'Endurance' },
  'f-hr':        { required: false, min: 30,   max: 110,  label: 'FC repos' },
  'f-bodyfat':   { required: false, min: 3,    max: 45,   label: 'Graisse corp.' },
  'f-muscle':    { required: false, min: 10,   max: 100,  label: 'Masse musc.' },
  'f-flexibility':{ required: false, min: 1,   max: 100,  label: 'Souplesse' },
};

const PROG_METRICS = [
  { key: 'weight',    label: 'Poids',      unit: 'kg',         color: '#22d3ee',  invert: false, max: 120, min: 40  },
  { key: 'sprint',    label: 'Sprint 100m',unit: 's',          color: '#f87171',  invert: true,  max: 20,  min: 9   },
  { key: 'speed',     label: 'Vitesse max',unit: 'km/h',       color: '#34d399',  invert: false, max: 45,  min: 15  },
  { key: 'vo2',       label: 'VO₂ Max',    unit: 'ml/kg/min',  color: '#a78bfa',  invert: false, max: 90,  min: 20  },
  { key: 'strength',  label: 'Force',      unit: '/100',       color: '#fbbf24',  invert: false, max: 100, min: 0   },
  { key: 'endurance', label: 'Endurance',  unit: '/100',       color: '#fb923c',  invert: false, max: 100, min: 0   },
];

const DEFAULT_ADMIN_PIN = '2003';
const DEFAULT_PDG_PIN   = '1205';

const PIN_MAX_ATTEMPTS = 3;

const PIN_BLOCK_MINUTES = 5;

const PIN_SESSION_MINUTES = 30;


function toggleSearch(){
  const bar=document.getElementById('quick-search-bar');
  const res=document.getElementById('quick-search-results');
  bar.classList.toggle('hidden');
  if(!bar.classList.contains('hidden')){
    document.getElementById('quick-search-input').value='';
    res.classList.add('hidden');
    document.getElementById('quick-search-input').focus();
  } else {
    res.classList.add('hidden');
  }
}

function quickSearch(){
  const q=document.getElementById('quick-search-input').value.toLowerCase().trim();
  const res=document.getElementById('quick-search-results');
  if(!q){res.classList.add('hidden');return;}
  const found=athletes.filter(a=>
    a.name.toLowerCase().includes(q)||
    (a.sport||'').toLowerCase().includes(q)||
    (a.country||'').toLowerCase().includes(q)
  ).slice(0,6);
  if(!found.length){res.innerHTML='<div class="qs-item"><span style="color:var(--text-3);font-size:13px">Aucun résultat</span></div>';res.classList.remove('hidden');return;}
  res.innerHTML=found.map(a=>`
    <div class="qs-item" onclick="toggleSearch();openAthleteModal('${a.id}')">
      ${a.photo?`<img class="qs-photo" src="${a.photo}" alt=""/>`:
        `<div class="qs-photo">${initials(a.name)}</div>`}
      <div class="qs-info">
        <div class="qs-name">${esc(a.name)}</div>
        <div class="qs-meta">${esc(a.country||'')} · ${esc(a.age||'?')} ans</div>
      </div>
      <span class="qs-badge">${esc(a.sport)}</span>
    </div>`).join('');
  res.classList.remove('hidden');
}

// Calcule les indicateurs globaux puis actualise les principaux blocs du tableau de bord.
function renderDashboard(){
  const total=athletes.length;
  const ages=athletes.map(a=>+a.age).filter(Boolean);
  const heights=athletes.map(a=>+a.height).filter(Boolean);
  const weights=athletes.map(a=>+a.weight).filter(Boolean);
  const now=Date.now(); const week=7*86400000;
  const newThisWeek=athletes.filter(a=>(now-(a.createdAt||0))<week).length;
  const sports=new Set(athletes.map(a=>a.sport)).size;
  const countries=new Set(athletes.map(a=>a.country).filter(Boolean)).size;

  setText('stat-total', total);
  setText('stat-avg-age',    ages.length    ? avg(ages).toFixed(1)    : '—');
  setText('stat-avg-height', heights.length ? avg(heights).toFixed(1) : '—');
  setText('stat-avg-weight', weights.length ? avg(weights).toFixed(1) : '—');
  setText('stat-new-this-week', `+${newThisWeek} ${tr('cette semaine')}`);
  setText('stat-sports-count',  `${sports} ${currentLanguage === 'en' ? 'sport' : 'sport'}${sports>1?'s':''}`);
  setText('stat-countries-count', currentLanguage === 'en'
    ? `${countries} countr${countries > 1 ? 'ies' : 'y'}`
    : `${countries} pays`);
  document.getElementById('athletes-count-badge').textContent=total;

  renderRecentAthletes();
  renderSportDistribution();
  renderTopPerformers();
}

function renderRecentAthletes(){
  const c=document.getElementById('recent-athletes-list');
  const rec=[...athletes].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5);
  if(!rec.length){c.innerHTML='<p class="empty-msg">Aucun athlète. <a href="#" onclick="navigate(\'add-athlete\')">Ajouter.</a></p>';return;}
  c.innerHTML=rec.map(a=>`
    <div class="recent-item" onclick="openAthleteModal('${a.id}')">
      ${a.photo?`<img class="recent-item-photo" src="${a.photo}" alt=""/>`:
        `<div class="recent-item-photo">${initials(a.name)}</div>`}
      <div style="flex:1;min-width:0">
        <div class="recent-item-name">${esc(a.name)}</div>
        <div class="recent-item-sport">${esc(a.country||'Afrique')} · ${esc(a.sport)}</div>
      </div>
      <span class="recent-item-badge">${esc(a.sport)}</span>
    </div>`).join('');
}

function renderSportDistribution(){
  const c=document.getElementById('sport-distribution');
  const dist=sportCounts();
  const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]);
  const mx=Math.max(...Object.values(dist),1);
  if(!sorted.length){c.innerHTML='<p class="empty-msg">Aucune donnée.</p>';return;}
  c.innerHTML=sorted.map(([s,n])=>`
    <div class="sport-row">
      <span class="sport-name">${esc(s)}</span>
      <div class="sport-bar-wrap"><div class="sport-bar" style="width:${(n/mx)*100}%;background:${SPORT_COLORS[s]||'var(--accent)'}"></div></div>
      <span class="sport-count">${n}</span>
    </div>`).join('');
}

function renderTopPerformers(){
  const c=document.getElementById('top-performers');
  const bySpeed=[...athletes].filter(a=>a.speed).sort((a,b)=>+b.speed-+a.speed).slice(0,6);
  if(!bySpeed.length){c.innerHTML='<p class="empty-msg">Ajoutez des données de vitesse.</p>';return;}
  const ranks=['🥇','🥈','🥉','4','5','6'];
  const cls=['gold','silver','bronze','','',''];
  c.innerHTML=bySpeed.map((a,i)=>`
    <div class="top-card" onclick="openAthleteModal('${a.id}')">
      <div class="top-rank ${cls[i]}">${ranks[i]}</div>
      <div class="top-info">
        <div class="top-name">${esc(a.name)}</div>
        <div class="top-meta">${esc(a.sport)}</div>
      </div>
      <div class="top-val">${a.speed} km/h</div>
    </div>`).join('');
}

// Génère les cartes d'athlètes ; le filtre éventuel évite de refaire la recherche ici.
function renderAthletes(filtered){
  const list=filtered!==undefined?filtered:athletes;
  const grid=document.getElementById('athletes-grid');
  updateFilters();
  document.getElementById('filter-count').textContent = currentLanguage === 'en'
    ? `${list.length} athlete${list.length !== 1 ? 's' : ''}`
    : `${list.length} athlète${list.length !== 1 ? 's' : ''}`;
  if(!list.length){
    grid.innerHTML=`<div class="empty-state">
      <svg viewBox="0 0 80 80" fill="none" width="64" height="64"><circle cx="40" cy="28" r="14" stroke="#475569" stroke-width="2"/><path d="M12 70c0-15.464 12.536-28 28-28s28 12.536 28 28" stroke="#475569" stroke-width="2" stroke-linecap="round"/></svg>
      <p>${esc(tr('Aucun athlète trouvé.'))}<br><a href="#" onclick="navigate('add-athlete')">${esc(tr('Ajouter le premier →'))}</a></p>
    </div>`;
    return;
  }
  grid.innerHTML=list.map(a=>{
    const ai=predictAthleteLevel(a);
    return `
    <div class="athlete-card" data-id="${a.id}">
      <div class="card-photo-wrap">
        ${a.photo?`<img src="${a.photo}" alt="${esc(a.name)}" loading="lazy"/>`:
          `<div class="card-photo-initials">${initials(a.name)}</div>`}
        <span class="card-sport-tag">${esc(a.sport)}</span>
        ${a.level?`<span class="card-level-tag">${esc(tr(a.level))}</span>`:''}
      </div>
      <div class="card-body">
        <div class="card-name">${esc(a.name)}</div>
        <div class="card-meta">${esc(a.country||tr('Afrique'))} · ${esc(a.age||'?')} ${esc(tr('ans'))}${a.position?` · ${esc(a.position)}`:''}
          ${!ai.insufficient?`<span class="card-ai-chip" title="${esc(tr('Score IA basé sur'))} ${esc(ai.poolLabel)}">🧠 ${ai.score} · ${esc(tr(ai.level))}</span>`:''}
        </div>
        <div class="card-stats">
          <div class="card-stat"><div class="card-stat-val">${a.height||'—'}</div><div class="card-stat-label">${esc(tr('Taille'))}</div></div>
          <div class="card-stat"><div class="card-stat-val">${a.weight||'—'}</div><div class="card-stat-label">${esc(tr('Poids'))}</div></div>
          <div class="card-stat"><div class="card-stat-val">${a.sprint||'—'}</div><div class="card-stat-label">100m (s)</div></div>
        </div>
        <div class="card-actions">
          <button class="card-btn view"   onclick="openAthleteModal('${a.id}')">${esc(tr('Voir'))}</button>
          <button class="card-btn edit"   onclick="editAthlete('${a.id}')">${esc(tr('Éditer'))}</button>
          <button class="card-btn delete" onclick="confirmDelete('${a.id}',event)">${esc(tr('Suppr.'))}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Applique les critères de recherche, les filtres combinés et le tri choisi par l'utilisateur.
function filterAthletes(){
  const q=document.getElementById('search-input').value.toLowerCase();
  const sport=document.getElementById('sport-filter').value;
  const country=document.getElementById('country-filter').value;
  const sort=document.getElementById('sort-filter').value;
  const genderEl=document.getElementById('gender-filter');
  const levelEl=document.getElementById('level-filter');
  const ageMinEl=document.getElementById('age-min-filter');
  const ageMaxEl=document.getElementById('age-max-filter');
  const gender=genderEl?genderEl.value:'';
  const level=levelEl?levelEl.value:'';
  const ageMin=ageMinEl&&ageMinEl.value!==''?+ageMinEl.value:null;
  const ageMax=ageMaxEl&&ageMaxEl.value!==''?+ageMaxEl.value:null;
  let list=athletes.filter(a=>{
    const mt=a.name.toLowerCase().includes(q)||(a.country||'').toLowerCase().includes(q)||a.sport.toLowerCase().includes(q);
    const ms=!sport||a.sport===sport;
    const mc=!country||a.country===country;
    const mg=!gender||a.gender===gender;
    const ml=!level||a.level===level;
    const age=a.age!==''&&a.age!==undefined?+a.age:null;
    const mmin=ageMin===null||(age!==null&&age>=ageMin);
    const mmax=ageMax===null||(age!==null&&age<=ageMax);
    return mt&&ms&&mc&&mg&&ml&&mmin&&mmax;
  });
  if(sort==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort==='age') list.sort((a,b)=>+a.age-+b.age);
  else if(sort==='speed') list.sort((a,b)=>+b.speed-+a.speed);
  else if(sort==='ai-score') list.sort((a,b)=>{
    const ra=predictAthleteLevel(a), rb=predictAthleteLevel(b);
    return (rb.insufficient?-1:rb.score)-(ra.insufficient?-1:ra.score);
  });
  else list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  renderAthletes(list);
}

function resetFilters(){
  document.getElementById('search-input').value='';
  document.getElementById('sport-filter').value='';
  document.getElementById('country-filter').value='';
  document.getElementById('sort-filter').value='recent';
  const genderEl=document.getElementById('gender-filter');
  const levelEl=document.getElementById('level-filter');
  const ageMinEl=document.getElementById('age-min-filter');
  const ageMaxEl=document.getElementById('age-max-filter');
  if(genderEl) genderEl.value='';
  if(levelEl) levelEl.value='';
  if(ageMinEl) ageMinEl.value='';
  if(ageMaxEl) ageMaxEl.value='';
  filterAthletes();
}

function updateFilters(){
  const sf=document.getElementById('sport-filter');
  const cf=document.getElementById('country-filter');
  const sports=[...new Set(athletes.map(a=>a.sport))].sort();
  const countries=[...new Set(athletes.map(a=>a.country).filter(Boolean))].sort();
  if(sf){
    const ss=sf.value;
    sf.innerHTML=`<option value="">${esc(tr('Tous les sports'))}</option>`+sports.map(s=>`<option value="${esc(s)}" ${s===ss?'selected':''}>${esc(s)}</option>`).join('');
  }
  if(cf){
    const sc=cf.value;
    cf.innerHTML=`<option value="">${esc(tr('Tous les pays'))}</option>`+countries.map(c=>`<option value="${esc(c)}" ${c===sc?'selected':''}>${esc(c)}</option>`).join('');
  }
  ['compare-a','compare-b','history-athlete-select','pdf-athlete-select','progression-athlete-select'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const cur=el.value;
    el.innerHTML=`<option value="">${esc(tr('Choisir…'))}</option>`+athletes.map(a=>`<option value="${a.id}" ${a.id===cur?'selected':''}>${esc(a.name)} (${esc(a.sport)})</option>`).join('');
  });
}

/* ═══════════════════════════════════════════════════════════
   PRÉDICTION DE NIVEAU — moteur statistique local (100% offline)
   Compare chaque athlète aux autres athlètes de sa base de
   données (même sport) pour estimer un score et un niveau.
   Ce n'est PAS un modèle scientifique universel : c'est une
   comparaison relative à votre propre effectif.
   ═══════════════════════════════════════════════════════════ */

const AI_METRICS = [
  { key:'sprint',    label:'Sprint 100m', inverse:true  },
  { key:'speed',     label:'Vitesse max', inverse:false },
  { key:'vo2',       label:'VO₂ Max',     inverse:false },
  { key:'jump',      label:'Détente',     inverse:false },
  { key:'strength',  label:'Force',       inverse:false },
  { key:'endurance', label:'Endurance',   inverse:false },
];

function percentileRank(value, peerValues, inverse){
  const v = inverse ? -value : value;
  const arr = inverse ? peerValues.map(x=>-x) : peerValues;
  let below=0, equal=0;
  arr.forEach(x=>{ if(x<v) below++; else if(x===v) equal++; });
  return Math.round(((below + 0.5*equal) / arr.length) * 100);
}

function levelFromScore(score){
  if(score>=85) return 'Elite';
  if(score>=65) return 'Professionnel';
  if(score>=45) return 'Avancé';
  if(score>=25) return 'Intermédiaire';
  return 'Débutant';
}

/* ═══════════════════════════════════════════════════════════
   COMPARAISON AUX NORMES
   1) VO₂ Max et IMC : classifications issues de tables
      scientifiques reconnues (ACSM / Cooper Institute, OMS),
      établies pour une population adulte — à interpréter avec
      prudence pour les moins de 18 ans, en pleine croissance.
   2) Sprint / vitesse / détente / force / endurance : il n'existe
      pas de norme internationale unique et fiable par sport.
      Ces mesures sont comparées à des barèmes SAISIS PAR
      L'UTILISATEUR (Réglages → Barèmes de référence), jamais
      inventés par l'application.
   ═══════════════════════════════════════════════════════════ */

const SPORTS_LIST=['Football','Athlétisme','Basketball','Natation','Boxe','Rugby','Tennis','Cyclisme','Volleyball','Judo','Taekwondo','Autre'];

const POSITIONS_BY_SPORT={
  'Football':['Gardien','Défenseur central','Latéral droit','Latéral gauche','Milieu défensif','Milieu central','Milieu offensif','Ailier droit','Ailier gauche','Attaquant'],
  'Basketball':['Meneur','Arrière','Ailier','Ailier fort','Pivot'],
  'Volleyball':['Passeur','Réceptionneur-attaquant','Central','Pointu','Libéro'],
  'Rugby':['Pilier','Talonneur','Deuxième ligne','Troisième ligne','Demi de mêlée','Demi d\'ouverture','Centre','Ailier','Arrière'],
  'Athlétisme':['Sprint','Demi-fond','Fond','Haies','Sauts','Lancers','Combiné'],
  'Natation':['Nage libre','Dos','Brasse','Papillon','4 nages'],
  'Cyclisme':['Sprinteur','Grimpeur','Rouleur','Puncheur'],
  'Boxe':['Poids léger','Poids welter','Poids moyen','Poids lourd'],
  'Judo':['-60kg','-73kg','-90kg','+90kg'],
  'Taekwondo':['-58kg','-68kg','-80kg','+80kg'],
  'Tennis':[],
  'Autre':[],
};

function refreshSportSuggestions(){
  const dl=document.getElementById('sport-suggestions');
  if(!dl) return;
  const used=[...new Set((athletes||[]).map(a=>a.sport).filter(Boolean))];
  const all=[...new Set([...SPORTS_LIST.filter(s=>s!=='Autre'), ...used])].sort((a,b)=>a.localeCompare(b));
  dl.innerHTML=all.map(s=>`<option value="${esc(s)}"></option>`).join('');
}

function updatePositionSuggestions(){
  const sport=document.getElementById('f-sport').value;
  const dl=document.getElementById('position-suggestions');
  if(!dl) return;
  dl.innerHTML=(POSITIONS_BY_SPORT[sport]||[]).map(p=>`<option value="${esc(p)}"></option>`).join('');
}

const NORM_LEVELS=['Débutant','Intermédiaire','Avancé','Professionnel','Elite'];
const NORM_METRICS=[
  {key:'sprint',    label:'Sprint 100m',  unit:'s',   inverse:true},
  {key:'speed',     label:'Vitesse max',  unit:'km/h',inverse:false},
  {key:'jump',      label:'Détente',      unit:'cm',  inverse:false},
  {key:'strength',  label:'Force',        unit:'/100',inverse:false},
  {key:'endurance', label:'Endurance',    unit:'/100',inverse:false},
];

function classifyVO2max(vo2, gender){
  // Catégories générales adaptées de l'ACSM / Cooper Institute (référence adulte).
  const m=[{max:25,label:'Faible'},{max:33,label:'Moyen'},{max:42,label:'Bon'},{max:52,label:'Très bon'},{max:Infinity,label:'Excellent'}];
  const f=[{max:23,label:'Faible'},{max:30,label:'Moyen'},{max:38,label:'Bon'},{max:48,label:'Très bon'},{max:Infinity,label:'Excellent'}];
  const table=gender==='Féminin'?f:m;
  for(const t of table) if(vo2<=t.max) return t.label;
  return table[table.length-1].label;
}

function classifyBMI(bmi){
  if(bmi<18.5) return 'Insuffisance pondérale';
  if(bmi<25)   return 'Corpulence normale';
  if(bmi<30)   return 'Surpoids';
  return 'Obésité';
}

function getNorms(){ return getOfflineData(OFK.NORMS) || {}; }
function saveNormsForSport(sport, data){
  const all=getNorms();
  all[sport]=data;
  setOfflineData(OFK.NORMS, all);
}

// Compare une mesure aux seuils configurés pour le sport, en tenant compte du sens du score.
function classifyByCustomNorm(sport, metricKey, value){
  const norms=getNorms();
  const thresholds=norms[sport]&&norms[sport][metricKey];
  if(!thresholds) return null;
  const meta=NORM_METRICS.find(m=>m.key===metricKey);
  let levelIdx=-1;
  for(let i=0;i<NORM_LEVELS.length;i++){
    const t=thresholds[i];
    if(t===null||t===undefined||t==='') continue;
    const ok=meta.inverse ? value<=+t : value>=+t;
    if(ok) levelIdx=i;
  }
  if(levelIdx===-1) return null;
  return {level:NORM_LEVELS[levelIdx], levelIdx};
}

function renderNormsEditor(){
  const sel=document.getElementById('norms-sport-select');
  if(!sel) return;
  if(!sel.options.length) sel.innerHTML=SPORTS_LIST.map(s=>`<option>${s}</option>`).join('');
  loadNormsForSportUI();
}

function loadNormsForSportUI(){
  const sport=document.getElementById('norms-sport-select').value;
  const norms=getNorms();
  const current=norms[sport]||{};
  const ed=document.getElementById('norms-editor');
  ed.innerHTML=`<div class="norms-table">
    <div class="norms-row norms-head">
      <span></span>${NORM_LEVELS.map(l=>`<span>${esc(tr(l))}</span>`).join('')}
    </div>
    ${NORM_METRICS.map(m=>`
      <div class="norms-row">
        <span class="norms-metric-label">${esc(tr(m.label))} <em>(${m.inverse?'temps max, ':''}${m.unit})</em></span>
        ${NORM_LEVELS.map((l,i)=>`<input type="number" step="0.1" data-metric="${m.key}" data-idx="${i}" aria-label="${esc(tr(m.label))} — ${esc(tr(l))}" value="${current[m.key]?.[i]??''}" placeholder="—"/>`).join('')}
      </div>`).join('')}
  </div>`;
}

function saveCurrentNormsUI(){
  const sport=document.getElementById('norms-sport-select').value;
  const data={};
  document.querySelectorAll('#norms-editor input').forEach(inp=>{
    const k=inp.dataset.metric, i=+inp.dataset.idx;
    if(!data[k]) data[k]=[null,null,null,null,null];
    data[k][i]=inp.value===''?null:+inp.value;
  });
  saveNormsForSport(sport, data);
  showToast(`Barème "${sport}" enregistré ✓`);
}

function renderNormsComparison(athlete){
  const c=document.getElementById('modal-normes-content');
  const rows=[];

  // VO2max & IMC — bases scientifiques
  if(athlete.vo2){
    const cls=classifyVO2max(+athlete.vo2, athlete.gender);
    rows.push({label:'VO₂ Max', value:`${athlete.vo2} ml/kg/min`, cls, source:'ACSM / Cooper Institute (référence adulte)'});
  }
  if(athlete.height&&athlete.weight){
    const bmi=+athlete.weight/((+athlete.height/100)**2);
    rows.push({label:'IMC', value:`${bmi.toFixed(1)}`, cls:classifyBMI(bmi), source:'Organisation mondiale de la santé (référence adulte)'});
  }

  // Barèmes personnalisés par sport
  const customRows=[];
  NORM_METRICS.forEach(m=>{
    const val=+athlete[m.key];
    if(!val) return;
    const r=classifyByCustomNorm(athlete.sport, m.key, val);
    customRows.push({...m, value:athlete[m.key], result:r});
  });

  const sciHtml=rows.length?`
    <div class="ai-section-title">${tr('Normes scientifiques (référence adulte)')}</div>
    <div class="norms-sci-list">
      ${rows.map(r=>`
        <div class="norms-sci-item">
          <div class="norms-sci-top"><span>${tr(r.label)}</span><span class="norms-sci-badge">${tr(r.cls)}</span></div>
          <div class="norms-sci-val">${r.value}</div>
          <div class="norms-sci-src">${tr(r.source)}</div>
        </div>`).join('')}
    </div>
    <p class="ai-disclaimer">${tr('Ces classifications sont établies pour une population adulte. Pour un athlète de moins de 18 ans, en pleine croissance, elles restent indicatives et doivent être interprétées avec prudence.')}</p>
  `:'';

  const customHtml=`
    <div class="ai-section-title">${tr('Barème personnalisé')} — ${esc(athlete.sport)}</div>
    ${customRows.length?customRows.map(r=>{
      if(!r.result){
        return `<div class="norms-track-row">
          <div class="perf-label"><span>${tr(r.label)}</span><span>${r.value}${r.unit}</span></div>
          <div class="norms-track-empty">${tr('Aucun barème défini pour ce sport.')} <a href="#" onclick="closeAthleteModal();navigate('settings');return false;">${tr('Configurer →')}</a></div>
        </div>`;
      }
      return `<div class="norms-track-row">
        <div class="perf-label"><span>${tr(r.label)}</span><span>${r.value}${r.unit} → <strong>${tr(r.result.level)}</strong></span></div>
        <div class="norms-track">
          ${NORM_LEVELS.map((l,i)=>`<div class="norms-seg ${i<=r.result.levelIdx?'filled':''} ${i===r.result.levelIdx?'current':''}" title="${esc(tr(l))}"></div>`).join('')}
        </div>
      </div>`;
    }).join(''):`<p style="color:var(--text-3);font-size:13px">${tr('Aucune mesure sport-spécifique renseignée pour cet athlète.')}</p>`}
    <p class="ai-disclaimer">${tr('Ce barème est celui que vous avez défini dans Réglages → Barèmes de référence pour')} "${esc(athlete.sport)}". ${tr("Ce n'est pas une norme officielle internationale.")}</p>
  `;

  c.innerHTML = sciHtml + '<hr class="ai-divider"/>' + customHtml;
}


// Estime un niveau relatif à la base locale ; ce score n'est pas une norme universelle.
function predictAthleteLevel(athlete){
  let pool=athletes.filter(a=>a.sport===athlete.sport);
  let poolLabel=currentLanguage==='en'?`${athlete.sport} athletes`:`athlètes ${athlete.sport}`;
  if(pool.length<4){ pool=athletes; poolLabel=tr('tous sports confondus (échantillon limité)'); }

  const breakdown=[];
  AI_METRICS.forEach(m=>{
    const val=+athlete[m.key];
    if(!val) return;
    const peerValues=pool.map(a=>+a[m.key]).filter(v=>v>0);
    if(peerValues.length<3) return;
    breakdown.push({...m, value:athlete[m.key], percentile:percentileRank(val,peerValues,m.inverse)});
  });
  if(breakdown.length<2) return {insufficient:true, poolSize:pool.length};

  let score=breakdown.reduce((s,b)=>s+b.percentile,0)/breakdown.length;

  // Tendance récente basée sur l'historique de performance
  const hist=(historyData[athlete.id]||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  let trend=null;
  if(hist.length>=2){
    const first=hist[0], last=hist[hist.length-1];
    const deltas=[];
    if(first.speed&&last.speed)  deltas.push(+last.speed-+first.speed);
    if(first.sprint&&last.sprint) deltas.push(+first.sprint-+last.sprint);
    if(first.vo2&&last.vo2)      deltas.push(+last.vo2-+first.vo2);
    if(deltas.length){
      const up=deltas.filter(d=>d>0).length, down=deltas.filter(d=>d<0).length;
      if(up>down){ trend='up'; score=Math.min(100,score+4); }
      else if(down>up){ trend='down'; score=Math.max(0,score-4); }
      else trend='stable';
    }
  }

  score=Math.round(score);
  breakdown.sort((a,b)=>b.percentile-a.percentile);
  return {
    score, level:levelFromScore(score), breakdown,
    strengths:breakdown.filter(b=>b.percentile>=70),
    weaknesses:breakdown.filter(b=>b.percentile<=30),
    poolSize:pool.length, poolLabel, trend,
  };
}

/* ── PROJECTION À 5 ANS — extrapolation de tendance ────────
   Régression linéaire sur l'historique de mesures de l'athlète,
   projetée à +5 ans, puis comparée aux pairs actuels.
   Reste une extrapolation simple : ne modélise pas la
   maturation physique, les blessures ni les plateaux naturels.
   ═══════════════════════════════════════════════════════════ */

function linearRegression(points){
  const n=points.length;
  const meanT=points.reduce((s,p)=>s+p.t,0)/n;
  const meanV=points.reduce((s,p)=>s+p.v,0)/n;
  let num=0, den=0;
  points.forEach(p=>{ num+=(p.t-meanT)*(p.v-meanV); den+=(p.t-meanT)**2; });
  const slope=den===0?0:num/den;
  return {slope, intercept:meanV-slope*meanT};
}

// Extrapole les mesures historiques, avec des limites pour éviter des projections excessives.
function projectAthleteIn5Years(athlete){
  const hist=(historyData[athlete.id]||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(hist.length<3) return {insufficient:true, reason:'few-entries'};
  const firstT=new Date(hist[0].date).getTime();
  const lastT=new Date(hist[hist.length-1].date).getTime();
  const spanDays=(lastT-firstT)/86400000;
  if(spanDays<150) return {insufficient:true, reason:'short-span'};

  const HORIZON_DAYS=5*365;
  const futureT=(lastT-firstT)/86400000 + HORIZON_DAYS;
  const projected={};
  AI_METRICS.forEach(m=>{
    const pts=hist.filter(h=>h[m.key]).map(h=>({t:(new Date(h.date).getTime()-firstT)/86400000, v:+h[m.key]}));
    if(pts.length<3) return;
    const {slope,intercept}=linearRegression(pts);
    const lastVal=pts[pts.length-1].v;
    let projVal=intercept+slope*futureT;
    // Garde-fou : on limite l'extrapolation à ±50% de la dernière valeur
    // mesurée, pour éviter des projections irréalistes sur une tendance
    // courte ou bruitée.
    const maxChange=Math.abs(lastVal)*0.5;
    projVal=Math.max(lastVal-maxChange, Math.min(lastVal+maxChange, projVal));
    if(projVal<=0) projVal=lastVal;
    projected[m.key]=Math.round(projVal*10)/10;
  });
  if(Object.keys(projected).length<2) return {insufficient:true, reason:'few-metrics'};

  let pool=athletes.filter(a=>a.sport===athlete.sport);
  let poolLabel=currentLanguage==='en'?`current ${athlete.sport} athletes`:`athlètes ${athlete.sport} actuels`;
  if(pool.length<4){ pool=athletes; poolLabel=tr('tous sports confondus (échantillon limité)'); }

  const breakdown=[];
  AI_METRICS.forEach(m=>{
    if(!projected[m.key]) return;
    const peerValues=pool.map(a=>+a[m.key]).filter(v=>v>0);
    if(peerValues.length<3) return;
    breakdown.push({...m, current:athlete[m.key]||'—', projected:projected[m.key], percentile:percentileRank(projected[m.key],peerValues,m.inverse)});
  });
  if(!breakdown.length) return {insufficient:true, reason:'no-comparable'};

  const score=Math.round(breakdown.reduce((s,b)=>s+b.percentile,0)/breakdown.length);
  return {
    score, level:levelFromScore(score), breakdown, poolLabel, poolSize:pool.length,
    spanDays:Math.round(spanDays),
    projectedAge: athlete.age?(+athlete.age+5):null,
  };
}


function renderAIAnalysis(athlete){
  const c=document.getElementById('modal-ai-content');
  const r=predictAthleteLevel(athlete);
  if(r.insufficient){
    c.innerHTML=`<div style="text-align:center;padding:32px;color:var(--text-3);font-size:13px">
      ${tr('Pas assez de données de performance pour estimer un niveau.')}<br>
      ${tr('Renseignez au moins 2 mesures parmi : sprint, vitesse, VO₂, force, endurance, détente.')}
    </div>`;
    return;
  }
  const trendHtml=r.trend?{
    up:`<span class="ai-trend up">↗ ${tr('En progression')}</span>`,
    down:`<span class="ai-trend down">↘ ${tr('En baisse')}</span>`,
    stable:`<span class="ai-trend stable">→ ${tr('Stable')}</span>`,
  }[r.trend]:'';

  const proj=projectAthleteIn5Years(athlete);
  let projHtml;
  if(proj.insufficient){
    const msg={
      'few-entries':"Ajoutez au moins 3 mesures dans l'onglet Historique pour activer la projection.",
      'short-span':"Les mesures existantes couvrent une trop courte période (min. ~6 mois nécessaires).",
      'few-metrics':"Pas assez de mesures répétées (sprint, vitesse, VO₂, force, endurance, détente) pour dégager une tendance.",
      'no-comparable':"Pas assez d'athlètes comparables dans la base pour situer cette projection.",
    }[proj.reason]||"Historique insuffisant pour projeter une tendance.";
    projHtml=`<div class="ai-section-title">${tr('Projection à 5 ans')}</div>
      <div class="ai-proj-empty">${tr(msg)}</div>`;
  } else {
    const projectionDisclaimer=currentLanguage==='en'
      ? `This is a simple linear extrapolation of past progress, compared with current athletes in your dataset (${esc(proj.poolLabel)}, ${proj.poolSize}). It does not account for physical maturation, injuries, training plateaus, or changes in other athletes' levels. Treat it as an indicative trend, not a reliable 5-year prediction.`
      : `Projection = extrapolation linéaire simple de l'évolution passée, comparée aux athlètes actuels de votre base (${esc(proj.poolLabel)}, ${proj.poolSize}). Elle ne tient pas compte de la maturation physique, des blessures, des plateaux d'entraînement ni de l'évolution du niveau des autres athlètes — à lire comme une tendance indicative, pas une prédiction fiable à 5 ans.`;
    projHtml=`
      <div class="ai-section-title">${tr('Projection à 5 ans')}${proj.projectedAge?` · ≈ ${proj.projectedAge} ${tr('ans')}`:''}</div>
      <div class="ai-score-card proj">
        <div class="ai-score-ring proj" style="--pct:${proj.score}"><span class="ai-score-num">${proj.score}</span></div>
        <div class="ai-score-info">
          <div class="ai-score-level">${tr(proj.level)}</div>
          <div class="ai-score-sub">${tr('Si la tendance actuelle')} (${proj.spanDays} ${tr('jours de suivi')}) ${tr('se maintient')}</div>
        </div>
      </div>
      <div class="ai-breakdown">
        ${proj.breakdown.map(b=>`
          <div class="perf-row">
            <div class="perf-label"><span>${tr(b.label)}</span><span>${b.current} → ${b.projected}</span></div>
            <div class="perf-track"><div class="perf-fill proj" style="width:${Math.max(b.percentile,3)}%"></div></div>
          </div>`).join('')}
      </div>
      <p class="ai-disclaimer">${projectionDisclaimer}</p>`;
  }

  c.innerHTML=`
    <div class="ai-score-card">
      <div class="ai-score-ring" style="--pct:${r.score}"><span class="ai-score-num">${r.score}</span></div>
      <div class="ai-score-info">
        <div class="ai-score-level">${tr(r.level)}</div>
        <div class="ai-score-sub">${tr('Niveau estimé')} ${trendHtml}</div>
      </div>
    </div>
    <div class="ai-section-title">${tr('Comparaison')} — ${esc(r.poolLabel)} (${r.poolSize} ${tr('athlètes')})</div>
    <div class="ai-breakdown">
      ${r.breakdown.map(b=>`
        <div class="perf-row">
          <div class="perf-label"><span>${tr(b.label)}</span><span>${b.value} · ${b.percentile}${currentLanguage==='en'?((b.percentile%100>=11&&b.percentile%100<=13)?'th':({1:'st',2:'nd',3:'rd'}[b.percentile%10]||'th')):'ᵉ'} ${tr('percentile')}</span></div>
          <div class="perf-track"><div class="perf-fill" style="width:${Math.max(b.percentile,3)}%"></div></div>
        </div>`).join('')}
    </div>
    ${r.strengths.length?`<div class="ai-section-title">${tr('Points forts')}</div><div class="ai-tags">${r.strengths.map(s=>`<span class="ai-tag good">${tr(s.label)}</span>`).join('')}</div>`:''}
    ${r.weaknesses.length?`<div class="ai-section-title">${tr('À travailler')}</div><div class="ai-tags">${r.weaknesses.map(s=>`<span class="ai-tag warn">${tr(s.label)}</span>`).join('')}</div>`:''}
    <p class="ai-disclaimer">${currentLanguage==='en'
      ? 'This statistical estimate is calculated locally from your own data (percentile comparison). It does not replace an assessment by a coach or sports professional.'
      : "Estimation statistique calculée localement à partir de votre propre base de données (comparaison de percentiles). Elle ne remplace pas l'évaluation d'un entraîneur ou d'un professionnel du sport."}</p>
    <hr class="ai-divider"/>
    ${projHtml}
  `;
}


// Prépare les onglets de la fiche et affiche les données de l'athlète sélectionné.
function openAthleteModal(id){
  const a=athletes.find(x=>x.id===id); if(!a) return;
  openAthleteId=id;
  // En-tête du profil.
  const photo=document.getElementById('modal-photo');
  const init=document.getElementById('modal-avatar-initials');
  if(a.photo){ photo.src=a.photo; photo.style.display='block'; init.style.display='none'; }
  else { photo.style.display='none'; init.style.display='flex'; init.textContent=initials(a.name); }
  setText('modal-sport',a.sport||'—');
  setText('modal-name',a.name||'—');
  setText('modal-age-country',[a.age?`${a.age} ${tr('ans')}`:'',a.city,a.country].filter(Boolean).join(' · '));
  const lb=document.getElementById('modal-level-badge');
  if(a.level){lb.textContent=a.level;lb.style.display='inline-block';}else{lb.style.display='none';}
  // Vue d'ensemble.
  const bmi=a.height&&a.weight?(+a.weight/((+a.height/100)**2)).toFixed(1):'—';
  setText('md-height',a.height?`${a.height} cm`:'—');
  setText('md-weight',a.weight?`${a.weight} kg`:'—');
  setText('md-bmi',bmi!=='—'?`${bmi}`:'—');
  setText('md-position',a.position||'—');
  setText('md-armspan',a.armspan?`${a.armspan} cm`:'—');
  setText('md-leglength',a.leglength?`${a.leglength} cm`:'—');
  setText('md-country',a.country||'—');
  setText('md-email',a.email||'—');
  setText('md-notes',a.notes||'—');
  // Données physiologiques.
  setText('md-hr',a.hr?`${a.hr} bpm`:'—');
  setText('md-bodyfat',a.bodyfat?`${a.bodyfat}%`:'—');
  setText('md-muscle',a.muscle?`${a.muscle} kg`:'—');
  setText('md-flexibility',a.flexibility?`${a.flexibility}/100`:'—');
  setText('md-vo2',a.vo2?`${a.vo2} ml/kg/min`:'—');
  setText('md-speed',a.speed?`${a.speed} km/h`:'—');
  // Barres de performance.
  const pb=document.getElementById('modal-perf-bars');
  const perfs=[
    {l:'Sprint 100m',v:a.sprint,u:'s',max:15,inv:true},
    {l:'Saut vertical',v:a.jump,u:'cm',max:100},
    {l:'Vitesse max',v:a.speed,u:'km/h',max:45},
    {l:'VO₂ Max',v:a.vo2,u:'ml/kg/min',max:80},
    {l:'Force',v:a.strength,u:'/100',max:100},
    {l:'Endurance',v:a.endurance,u:'/100',max:100},
    {l:'Souplesse',v:a.flexibility,u:'/100',max:100},
  ];
  pb.innerHTML=perfs.filter(p=>p.v).map(p=>{
    let pct=(+p.v/p.max)*100;
    if(p.inv) pct=100-pct;
    pct=Math.min(Math.max(pct,3),100);
    return `<div class="perf-row">
      <div class="perf-label"><span>${p.l}</span><span>${p.v}${p.u}</span></div>
      <div class="perf-track"><div class="perf-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('')||'<p style="color:var(--text-3);font-size:13px">Aucune donnée de performance.</p>';
  // Onglet historique.
  renderModalHistory(id);
  // Onglet d'analyse automatique.
  renderAIAnalysis(a);
  // Normes tab
  renderNormsComparison(a);
  // Médias.
  const mc=document.getElementById('modal-media-content');
  let mh='';
  if(a.photo) mh+=`<img src="${a.photo}" alt="${esc(a.name)}" style="border-radius:8px;object-fit:cover;aspect-ratio:16/9;width:100%"/>`;
  (a.videos||[]).forEach(vi=>{mh+=`<video src="${vi.data}" controls style="border-radius:8px;background:#000;width:100%"></video>`;});
  if(!mh) mh='<p style="color:var(--text-3);font-size:13px">Aucun média uploadé.</p>';
  mc.innerHTML=mh;
  // Revenir au premier onglet.
  switchModalTab('overview',document.querySelector('.modal-tab'));
  document.getElementById('athlete-modal').classList.remove('hidden');
  document.body.style.overflow='hidden';
  translatePage();
}

function renderModalHistory(id){
  const c=document.getElementById('modal-history-content');
  const h=(historyData[id]||[]).sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!h.length){
    c.innerHTML=`<div style="text-align:center;padding:32px;color:var(--text-3);font-size:13px">
      Aucun historique. <br>
      <button class="btn-primary sm" style="margin-top:12px" onclick="closeAthleteModal();historyAthleteId='${id}';navigate('history');setTimeout(()=>{document.getElementById('history-athlete-select').value='${id}';renderHistory();},100)">Voir l'historique →</button>
    </div>`;
    return;
  }
  c.innerHTML=h.slice(0,5).map(e=>{
    const stats=[];
    if(e.weight)   stats.push(`Poids: <span>${e.weight} kg</span>`);
    if(e.sprint)   stats.push(`100m: <span>${e.sprint}s</span>`);
    if(e.speed)    stats.push(`Vitesse: <span>${e.speed} km/h</span>`);
    if(e.vo2)      stats.push(`VO₂: <span>${e.vo2}</span>`);
    return `<div class="history-entry">
      <div class="history-dot"><svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/></svg></div>
      <div class="history-body">
        <div class="history-date">${formatDate(e.date)}</div>
        ${e.note?`<div class="history-note">${esc(e.note)}</div>`:''}
        <div class="history-stats">${stats.map(s=>`<div class="history-stat">${s}</div>`).join('')}</div>
      </div>
    </div>`;
  }).join('');
}

function closeAthleteModal(){
  document.getElementById('athlete-modal').classList.add('hidden');
  document.body.style.overflow='';
  openAthleteId=null;
}

function closeModalOnOverlay(e){if(e.target===document.getElementById('athlete-modal'))closeAthleteModal();}

function switchModalTab(tab,btn){
  document.querySelectorAll('.modal-tab-content').forEach(t=>t.classList.remove('active'));
  document.getElementById('modal-tab-'+tab).classList.add('active');
  document.querySelectorAll('.modal-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

function exportAthleteFromModal(){if(!openAthleteId)return;generateAthletePDF(athletes.find(a=>a.id===openAthleteId));}

function editAthleteFromModal(){const id=openAthleteId;closeAthleteModal();if(id)editAthlete(id);}

function deleteAthleteFromModal(){
  if (!openAthleteId) return;
  const id = openAthleteId;
  closeAthleteModal();
  openPinModal(() => {
    if (!confirm('Supprimer cet athlète ?')) return;
    deleteAthlete(id);
  }, 'pdg');
}

function renderAnalytics(){
  renderSportChart(); renderAgeChart(); renderHWScatter();
  renderSpeedChart(); renderScoreChart(); renderVo2Chart();
  renderSprintChart(); renderCountriesChart(); renderLevelsChart();
}

function renderSportChart(){
  const c=document.getElementById('chart-sports');
  const dist=sportCounts(); const mx=Math.max(...Object.values(dist),1);
  const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]);
  if(!sorted.length){c.innerHTML=noData();return;}
  c.innerHTML=sorted.map(([s,n])=>`
    <div class="bar-row">
      <span class="bar-label">${esc(s)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/mx)*100}%;background:${SPORT_COLORS[s]||'var(--accent)'}"></div></div>
      <span class="bar-val">${n}</span>
    </div>`).join('');
}

function renderAgeChart(){
  const c=document.getElementById('chart-age');
  const ages=athletes.map(a=>+a.age).filter(Boolean);
  if(!ages.length){c.innerHTML=noData();return;}
  const b={'< 15':0,'15–17':0,'18–20':0,'21–24':0,'25+':0};
  ages.forEach(a=>{if(a<15)b['< 15']++;else if(a<=17)b['15–17']++;else if(a<=20)b['18–20']++;else if(a<=24)b['21–24']++;else b['25+']++;});
  const mx=Math.max(...Object.values(b),1);
  c.innerHTML=Object.entries(b).map(([k,n])=>`
    <div class="bar-row">
      <span class="bar-label">${k}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/mx)*100}%;background:var(--accent-3)"></div></div>
      <span class="bar-val">${n}</span>
    </div>`).join('');
}

function renderHWScatter(){
  const c=document.getElementById('chart-hw');
  const d=athletes.filter(a=>a.height&&a.weight);
  if(!d.length){c.innerHTML=noData();return;}
  const hs=d.map(a=>+a.height),ws=d.map(a=>+a.weight);
  const mnh=Math.min(...hs),mxh=Math.max(...hs),mnw=Math.min(...ws),mxw=Math.max(...ws);
  // Conserver les libellés des axes.
  c.innerHTML=`<div class="scatter-axis-x">Taille →</div><div class="scatter-axis-y">↑ Poids</div>`+
  d.map(a=>`<div class="scatter-point" title="${esc(a.name)}: ${a.height}cm / ${a.weight}kg" style="left:${pct(+a.height,mnh,mxh)}%;top:${100-pct(+a.weight,mnw,mxw)}%;background:${SPORT_COLORS[a.sport]||'var(--accent)'}"></div>`).join('');
}

function renderSpeedChart(){
  const c=document.getElementById('chart-speed');
  const d=[...athletes].filter(a=>a.speed).sort((a,b)=>+b.speed-+a.speed).slice(0,8);
  if(!d.length){c.innerHTML=noData();return;}
  const mx=+d[0].speed;
  c.innerHTML=d.map(a=>`
    <div class="bar-row">
      <span class="bar-label">${esc(a.name.split(' ')[0])}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(+a.speed/mx)*100}%;background:var(--success)"></div></div>
      <span class="bar-val">${a.speed}</span>
    </div>`).join('');
}

function renderSprintChart(){
  const c=document.getElementById('chart-sprint');
  const d=[...athletes].filter(a=>a.sprint).sort((a,b)=>+a.sprint-+b.sprint).slice(0,8);
  if(!d.length){c.innerHTML=noData();return;}
  const mn=+d[0].sprint, mx=+d[d.length-1].sprint;
  c.innerHTML=d.map(a=>`
    <div class="bar-row">
      <span class="bar-label">${esc(a.name.split(' ')[0])}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(1-(+a.sprint-mn)/(mx-mn||1))*100}%;background:var(--accent)"></div></div>
      <span class="bar-val">${a.sprint}s</span>
    </div>`).join('');
}

function renderScoreChart(){
  const c=document.getElementById('chart-scores');
  const fields=[
    {l:'Force',k:'strength',col:'var(--accent)'},
    {l:'Endurance',k:'endurance',col:'var(--accent-3)'},
    {l:'Souplesse',k:'flexibility',col:'var(--success)'},
    {l:'Saut',k:'jump',col:'var(--warn)'},
  ];
  c.innerHTML=fields.map(f=>{
    const vals=athletes.map(a=>+a[f.k]).filter(Boolean);
    const a=vals.length?Math.round(avg(vals)):0;
    return `<div class="score-row">
      <span class="score-label">${f.l}</span>
      <div class="score-bar"><div class="score-fill" style="width:${a}%;background:${f.col}"></div></div>
      <span class="score-val">${a||'—'}</span>
    </div>`;
  }).join('');
}

function renderVo2Chart(){
  const c=document.getElementById('chart-vo2');
  const d=[...athletes].filter(a=>a.vo2).sort((a,b)=>+b.vo2-+a.vo2).slice(0,6);
  if(!d.length){c.innerHTML=noData();return;}
  const mx=+d[0].vo2;
  c.innerHTML=d.map(a=>`
    <div class="bar-row">
      <span class="bar-label">${esc(a.name.split(' ')[0])}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(+a.vo2/mx)*100}%;background:var(--warn)"></div></div>
      <span class="bar-val">${a.vo2}</span>
    </div>`).join('');
}

function renderCountriesChart(){
  const c=document.getElementById('chart-countries');
  const dist={};
  athletes.forEach(a=>{if(a.country)dist[a.country]=(dist[a.country]||0)+1;});
  const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(!sorted.length){c.innerHTML=noData();return;}
  const mx=sorted[0][1];
  c.innerHTML=sorted.map(([co,n])=>`
    <div class="bar-row">
      <span class="bar-label">${esc(co)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/mx)*100}%;background:var(--orange)"></div></div>
      <span class="bar-val">${n}</span>
    </div>`).join('');
}

function renderLevelsChart(){
  const c=document.getElementById('chart-levels');
  const dist={};
  athletes.forEach(a=>{if(a.level)dist[a.level]=(dist[a.level]||0)+1;});
  const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]);
  if(!sorted.length){c.innerHTML=noData();return;}
  const mx=sorted[0][1];
  const cols=['var(--success)','var(--accent)','var(--warn)','var(--orange)','var(--danger)'];
  c.innerHTML=sorted.map(([l,n],i)=>`
    <div class="bar-row">
      <span class="bar-label">${esc(l)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/mx)*100}%;background:${cols[i]||'var(--accent)'}"></div></div>
      <span class="bar-val">${n}</span>
    </div>`).join('');
}

function renderComparePage(){
  updateFilters();
  renderCompare();
}

function renderCompare(){
  const idA=document.getElementById('compare-a').value;
  const idB=document.getElementById('compare-b').value;
  const c=document.getElementById('compare-result');
  if(!idA||!idB||idA===idB){
    c.innerHTML=`<div class="compare-empty">
      <svg viewBox="0 0 64 64" fill="none" width="48" height="48"><rect x="4" y="12" width="24" height="40" rx="3" stroke="#475569" stroke-width="1.5"/><rect x="36" y="12" width="24" height="40" rx="3" stroke="#475569" stroke-width="1.5"/><path d="M28 32h8" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/></svg>
      <p>${idA===idB&&idA?'Choisissez deux athlètes différents.':'Sélectionnez deux athlètes pour lancer la comparaison'}</p>
    </div>`;
    return;
  }
  const a=athletes.find(x=>x.id===idA), b=athletes.find(x=>x.id===idB);
  if(!a||!b) return;
  const rows=[
    {l:'Âge',ka:'age',kb:'age',u:'ans',lower:false},
    {l:'Taille',ka:'height',kb:'height',u:'cm',lower:false},
    {l:'Poids',ka:'weight',kb:'weight',u:'kg',lower:false},
    {l:'Sprint 100m',ka:'sprint',kb:'sprint',u:'s',lower:true},
    {l:'Saut (cm)',ka:'jump',kb:'jump',u:'cm',lower:false},
    {l:'VO₂ Max',ka:'vo2',kb:'vo2',u:'',lower:false},
    {l:'Vitesse max',ka:'speed',kb:'speed',u:'km/h',lower:false},
    {l:'Force',ka:'strength',kb:'strength',u:'/100',lower:false},
    {l:'Endurance',ka:'endurance',kb:'endurance',u:'/100',lower:false},
    {l:'Souplesse',ka:'flexibility',kb:'flexibility',u:'/100',lower:false},
  ];
  function photoHtml(at){
    return at.photo?`<img class="compare-athlete-photo" src="${at.photo}" alt=""/>`:
      `<div class="compare-athlete-photo">${initials(at.name)}</div>`;
  }
  function valCell(valA,valB,lower,u){
    if(!valA&&!valB) return ['<span class="compare-stat-val">—</span>','<span class="compare-stat-val">—</span>'];
    if(!valA) return ['<span class="compare-stat-val">—</span>',`<span class="compare-stat-val better">${valB}${u}</span>`];
    if(!valB) return [`<span class="compare-stat-val better">${valA}${u}</span>`,'<span class="compare-stat-val">—</span>'];
    const av=+valA, bv=+valB;
    const aBetter=lower?av<bv:av>bv, bBetter=lower?bv<av:bv>av;
    return [
      `<span class="compare-stat-val ${aBetter?'better':bBetter?'worse':''}">${valA}${u}</span>`,
      `<span class="compare-stat-val ${bBetter?'better':aBetter?'worse':''}">${valB}${u}</span>`,
    ];
  }
  const rowsHtml=rows.map(r=>{
    const [ca,cb]=valCell(a[r.ka],b[r.kb],r.lower,r.u);
    return {labelA:`<div class="compare-stat-row" style="justify-content:flex-start">${ca}</div>`,
      labelB:`<div class="compare-stat-row" style="justify-content:flex-end">${cb}</div>`,
      center:`<div class="compare-stat-label-center">${r.l}</div>`,
    };
  });
  c.innerHTML=`
    <div class="compare-grid">
      <div class="compare-col a">
        <div class="compare-col-header">
          ${photoHtml(a)}
          <div class="compare-athlete-name">${esc(a.name)}</div>
          <div class="compare-athlete-sport">${esc(a.sport)} · ${esc(a.country||'—')}</div>
        </div>
        ${rowsHtml.map(r=>r.labelA).join('')}
      </div>
      <div class="compare-labels-col">
        <div style="height:130px"></div>
        ${rowsHtml.map(r=>r.center).join('')}
      </div>
      <div class="compare-col b">
        <div class="compare-col-header">
          ${photoHtml(b)}
          <div class="compare-athlete-name">${esc(b.name)}</div>
          <div class="compare-athlete-sport">${esc(b.sport)} · ${esc(b.country||'—')}</div>
        </div>
        ${rowsHtml.map(r=>r.labelB).join('')}
      </div>
    </div>`;
}

function renderHistoryPage(){
  updateFilters();
  const sel=document.getElementById('history-athlete-select');
  if(historyAthleteId){ sel.value=historyAthleteId; historyAthleteId=null; }
  renderHistory();
  // Actualiser la page de progression si elle est actuellement ouverte.
  if (currentPage === 'progression') renderProgression();
}

function renderHistory(){
  const id=document.getElementById('history-athlete-select').value;
  const btn=document.getElementById('history-add-btn');
  const c=document.getElementById('history-content');
  if(!id){
    btn.style.display='none';
    c.innerHTML=`<div class="compare-empty" style="padding:64px 0">
      <svg viewBox="0 0 64 64" fill="none" width="48" height="48"><circle cx="32" cy="32" r="28" stroke="#475569" stroke-width="1.5"/><path d="M32 18v14l8 8" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p>Sélectionnez un athlète pour voir son évolution</p>
    </div>`;
    return;
  }
  btn.style.display='inline-flex';
  const h=(historyData[id]||[]).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const a=athletes.find(x=>x.id===id);
  let html=`<div style="margin-bottom:20px"><strong style="font-family:var(--font-head);font-size:18px">${esc(a?a.name:'Athlète')}</strong> <span style="color:var(--text-3);font-size:13px">${h.length} entrée${h.length!==1?'s':''}</span></div>`;
  if(!h.length){
    html+=`<div class="compare-empty"><p>Aucune mesure enregistrée.<br>Cliquez sur "Ajouter mesure" pour commencer le suivi.</p></div>`;
  } else {
    // Mini-graphiques d'évolution des mesures numériques.
    const sparkFields=[
      {k:'weight',l:'Poids (kg)',col:'var(--accent)'},
      {k:'sprint',l:'Sprint 100m (s)',col:'var(--warn)'},
      {k:'speed', l:'Vitesse max (km/h)',col:'var(--success)'},
      {k:'vo2',   l:'VO₂ Max',col:'var(--accent-3)'},
    ];
    html+=`<div class="analytics-grid" style="margin-bottom:24px">`;
    sparkFields.forEach(f=>{
      const vals=h.filter(e=>e[f.k]).map(e=>({val:+e[f.k],date:e.date}));
      if(vals.length<2) return;
      const mn=Math.min(...vals.map(v=>v.val)), mx=Math.max(...vals.map(v=>v.val));
      const last=vals[vals.length-1].val, first=vals[0].val;
      const trend=last>first?'↑':last<first?'↓':'→';
      const trendCol=last>first?(f.k==='sprint'?'var(--danger)':'var(--success)'):(f.k==='sprint'?'var(--success)':'var(--danger)');
      html+=`<div class="history-chart">
        <h4>${f.l} <span style="color:${trendCol};margin-left:6px">${trend} ${last}</span></h4>
        <div class="sparkline">
          ${vals.map(v=>{
            const h2=mx===mn?80:((v.val-mn)/(mx-mn))*80;
            return `<div class="spark-bar" style="height:${Math.max(h2,4)}px;background:${f.col};opacity:0.8">
              <span class="spark-val">${v.val} (${v.date})</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    });
    html+=`</div>`;
    // Chronologie des mesures.
    html+=`<div class="history-timeline">`;
    [...h].reverse().forEach(e=>{
      const stats=[];
      if(e.weight)   stats.push(`Poids: <span>${e.weight} kg</span>`);
      if(e.sprint)   stats.push(`100m: <span>${e.sprint}s</span>`);
      if(e.speed)    stats.push(`Vitesse: <span>${e.speed} km/h</span>`);
      if(e.vo2)      stats.push(`VO₂: <span>${e.vo2}</span>`);
      if(e.strength) stats.push(`Force: <span>${e.strength}/100</span>`);
      if(e.endurance)stats.push(`Endurance: <span>${e.endurance}/100</span>`);
      html+=`<div class="history-entry">
        <div class="history-dot"><svg viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/></svg></div>
        <div class="history-body">
          <div class="history-date">${formatDate(e.date)}</div>
          ${e.note?`<div class="history-note">${esc(e.note)}</div>`:''}
          <div class="history-stats">${stats.map(s=>`<div class="history-stat">${s}</div>`).join('')}</div>
        </div>
      </div>`;
    });
    html+=`</div>`;
  }
  c.innerHTML=html;
}

function openHistoryModal(){
  const id=document.getElementById('history-athlete-select').value;
  if(!id){toast('Sélectionnez d\'abord un athlète.','error');return;}
  document.getElementById('h-date').value=new Date().toISOString().split('T')[0];
  ['h-weight','h-sprint','h-vo2','h-speed','h-strength','h-endurance','h-note'].forEach(f=>{document.getElementById(f).value='';});
  document.getElementById('history-modal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function closeHistoryModal(){
  document.getElementById('history-modal').classList.add('hidden');
  document.body.style.overflow='';
}

function renderMedia(){
  renderMediaPhotos(); renderMediaVideos();
}

function renderMediaPhotos(){
  const c=document.getElementById('media-photos');
  const wph=athletes.filter(a=>a.photo);
  if(!wph.length){c.innerHTML=`<div class="media-empty">${esc(tr("Aucune photo. Ajoutez des photos lors de l'enregistrement des athlètes."))}</div>`;return;}
  c.innerHTML=wph.map(a=>`
    <div class="photo-thumb" onclick="openAthleteModal('${a.id}')">
      <img src="${a.photo}" alt="${esc(a.name)}" loading="lazy"/>
      <div class="photo-thumb-label">${esc(a.name)}</div>
    </div>`).join('');
}

function renderMediaVideos(){
  const c=document.getElementById('media-videos');
  const wv=athletes.filter(a=>a.videos&&a.videos.length);
  if(!wv.length){c.innerHTML=`<div class="media-empty">${esc(tr("Aucune vidéo. Uploadez des vidéos lors de l'ajout d'athlètes."))}</div>`;return;}
  let h='';
  wv.forEach(a=>a.videos.forEach(vi=>{
    h+=`<div class="video-item">
      <video src="${vi.data}" controls preload="metadata"></video>
      <div class="video-item-info">
        <div class="video-item-name">${esc(a.name)}</div>
        <div class="video-item-meta">${esc(a.sport)} · ${esc(vi.name)}</div>
      </div>
    </div>`;
  }));
  c.innerHTML=h;
}

function switchMediaTab(tab,btn){
  document.getElementById('media-photos').classList.toggle('hidden',tab!=='photos');
  document.getElementById('media-videos').classList.toggle('hidden',tab!=='videos');
  document.querySelectorAll('.media-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
}

function renderProgressionPage() {
  updateFilters();
  const sel = document.getElementById('progression-athlete-select');
  if (progressionAthleteId) {
    sel.value = progressionAthleteId;
    progressionAthleteId = null;
  }
  renderProgression();
}

// Filtre l'historique de l'athlète, puis reconstruit les graphiques et le tableau récapitulatif.
function renderProgression() {
  const id  = document.getElementById('progression-athlete-select')?.value;
  const btn = document.getElementById('progression-add-btn');
  const emptyEl  = document.getElementById('progression-empty');
  const heroEl   = document.getElementById('progression-hero');
  const graphsEl = document.getElementById('progression-graphs');
  const tableWrap= document.getElementById('progression-table-wrap');
  const yearBar  = document.getElementById('year-filter-bar');

  if (!id) {
    if(btn) btn.style.display='none';
    emptyEl.style.display='flex';
    heroEl.classList.add('hidden');
    graphsEl.innerHTML='';
    if(tableWrap) tableWrap.classList.add('hidden');
    if(yearBar) yearBar.classList.add('hidden');
    return;
  }

  if(btn) btn.style.display='inline-flex';
  emptyEl.style.display='none';

  const athlete = athletes.find(x => x.id === id);
  if (!athlete) return;

  const allEntries = (historyData[id] || [])
    .map(e => ({...e}))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  // — En-tête de progression —
  renderProgressionHero(athlete, allEntries, heroEl);

  // — Boutons de filtre par année —
  const years = [...new Set(allEntries.map(e => e.date.slice(0,4)))].sort();
  renderYearFilterBar(years, yearBar);

  // — Filtrer les mesures selon l'année sélectionnée —
  const entries = progressionYearFilter === 'all'
    ? allEntries
    : allEntries.filter(e => e.date.startsWith(progressionYearFilter));

  if (!entries.length) {
    graphsEl.innerHTML = `<div class="graph-card" style="grid-column:1/-1">
      <div class="graph-no-data">
        <svg viewBox="0 0 48 48" fill="none" width="36" height="36"><path d="M8 36L20 20l8 10 6-8 6 8" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/><rect x="4" y="8" width="40" height="32" rx="3" stroke="#475569" stroke-width="1.5"/></svg>
        <p>Aucune mesure pour ${progressionYearFilter === 'all' ? 'cet athlète' : 'ann\u00e9e ' + progressionYearFilter}.<br>
        Cliquez sur <strong>+ Ajouter mesure</strong> pour commencer.</p>
      </div>
    </div>`;
    if(tableWrap) tableWrap.classList.add('hidden');
    return;
  }

  // — Graphes SVG —
  graphsEl.innerHTML = '';
  graphsEl.className = 'progression-graphs-grid';

  PROG_METRICS.forEach(metric => {
    const data = entries
      .filter(e => e[metric.key] !== '' && e[metric.key] !== null && e[metric.key] !== undefined)
      .map(e => ({ date: e.date, val: parseFloat(e[metric.key]) }))
      .filter(e => !isNaN(e.val));

    const card = document.createElement('div');
    card.className = 'graph-card';
    card.innerHTML = buildLineGraphHTML(metric, data);
    graphsEl.appendChild(card);
  });

  // — Tableau récapitulatif —
  renderProgressionTable(entries, allEntries, id, tableWrap);
}

function renderProgressionHero(athlete, entries, el) {
  const last  = entries[entries.length - 1];
  const first = entries[0];
  const count = entries.length;

  // Calcul progression sprint (si disponible)
  const sprintEntries = entries.filter(e => e.sprint);
  let sprintDelta = null;
  if (sprintEntries.length >= 2) {
    sprintDelta = (parseFloat(sprintEntries[0].sprint) - parseFloat(sprintEntries[sprintEntries.length-1].sprint)).toFixed(2);
  }

  const speedEntries = entries.filter(e => e.speed);
  let speedDelta = null;
  if (speedEntries.length >= 2) {
    speedDelta = (parseFloat(speedEntries[speedEntries.length-1].speed) - parseFloat(speedEntries[0].speed)).toFixed(1);
  }

  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="progression-hero">
      <div class="progression-hero-photo">
        ${athlete.photo
          ? `<img src="${athlete.photo}" alt="${esc(athlete.name)}"/>`
          : initials(athlete.name)}
      </div>
      <div class="progression-hero-info">
        <div class="progression-hero-name">${esc(athlete.name)}</div>
        <div class="progression-hero-meta">
          ${esc(athlete.sport)} · ${esc(athlete.country||'Afrique')} · ${athlete.age||'?'} ans
        </div>
        <div class="progression-hero-stats">
          <div class="prog-mini-stat">
            <span class="prog-mini-stat-val">${count}</span>
            <span class="prog-mini-stat-label">Mesures</span>
          </div>
          ${first ? `<div class="prog-mini-stat">
            <span class="prog-mini-stat-val" style="font-size:13px">${formatDate(first.date)}</span>
            <span class="prog-mini-stat-label">Première entrée</span>
          </div>` : ''}
          ${sprintDelta !== null ? `<div class="prog-mini-stat">
            <span class="prog-mini-stat-val" style="color:${+sprintDelta>0?'var(--success)':'var(--danger)'}">${+sprintDelta>0?'−':'+'}${Math.abs(sprintDelta)}s</span>
            <span class="prog-mini-stat-label">Gain Sprint</span>
          </div>` : ''}
          ${speedDelta !== null ? `<div class="prog-mini-stat">
            <span class="prog-mini-stat-val" style="color:${+speedDelta>0?'var(--success)':'var(--danger)'}">${+speedDelta>0?'+':''}${speedDelta} km/h</span>
            <span class="prog-mini-stat-label">Gain Vitesse</span>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

function renderYearFilterBar(years, barEl) {
  if (!barEl || !years.length) return;
  barEl.classList.remove('hidden');

  const pills = ['all', ...years];
  barEl.innerHTML = pills.map(y => `
    <button class="year-pill ${progressionYearFilter === y ? 'active' : ''}"
      onclick="setProgressionYearFilter('${y}')">
      ${y === 'all' ? 'Toutes les années' : y}
    </button>`).join('');
}

function setProgressionYearFilter(year) {
  progressionYearFilter = year;
  renderProgression();
}

// Construit le SVG d'une mesure ; les valeurs et les dates proviennent de l'historique filtré.
function buildLineGraphHTML(metric, data) {
  if (!data.length) {
    return `
      <div class="graph-card-header">
        <span class="graph-card-title">${metric.label}</span>
        <span class="graph-card-trend flat">— aucune donnée</span>
      </div>
      <div class="graph-no-data" style="height:120px">
        <svg viewBox="0 0 32 32" fill="none" width="24" height="24"><path d="M4 24L12 14l6 8 4-6 6 6" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/></svg>
        <small>Pas de données ${metric.label}</small>
      </div>`;
  }

  const first = data[0].val, last = data[data.length-1].val;
  const delta = (last - first);
  const deltaFormatted = (delta >= 0 ? '+' : '') + delta.toFixed(metric.key === 'sprint' ? 2 : 1);

  // Pour sprint : amélioration = valeur qui baisse
  const improved = metric.invert ? delta < 0 : delta > 0;
  const trendClass = delta === 0 ? 'flat' : (improved ? 'up' : 'down');
  const trendIcon  = delta === 0 ? '→' : (improved ? '↑' : '↓');

  // Dimensions du graphique SVG.
  const W = 400, H = 140, PAD = { top: 12, right: 12, bottom: 28, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const vals = data.map(d => d.val);
  const minVal = Math.min(...vals), maxVal = Math.max(...vals);
  const range  = maxVal - minVal || 1;
  const padded_min = minVal - range * 0.1;
  const padded_max = maxVal + range * 0.1;
  const padded_range = padded_max - padded_min || 1;

  function xPos(i) { return PAD.left + (i / Math.max(data.length-1, 1)) * chartW; }
  function yPos(v) { return PAD.top + chartH - ((v - padded_min) / padded_range) * chartH; }

  // Construire le tracé SVG de la courbe.
  const points = data.map((d, i) => `${xPos(i).toFixed(1)},${yPos(d.val).toFixed(1)}`);
  const linePath = 'M ' + points.join(' L ');

  // Tracer la zone remplie sous la courbe en fermant le polygone.
  const areaPath = linePath +
    ` L ${xPos(data.length-1).toFixed(1)},${(PAD.top+chartH).toFixed(1)}` +
    ` L ${PAD.left.toFixed(1)},${(PAD.top+chartH).toFixed(1)} Z`;

  // Trois lignes horizontales de la grille.
  const gridLines = [0.25, 0.5, 0.75].map(p => {
    const y = PAD.top + chartH * (1-p);
    const val = (padded_min + padded_range * p).toFixed(1);
    return `
      <line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W-PAD.right}" y2="${y.toFixed(1)}" class="chart-grid-line"/>
      <text x="${PAD.left - 4}" y="${(y+3).toFixed(1)}" class="chart-axis-label" text-anchor="end">${val}</text>`;
  }).join('');

  // Libellés de l'axe horizontal (dates ; cinq au maximum).
  const step = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data
    .filter((_, i) => i === 0 || i === data.length-1 || i % step === 0)
    .map((d, _, arr) => {
      const idx = data.indexOf(d);
      return `<text x="${xPos(idx).toFixed(1)}" y="${(H-4).toFixed(1)}" class="chart-axis-label" text-anchor="middle">${d.date.slice(0,7)}</text>`;
    }).join('');

  // Points et infobulles HTML positionnés en absolu.
  const dotsHTML = data.map((d, i) => {
    const x = xPos(i), y = yPos(d.val);
    // Convertir les coordonnées SVG en pourcentages pour le positionnement absolu.
    const leftPct = (x / W * 100).toFixed(1);
    const topPct  = (y / H * 100).toFixed(1);
    return `<div class="chart-dot-wrapper" style="position:absolute;left:${leftPct}%;top:${topPct}%;transform:translate(-50%,-50%);z-index:3">
      <svg width="12" height="12" style="overflow:visible;cursor:pointer"
        onmouseenter="showChartTip(this,'${d.date}','${d.val} ${metric.unit}')"
        onmouseleave="hideChartTip(this)">
        <circle cx="6" cy="6" r="4" fill="${metric.color}" stroke="var(--bg)" stroke-width="2" class="chart-dot"/>
      </svg>
      <div class="chart-tooltip"><strong>${d.date}</strong>${d.val} ${metric.unit}</div>
    </div>`;
  }).join('');

  return `
    <div class="graph-card-header">
      <span class="graph-card-title">${metric.label}</span>
      <div class="graph-card-trend ${trendClass}">
        <span>${trendIcon}</span>
        <span>${deltaFormatted} ${metric.unit}</span>
        <span style="font-weight:400;color:var(--text-3);margin-left:4px">vs début</span>
      </div>
    </div>
    <div class="svg-chart-wrap" style="position:relative">
      <svg class="svg-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <!-- Grid -->
        ${gridLines}
        <!-- Area -->
        <path d="${areaPath}" fill="${metric.color}" class="chart-area"/>
        <!-- Line -->
        <path d="${linePath}" stroke="${metric.color}" class="chart-line"/>
        <!-- X labels -->
        ${xLabels}
        <!-- Y axis title -->
        <text x="10" y="${(PAD.top + chartH/2).toFixed(1)}" class="chart-axis-label"
          transform="rotate(-90,10,${(PAD.top + chartH/2).toFixed(1)})" text-anchor="middle">${metric.unit}</text>
      </svg>
      <!-- Interactive dots -->
      ${dotsHTML}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text-3)">
      <span>Min: <strong style="color:var(--text)">${Math.min(...vals).toFixed(1)} ${metric.unit}</strong></span>
      <span>Moy: <strong style="color:var(--accent)">${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)} ${metric.unit}</strong></span>
      <span>Max: <strong style="color:var(--text)">${Math.max(...vals).toFixed(1)} ${metric.unit}</strong></span>
    </div>`;
}

function showChartTip(svgEl, date, value) {
  const tip = svgEl.parentElement.querySelector('.chart-tooltip');
  if (tip) tip.classList.add('visible');
}

function hideChartTip(svgEl) {
  const tip = svgEl.parentElement.querySelector('.chart-tooltip');
  if (tip) tip.classList.remove('visible');
}

function renderProgressionTable(entries, allEntries, athleteId, tableWrap) {
  if (!tableWrap) return;
  tableWrap.classList.remove('hidden');

  const countEl = document.getElementById('prog-entry-count');
  if (countEl) countEl.textContent = currentLanguage === 'en'
    ? `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`
    : `${entries.length} entrée${entries.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('progression-table-body');
  if (!tbody) return;

  // Outil de calcul de l'écart entre la mesure et la précédente.
  function deltaCell(curr, prev, key, unit, invert=false) {
    if (!curr[key] || !prev?.[key]) return `<td style="color:var(--text-3)">—</td>`;
    const d = parseFloat(curr[key]) - parseFloat(prev[key]);
    if (Math.abs(d) < 0.001) return `<td><span class="delta-badge neu">= ${curr[key]}${unit}</span></td>`;
    const improved = invert ? d < 0 : d > 0;
    const sign = d > 0 ? '+' : '';
    const cls  = improved ? 'pos' : 'neg';
    return `<td><span class="delta-badge ${cls}">${sign}${d.toFixed(key==='sprint'?2:1)} ${unit}</span></td>`;
  }

  const sorted = [...entries].sort((a,b) => new Date(b.date)-new Date(a.date));
  tbody.innerHTML = sorted.map((e, i) => {
    const prev = sorted[i+1]; // Mesure précédente dans le temps (suivante dans la liste inversée).
    return `<tr>
      <td style="font-weight:600;white-space:nowrap">${formatDate(e.date)}</td>
      ${e.weight    ? deltaCell(e,prev,'weight','kg')    : '<td style="color:var(--text-3)">—</td>'}
      ${e.sprint    ? deltaCell(e,prev,'sprint','s',true): '<td style="color:var(--text-3)">—</td>'}
      ${e.speed     ? deltaCell(e,prev,'speed','km/h')   : '<td style="color:var(--text-3)">—</td>'}
      ${e.vo2       ? deltaCell(e,prev,'vo2','')         : '<td style="color:var(--text-3)">—</td>'}
      ${e.strength  ? deltaCell(e,prev,'strength','/100'): '<td style="color:var(--text-3)">—</td>'}
      ${e.endurance ? deltaCell(e,prev,'endurance','/100'): '<td style="color:var(--text-3)">—</td>'}
      <td style="color:var(--text-2);font-size:12px;max-width:160px">${esc(e.note||'—')}</td>
      <td>
        <button onclick="deleteHistoryEntry('${athleteId}','${e.date}')"
          style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:13px;padding:2px 6px"
          title="Supprimer cette entrée">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function openHistoryModalFromProgression() {
  const sel = document.getElementById('progression-athlete-select');
  const id  = sel?.value;
  if (!id) return;
  // Synchroniser la liste de sélection de l'athlète dans l'historique.
  const hSel = document.getElementById('history-athlete-select');
  if (hSel) hSel.value = id;
  document.getElementById('h-date').value = new Date().toISOString().split('T')[0];
  ['h-weight','h-sprint','h-vo2','h-speed','h-strength','h-endurance','h-note']
    .forEach(f => { const el=document.getElementById(f); if(el) el.value=''; });
  document.getElementById('history-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Après l'enregistrement, actualiser la progression.
  window._progressionRefreshNeeded = true;
}

function renderReportsPage(){ updateFilters(); }

function exportRosterPDF(){
  const rows=athletes.map(a=>`
    <tr>
      <td>${esc(a.name)}</td><td>${a.age||'—'}</td><td>${esc(a.sport)}</td>
      <td>${esc(a.country||'—')}</td><td>${a.height||'—'} cm</td><td>${a.weight||'—'} kg</td>
      <td>${a.sprint||'—'} s</td><td>${a.speed||'—'} km/h</td><td>${a.vo2||'—'}</td>
    </tr>`).join('');
  const dist=sportCounts();
  const distRows=Object.entries(dist).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<tr><td>${esc(s)}</td><td>${n}</td></tr>`).join('');
  const content=`
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:900px;margin:0 auto;padding:40px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #22d3ee">
        <div style="font-size:28px;font-weight:900;letter-spacing:-1px">SportData</div>
        <div style="color:#64748b;font-size:13px">Rapport d'effectif complet</div>
        <div style="margin-left:auto;font-size:12px;color:#94a3b8">${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px">
        ${[['Total athlètes',athletes.length],['Âge moyen',avg(athletes.map(a=>+a.age).filter(Boolean)).toFixed(1)+' ans'],['Taille moy.',avg(athletes.map(a=>+a.height).filter(Boolean)).toFixed(1)+' cm'],['Sports',Object.keys(dist).length]].map(([l,v])=>`
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${l}</div>
            <div style="font-size:22px;font-weight:700">${v}</div>
          </div>`).join('')}
      </div>
      <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#475569;text-transform:uppercase;letter-spacing:0.05em">Effectif complet</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:28px">
        <thead><tr style="background:#0f172a;color:#fff">
          <th style="padding:10px 12px;text-align:left">Nom</th><th style="padding:10px 6px">Âge</th>
          <th style="padding:10px 6px">Sport</th><th style="padding:10px 6px">Pays</th>
          <th style="padding:10px 6px">Taille</th><th style="padding:10px 6px">Poids</th>
          <th style="padding:10px 6px">Sprint</th><th style="padding:10px 6px">Vitesse</th>
          <th style="padding:10px 6px">VO₂</th>
        </tr></thead>
        <tbody>${rows||'<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">Aucun athlète</td></tr>'}</tbody>
      </table>
      <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#475569;text-transform:uppercase;letter-spacing:0.05em">Répartition par sport</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left">Sport</th><th style="padding:8px 12px;text-align:right">Athlètes</th></tr></thead>
        <tbody>${distRows}</tbody>
      </table>
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
        Généré par SportData Africa · ${new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>`;
  showPDFPreview(content,'Rapport d\'effectif');
}

function exportAthletePDF(){
  const id=document.getElementById('pdf-athlete-select').value;
  if(!id){toast('Sélectionnez un athlète.','error');return;}
  const a=athletes.find(x=>x.id===id);
  if(a) generateAthletePDF(a);
}

function exportAnalyticsPDF(){
  const dist=sportCounts();
  const ages=athletes.map(a=>+a.age).filter(Boolean);
  const heights=athletes.map(a=>+a.height).filter(Boolean);
  const weights=athletes.map(a=>+a.weight).filter(Boolean);
  const speeds=athletes.map(a=>+a.speed).filter(Boolean);
  const vo2s=athletes.map(a=>+a.vo2).filter(Boolean);
  const content=`
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:800px;margin:0 auto;padding:40px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #22d3ee">
        <div style="font-size:22px;font-weight:900">SportData</div>
        <div style="color:#64748b;font-size:13px">Rapport analytique</div>
        <div style="margin-left:auto;font-size:12px;color:#94a3b8">${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px">
        ${[
          ['Total athlètes',athletes.length,''],
          ['Âge moyen',ages.length?avg(ages).toFixed(1):'—',' ans'],
          ['Taille moy.',heights.length?avg(heights).toFixed(1):'—',' cm'],
          ['Poids moy.',weights.length?avg(weights).toFixed(1):'—',' kg'],
          ['Vitesse moy.',speeds.length?avg(speeds).toFixed(1):'—',' km/h'],
          ['VO₂ moy.',vo2s.length?avg(vo2s).toFixed(1):'—',' ml/kg/min'],
        ].map(([l,v,u])=>`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${l}</div><div style="font-size:20px;font-weight:700">${v}${u}</div></div>`).join('')}
      </div>
      <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px">Répartition par sport</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <thead><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left;font-size:12px">Sport</th><th style="text-align:right;padding:8px 12px;font-size:12px">Athlètes</th><th style="text-align:right;padding:8px 12px;font-size:12px">%</th></tr></thead>
        <tbody>${Object.entries(dist).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(s)}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600">${n}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${((n/athletes.length)*100).toFixed(1)}%</td></tr>`).join('')}</tbody>
      </table>
      <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px">Top 5 – Vitesse maximale</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left;font-size:12px">Athlète</th><th style="text-align:left;padding:8px 12px;font-size:12px">Sport</th><th style="text-align:right;padding:8px 12px;font-size:12px">Vitesse (km/h)</th></tr></thead>
        <tbody>${[...athletes].filter(a=>a.speed).sort((a,b)=>+b.speed-+a.speed).slice(0,5).map(a=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(a.name)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${esc(a.sport)}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#22d3ee">${a.speed}</td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">Généré par SportData Africa · ${new Date().toLocaleDateString('fr-FR')}</div>
    </div>`;
  showPDFPreview(content,'Rapport analytique');
}

// Assemble une fiche PDF à partir du profil et des performances de l'athlète.
function generateAthletePDF(a){
  if(!a) return;
  const photoHtml=a.photo?`<img src="${a.photo}" style="width:100px;height:100px;border-radius:8px;object-fit:cover;border:2px solid #e2e8f0" alt=""/>`:
    `<div style="width:100px;height:100px;border-radius:8px;background:#0f172a;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:rgba(255,255,255,0.15)">${initials(a.name)}</div>`;
  const bmi=a.height&&a.weight?(+a.weight/((+a.height/100)**2)).toFixed(1):'—';
  const row=(l,v)=>`<tr><td style="padding:8px 12px;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9">${l}</td><td style="padding:8px 12px;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9">${v||'—'}</td></tr>`;
  const bar=(l,v,max,col='#22d3ee',inv=false)=>{
    if(!v) return '';
    let p=(+v/max)*100; if(inv) p=100-p;
    p=Math.min(Math.max(p,3),100);
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#64748b">${l}</span><span style="font-weight:600">${v}</span></div>
      <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden"><div style="height:100%;width:${p}%;background:${col};border-radius:4px"></div></div>
    </div>`;
  };
  const content=`
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:800px;margin:0 auto;padding:40px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #22d3ee">
        <div style="font-size:22px;font-weight:900;letter-spacing:-1px">SportData</div>
        <div style="color:#64748b;font-size:13px">Profil athlète</div>
        <div style="margin-left:auto;font-size:12px;color:#94a3b8">${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div style="display:flex;gap:24px;margin-bottom:32px;background:#f8fafc;border-radius:12px;padding:24px">
        ${photoHtml}
        <div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#22d3ee;font-weight:700;margin-bottom:6px">${esc(a.sport)}</div>
          <div style="font-size:24px;font-weight:900;letter-spacing:-0.5px;margin-bottom:6px">${esc(a.name)}</div>
          <div style="font-size:13px;color:#64748b">${[a.age?a.age+' ans':'',a.city,a.country].filter(Boolean).join(' · ')}</div>
          ${a.level?`<div style="margin-top:8px;display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px">${esc(a.level)}</div>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">
        <div>
          <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">Données corporelles</h2>
          <table style="width:100%;border-collapse:collapse">
            ${row('Taille',a.height?a.height+' cm':null)}
            ${row('Poids',a.weight?a.weight+' kg':null)}
            ${row('IMC',bmi)}
            ${row('Envergure',a.armspan?a.armspan+' cm':null)}
            ${row('Long. jambe',a.leglength?a.leglength+' cm':null)}
          </table>
        </div>
        <div>
          <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">Données physiologiques</h2>
          <table style="width:100%;border-collapse:collapse">
            ${row('FC repos',a.hr?a.hr+' bpm':null)}
            ${row('% Graisse',a.bodyfat?a.bodyfat+'%':null)}
            ${row('Masse musc.',a.muscle?a.muscle+' kg':null)}
            ${row('VO₂ Max',a.vo2?a.vo2+' ml/kg/min':null)}
          </table>
        </div>
      </div>
      <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px">Performance</h2>
      ${bar('Sprint 100m',a.sprint,15,'#22d3ee',true)}
      ${bar('Saut vertical (cm)',a.jump,100,'#34d399')}
      ${bar('Vitesse max (km/h)',a.speed,45,'#fbbf24')}
      ${bar('VO₂ Max',a.vo2,80,'#a78bfa')}
      ${bar('Force',a.strength,100,'#f87171')}
      ${bar('Endurance',a.endurance,100,'#60a5fa')}
      ${bar('Souplesse',a.flexibility,100,'#4ade80')}
      ${a.notes?`<div style="margin-top:24px;background:#f8fafc;border-left:3px solid #22d3ee;padding:14px 18px;border-radius:0 8px 8px 0;font-size:13px;color:#475569"><strong>Notes : </strong>${esc(a.notes)}</div>`:''}
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">Généré par SportData Africa · ${new Date().toLocaleDateString('fr-FR')}</div>
    </div>`;
  showPDFPreview(content,`Profil de ${a.name}`);
}

function showPDFPreview(html,title){
  const area=document.getElementById('pdf-preview-area');
  document.getElementById('pdf-content').innerHTML=html;
  area.classList.remove('hidden');
  area.scrollIntoView({behavior:'smooth',block:'start'});
  toast(`Rapport "${title}" prêt. Cliquez sur Imprimer.`,'success');
}

function printPDF(){
  const content=document.getElementById('pdf-content').innerHTML;
  const win=window.open('','_blank','width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SportData Report</title><style>body{margin:0;padding:0;background:#fff}table{border-collapse:collapse}td,th{vertical-align:top}@media print{@page{margin:20mm}}</style></head><body>${content}</body></html>`);
  win.document.close();
  setTimeout(()=>{win.focus();win.print();},400);
}

// Ouvre la saisie PIN et mémorise l'action à lancer seulement après validation.
function openPinModal(cb, level='admin') {
  _pinCallback      = cb || null;
  _pinRequiredLevel = level;
  _pinDigits        = [];
  _pinAttempts      = 0;

  // Vérifier si encore bloqué
  if (_pinBlockedUntil > Date.now()) {
    const remainSec = Math.ceil((_pinBlockedUntil - Date.now()) / 1000);
    showPinError(`Trop de tentatives. Réessayez dans ${remainSec}s.`);
    return;
  }

  const modal = document.getElementById('pin-modal');
  if (!modal) return;
  document.getElementById('pin-error').textContent = '';
  document.getElementById('pin-error').style.display = 'none';
  updatePinDisplay();
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Garder le focus dans la fenêtre modale tant qu'elle est ouverte.
  setTimeout(() => document.getElementById('pin-input-hidden')?.focus(), 100);
}

function closePinModal() {
  const modal = document.getElementById('pin-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  _pinCallback = null;
  _pinDigits   = [];
  updatePinDisplay();
  // Effacer le message d'erreur
  const errEl = document.getElementById('pin-error');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
}

function updatePinDisplay() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < _pinDigits.length);
    dot.classList.toggle('active', i === _pinDigits.length);
  });
}

function pinKeyPress(val) {
  if (val === 'del') {
    _pinDigits.pop();
    updatePinDisplay();
    return;
  }
  if (_pinDigits.length >= 4) return;
  _pinDigits.push(val);
  updatePinDisplay();

  // Faire clignoter le point correspondant au chiffre saisi.
  const dot = document.querySelectorAll('.pin-dot')[_pinDigits.length - 1];
  if (dot) {
    dot.classList.add('flash');
    setTimeout(() => dot.classList.remove('flash'), 200);
  }

  if (_pinDigits.length === 4) {
    setTimeout(() => validatePin(), 200);
  }
}

/* validatePin() — définie plus bas (version unifiée) */

function showPinError(msg) {
  const el = document.getElementById('pin-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function shakePinModal() {
  const box = document.querySelector('.pin-modal-box');
  if (!box) return;
  box.classList.add('pin-shake');
  setTimeout(() => box.classList.remove('pin-shake'), 500);
}

function startPinLockTimer() {
  if (pinLockTimer) clearTimeout(pinLockTimer);
  pinLockTimer = setTimeout(() => {
    pinVerified = false;
    addNotif('🔒 Session PIN expirée. PIN requis au prochain accès.');
    toast('Session PIN expirée.', 'info');
  }, PIN_SESSION_MINUTES * 60 * 1000);
}

function revokePinSession() {
  pinVerified = false;
  if (pinLockTimer) { clearTimeout(pinLockTimer); pinLockTimer = null; }
  toast('Session PIN révoquée.', 'info');
  addNotif('🔒 Session PIN révoquée manuellement.');
}

function showChangePinForm() {
  const form = document.getElementById('change-pin-form');
  if (form) form.classList.toggle('hidden');
}

// Regroupe les contrôles de cohérence avant toute écriture d'un profil athlète.
function validateAthleteForm() {
  const errors  = [];
  const banner  = document.getElementById('form-error-banner');
  const errList = document.getElementById('form-error-list');
  console.log('validateAthleteForm: start');

  // Champs obligatoires
  const required = [
    { id: 'f-name',   label: 'Nom complet' },
    { id: 'f-gender', label: 'Genre' },
    { id: 'f-age',    label: 'Âge' },
    { id: 'f-sport',  label: 'Sport' },
  ];
  required.forEach(({id, label}) => {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      errors.push(`${label} est obligatoire.`);
      if (el) el.classList.add('field-error');
    }
  });

  // Âge plausible
  const age = parseInt(document.getElementById('f-age')?.value);
  if (!isNaN(age) && (age < 8 || age > 50)) {
    errors.push('Âge doit être entre 8 et 50 ans.');
  }

  // Vérifier le format de l'adresse e-mail.
  const email = document.getElementById('f-email')?.value.trim();
  if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    errors.push('Format email invalide.');
  }

  // Vérification valeurs numériques hors plage
  const numericChecks = [
    {id:'f-height',   min:100, max:230, label:'Taille'},
    {id:'f-weight',   min:30,  max:200, label:'Poids'},
    {id:'f-sprint',   min:9.5, max:25,  label:'Sprint 100m'},
    {id:'f-speed',    min:10,  max:50,  label:'Vitesse max'},
    {id:'f-vo2',      min:20,  max:90,  label:'VO₂ Max'},
    {id:'f-hr',       min:30,  max:110, label:'FC repos'},
    {id:'f-strength', min:1,   max:100, label:'Force'},
    {id:'f-endurance',min:1,   max:100, label:'Endurance'},
    {id:'f-flexibility',min:1, max:100, label:'Souplesse'},
  ];
  numericChecks.forEach(({id, min, max, label}) => {
    const el = document.getElementById(id);
    if (!el || !el.value) return;
    const n = parseFloat(el.value);
    if (isNaN(n) || n < min || n > max) {
      errors.push(`${label} : valeur hors plage (${min}–${max}).`);
      el.classList.add('field-error');
    }
  });

  // Cohérence taille/envergure (l'envergure > taille est possible mais > taille+30cm = suspect)
  const h = parseFloat(document.getElementById('f-height')?.value);
  const arm = parseFloat(document.getElementById('f-armspan')?.value);
  if (h && arm && arm > h + 40) {
    errors.push(`Envergure (${arm}cm) paraît incohérente avec la taille (${h}cm).`);
  }

  // Cohérence poids/masse musculaire (masse musc ne peut pas dépasser 60% du poids)
  const w = parseFloat(document.getElementById('f-weight')?.value);
  const mu = parseFloat(document.getElementById('f-muscle')?.value);
  if (w && mu && mu > w * 0.65) {
    errors.push(`Masse musculaire (${mu}kg) incohérente avec le poids (${w}kg).`);
  }

  // Affichage résumé erreurs
  if (banner) {
    banner.classList.toggle('visible', errors.length > 0);
    if (errList) {
      errList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
    }
  }

  // Faire défiler jusqu'au résumé des erreurs.
  if (errors.length > 0) {
    console.log('validateAthleteForm: validation errors', errors);
    banner?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    console.log('validateAthleteForm: valid');
  }

  return errors.length === 0;
}

function validateField(fieldId) {
  const el  = document.getElementById(fieldId);
  const err = document.getElementById('err-' + fieldId.replace('f-',''));
  const rule = FIELD_RULES[fieldId];
  if (!el || !rule) return true;

  const val = el.value.trim();
  let msg   = '';

  if (rule.required && !val) {
    msg = `${rule.label} est obligatoire.`;
  } else if (val && rule.pattern && !rule.pattern.test(val)) {
    msg = `Format ${rule.label} invalide.`;
  } else if (val && rule.min !== undefined && rule.max !== undefined) {
    if (rule.length) {
      if (val.length < rule.min || val.length > rule.max) {
        msg = `${rule.label} doit comporter entre ${rule.min} et ${rule.max} caractères.`;
      }
    } else {
      const n = parseFloat(val);
      if (isNaN(n)) {
        msg = `${rule.label} doit être un nombre.`;
      } else if (n < rule.min || n > rule.max) {
        msg = `${rule.label} doit être entre ${rule.min} et ${rule.max}.`;
      }
    }
  }

  el.classList.toggle('field-error', !!msg);
  el.classList.toggle('field-ok',    !msg && !!val);
  if (err) {
    err.textContent = msg;
    err.classList.toggle('visible', !!msg);
  }

  updateFormProgress();
  checkDuplicate();
  return !msg;
}

function validateNumericField(el, min, max) {
  const val = parseFloat(el.value);
  const ok  = !el.value || (!isNaN(val) && val >= min && val <= max);
  el.classList.toggle('field-error', !ok && !!el.value);
  el.classList.toggle('field-ok',    ok  && !!el.value);
  if (!ok && el.value) {
    el.title = `Valeur attendue : ${min} – ${max}`;
  } else {
    el.title = '';
  }
  updateFormProgress();
}

function updateFormProgress() {
  const trackable = [
    'f-name','f-age','f-sport','f-email','f-country',
    'f-height','f-weight','f-sprint','f-speed','f-vo2',
    'f-strength','f-endurance','f-hr','f-bodyfat',
  ];
  const filled = trackable.filter(id => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '';
  }).length;
  const pct = Math.round((filled / trackable.length) * 100);
  const fill = document.getElementById('form-progress-fill');
  const label = document.getElementById('form-progress-pct');
  if (fill)  fill.style.width = pct + '%';
  if (label) label.textContent = pct + '%';

  // Couleur selon complétude
  if (fill) {
    if (pct >= 80)      fill.style.background = 'linear-gradient(90deg,var(--success),#4ade80)';
    else if (pct >= 50) fill.style.background = 'linear-gradient(90deg,var(--accent-2),var(--accent))';
    else                fill.style.background = 'linear-gradient(90deg,#f59e0b,var(--warn))';
  }
}

function checkDuplicate() {
  const name    = (document.getElementById('f-name')?.value || '').trim().toLowerCase();
  const editId  = document.getElementById('f-edit-id')?.value;
  const warn    = document.getElementById('duplicate-warning');
  const msg     = document.getElementById('duplicate-msg');
  if (!warn || !name || name.length < 3) { warn.classList.remove('visible'); return; }

  const similar = athletes.filter(a => {
    if (a.id === editId) return false;
    const aName = a.name.toLowerCase();
    // Similarité : même début, ou distance de Levenshtein faible
    return aName === name ||
           aName.startsWith(name.slice(0,4)) ||
           name.startsWith(aName.slice(0,4)) ||
           levenshtein(aName, name) <= 2;
  });

  if (similar.length > 0) {
    const names = similar.map(a => `"${a.name}" (${a.sport})`).join(', ');
    msg.textContent = `Un athlète similaire existe déjà : ${names}. Vérifiez avant de continuer.`;
    warn.classList.add('visible');
  } else {
    warn.classList.remove('visible');
  }
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({length:m+1}, (_,i)=>Array.from({length:n+1},(_,j)=>i?j?0:i:j));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    d[i][j] = a[i-1]===b[j-1] ? d[i-1][j-1] : 1+Math.min(d[i-1][j],d[i][j-1],d[i-1][j-1]);
  return d[m][n];
}


document.addEventListener('keydown', function(e) {
  const modal = document.getElementById('pin-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  if (e.key >= '0' && e.key <= '9') { pinKeyPress(e.key); e.preventDefault(); }
  if (e.key === 'Backspace')         { pinKeyPress('del'); e.preventDefault(); }
  if (e.key === 'Escape')            { closePinModal(); }
});
/* ══ LECTURE DES FICHIERS ══════════════════════════════════ */
function readFile(f) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

/* ══ STOCKAGE DU PIN (PIN uniquement dans localStorage) ═════ */
// Le PIN reste dans localStorage pour simplifier le fonctionnement local.
// Les journaux d'accès sont conservés dans Supabase (voir renderPinLogs ci-dessus).
function getPinStored(level = 'admin') {
  const key = level === 'pdg' ? 'sportdata_pdg_pin' : 'sportdata_admin_pin';
  const stored = localStorage.getItem(key);
  if (stored && /^\d{4,8}$/.test(stored)) {
    return stored;
  }
  return level === 'pdg' ? DEFAULT_PDG_PIN : DEFAULT_ADMIN_PIN;
}

/* ══ PIN : STOCKAGE ET VALIDATION ═══════════════════════════
   Les PIN sont stockés dans localStorage :
   - sportdata_admin_pin = PIN admin / ajout d'athlète (2003)
   - sportdata_pdg_pin   = PIN PDG / accès principal (1205)
   Valeurs par défaut : 2003 (admin), 1205 (PDG)
   ════════════════════════════════════════════════════════════ */

function setPinStored(pin, level = 'admin') {
  const key = level === 'pdg' ? 'sportdata_pdg_pin' : 'sportdata_admin_pin';
  localStorage.setItem(key, pin);
}

/* Validation PIN — cette fonction est la seule à utiliser */
function checkAndValidatePin() {
  const entered    = _pinDigits.join('');
  const adminPin   = getPinStored('admin');
  const pdgPin     = getPinStored('pdg');
  const isAdminPin = entered === adminPin;
  const isPdgPin   = entered === pdgPin;
  const required   = _pinRequiredLevel;

  const valid = required === 'pdg'
    ? isPdgPin
    : required === 'admin'
      ? isAdminPin || isPdgPin
      : false;

  if (valid) {
    /* ── SUCCÈS ── */
    pinVerified  = isPdgPin ? 'pdg' : 'admin';
    _pinAttempts = 0;

    // Fermer proprement la fenêtre modale.
    const modal = document.getElementById('pin-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    _pinDigits = [];
    updatePinDisplay();

    // Effacer l'erreur
    const errEl = document.getElementById('pin-error');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

    // Enregistrer la réussite dans la base de données.
    if (currentUser) logPinAccess('success');

    // Afficher une notification.
    toast('Accès accordé ✓', 'success');

    // Exécuter la fonction de rappel, qui ouvre la page protégée.
    const cb = _pinCallback;
    _pinCallback = null;
    if (typeof cb === 'function') cb();

  } else {
    /* ── ÉCHEC ── */
    _pinAttempts++;
    _pinDigits = [];
    updatePinDisplay();

    // Enregistrer l'échec dans la base de données.
    if (currentUser) logPinAccess('fail');

    if (_pinAttempts >= PIN_MAX_ATTEMPTS) {
      _pinBlockedUntil = Date.now() + PIN_BLOCK_MINUTES * 60 * 1000;
      _pinAttempts     = 0;
      showPinError(`Trop de tentatives. Réessayez dans ${PIN_BLOCK_MINUTES} minutes.`);
      shakePinModal();
      // Fermer automatiquement après 2.5s
      setTimeout(function() {
        const modal = document.getElementById('pin-modal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        _pinCallback = null;
      }, 2500);
    } else {
      const rem = PIN_MAX_ATTEMPTS - _pinAttempts;
      showPinError('PIN incorrect. ' + rem + ' tentative' + (rem > 1 ? 's' : '') + ' restante' + (rem > 1 ? 's' : '') + '.');
      shakePinModal();
    }
  }
}

/* Alias conservé pour rester compatible avec l'appel depuis pinKeyPress. */
function validatePin() {
  checkAndValidatePin();
}


/* ═══════════════════════════════════════════════════════════
   PWA — INSTALLATION
   ═══════════════════════════════════════════════════════════ */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Afficher le bouton d'installation.
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.classList.add('hidden');
  toast('✅ SportData installé avec succès !', 'success');
});

async function installPWA() {
  if (!deferredInstallPrompt) {
    toast("Menu navigateur → Ajouter à l’écran d’accueil", 'info');
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    toast('Installation en cours…', 'success');
  }
  deferredInstallPrompt = null;
}
