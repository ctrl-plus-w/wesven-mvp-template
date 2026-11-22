const ERRORS = {
  /** The message a failed server action carries for each code. Clients branch on the code, users read the message. */
  SERVER: {
    unexpected: 'Une erreur inattendue est survenue.',
    'invalid-data': 'Les données sont invalides.',
    'not-found': 'Ressource non trouvée.',
    unauthorized: "Vous n'avez pas la permission d'effectuer cette action.",
    duplicate: 'Cette valeur est déjà utilisée.',
    'in-use': 'Impossible : cet élément est encore utilisé.',
    'too-long': 'Une valeur dépasse la longueur autorisée.',
    auth: "L'authentification a échoué.",
    'auth.sign-in-locked': 'Trop de tentatives de connexion échouées. Réessayez dans 15 minutes.',
    'auth.reset-mail-limit': 'Trop de demandes de réinitialisation. Réessayez dans une heure.',
  },

  /** Better Auth's `body.code` values, as the message shown to the user. */
  AUTH: {
    INVALID_EMAIL_OR_PASSWORD: 'Email ou mot de passe invalide',
    INVALID_EMAIL: 'Adresse email invalide',
    INVALID_PASSWORD: 'Mot de passe invalide',
    PASSWORD_TOO_SHORT: 'Mot de passe trop court',
    PASSWORD_TOO_LONG: 'Mot de passe trop long',
    USER_NOT_FOUND: 'Utilisateur non trouvé',
    USER_ALREADY_EXISTS: 'Cet email est déjà utilisé',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Cet email est déjà utilisé',
    BANNED_USER: 'Ce compte est suspendu',
    EMAIL_NOT_VERIFIED: 'Email non vérifié',

    SESSION_EXPIRED: 'Session expirée, reconnectez-vous',
    FAILED_TO_GET_SESSION: 'Session invalide',

    INVALID_TOKEN: 'Lien invalide ou expiré',
    TOKEN_EXPIRED: 'Lien expiré',
  },
} as const;

export default ERRORS;
