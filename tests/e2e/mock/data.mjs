// Synthetic seed data for the RealWorld mock used by the Playwright E2E net.
// AGENTS.md Princípio 3: zero segredos reais — tudo fabricado e óbvio.
// Esquema Token (GUIA §3.2/§16): o token é um placeholder claramente falso.

export const FAKE_TOKEN = 'fake.jwt.token-for-e2e';

export function seedState() {
  // Estado mutável por teste (cada worker/route recebe um clone via structuredClone).
  return {
    // usuário autenticado nos fluxos sociais (NÃO é autor do artigo, para
    // expor follow/favorite que o template esconde do próprio autor).
    currentUser: {
      email: 'e2e-tester@example.com',
      username: 'e2e-tester',
      bio: null,
      image: 'https://static.productionready.io/images/smiley-cyrus.jpg',
      token: FAKE_TOKEN,
    },
    // autor dos artigos do feed.
    author: {
      username: 'alice',
      bio: 'I work at AngularJS Conduit',
      image: 'https://static.productionready.io/images/smiley-cyrus.jpg',
      following: false,
    },
    tags: ['angularjs', 'migration', 'testing'],
    articles: [
      {
        slug: 'how-to-build-webapps-1',
        title: 'How to build webapps',
        description: 'Ever wonder how?',
        body: 'It takes a Jacobian. # heading\n\nbody text.',
        tagList: ['angularjs', 'testing'],
        createdAt: '2022-01-01T03:22:56.637Z',
        updatedAt: '2022-01-01T03:48:35.824Z',
        favorited: false,
        favoritesCount: 3,
        author: {
          username: 'alice',
          bio: 'I work at AngularJS Conduit',
          image: 'https://static.productionready.io/images/smiley-cyrus.jpg',
          following: false,
        },
      },
    ],
  };
}
