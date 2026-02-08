const ERRORS = {
  AUTH: {
    INVALID_EMAIL_OR_PASSWORD: 'Email ou mot de passe invalide',
    EMAIL_ALREADY_EXISTS: 'Cet email existe déjà',
    INVALID_EMAIL: 'Adresse email invalide',
    INVALID_PASSWORD: 'Mot de passe invalide',
    USER_NOT_FOUND: 'Utilisateur non trouvé',

    INVALID_SESSION: 'Session invalide',
    SESSION_EXPIRED: 'Session expirée',

    INVALID_TOKEN: 'Token invalide',
    TOKEN_EXPIRED: 'Token expiré',

    OAUTH_ACCOUNT_ALREADY_LINKED: 'Ce compte est déjà lié',
    OAUTH_CALLBACK_ERROR: 'Erreur lors de la connexion OAuth',

    EMAIL_NOT_VERIFIED: 'Email non vérifié',
    INVALID_VERIFICATION_TOKEN: 'Token de vérification invalide',

    INVALID_RESET_TOKEN: 'Token de réinitialisation invalide',
    PASSWORD_RESET_FAILED: 'Échec de la réinitialisation du mot de passe',

    INTERNAL_SERVER_ERROR: 'Erreur interne du serveur',
    UNAUTHORIZED: 'Non autorisé',
    FORBIDDEN: 'Interdit',
  },
};

export default ERRORS;
