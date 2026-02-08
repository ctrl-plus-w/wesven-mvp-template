/// <reference types="cypress" />

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login');
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').click();
      cy.url().should('contain', '/dashboard');
    },
    {
      validate() {
        cy.getCookie('<PROJECT_NAME>.session_token').should('exist');
      },
      cacheAcrossSpecs: false,
    },
  );
});
