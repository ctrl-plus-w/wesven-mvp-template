import { TEST_USERS, VIEWPORTS } from '@/e2e-support/constants';

describe('1.1 Global Authentication (Dashboard)', () => {
  before(() => {
    cy.task('resetDb');
    Cypress.session.clearAllSavedSessions();
  });

  beforeEach(() => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
  });

  context('desktop', () => {
    const user = TEST_USERS.user1;

    describe('1.1.1 Registration Flow', () => {
      it('should successfully register', () => {
        cy.visit('/register');
        cy.get('input[name="name"]').type(user.name);
        cy.get('input[name="email"]').type(user.email);
        cy.get('input[name="password"]').type(user.password);
        cy.get('input[name="confirmPassword"]').type(user.password);
        cy.get('button[type="submit"]').click();

        cy.url().should('include', '/dashboard');
        cy.getCookie('<PROJECT_NAME>.session_token').should('exist');
      });

      it('should show error when registering with existing email', () => {
        // catch next.js (better auth) errors
        cy.on('uncaught:exception', (err) => !err.message.includes('User already exists'));

        cy.visit('/register');
        cy.get('input[name="name"]').type('Another User');
        cy.get('input[name="email"]').type(user.email); // Use same email as user1
        cy.get('input[name="password"]').type('password123');
        cy.get('input[name="confirmPassword"]').type('password123');
        cy.get('button[type="submit"]').click();

        cy.get('[data-sonner-toast]').should('be.visible');
        cy.url().should('include', '/register');
      });

      it('should show error when passwords do not match', () => {
        cy.visit('/register');
        cy.get('input[name="name"]').type('Test User');
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('password123');
        cy.get('input[name="confirmPassword"]').type('differentpassword');
        cy.get('button[type="submit"]').click();

        cy.contains('Les deux mot de passe doivent être égaux.').should('be.visible');
        cy.url().should('include', '/register');
      });

      it('should show error for invalid email format', () => {
        cy.visit('/register');
        cy.get('input[name="name"]').type('Test User');
        cy.get('input[name="email"]').type('invalid-email');
        cy.get('input[name="password"]').type('password123');
        cy.get('input[name="confirmPassword"]').type('password123');

        cy.get('button[type="submit"]').click();

        cy.contains('adresse e-mail invalide').should('be.visible');
        cy.url().should('include', '/register');
      });
    });

    describe('1.1.2 Login Flow', () => {
      it('should successfully login', () => {
        cy.visit('/login');
        cy.get('input[name="email"]').type(user.email);
        cy.get('input[name="password"]').type(user.password);
        cy.get('button[type="submit"]').click();

        cy.url().should('include', '/dashboard');
        cy.getCookie('<PROJECT_NAME>.session_token').should('exist');
      });
    });

    describe('1.1.4 Logout Flow', () => {
      it('should successfully sign out', () => {
        cy.login(user.email, user.password);
        cy.visit('/dashboard/settings');

        cy.contains('button', 'Se déconnecter').click();
        cy.location('pathname').should('eq', '/login');
        cy.getCookie('<PROJECT_NAME>.session_token').should('not.exist');
      });
    });
  });
});
