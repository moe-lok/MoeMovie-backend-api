const request = require('supertest');
const app = require('../index');  // Import the app for testing

describe('Movie Routes', () => {
  let token;

  // Login to get a Bearer token before running the tests
  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'kisaw17744@ofionk.com',  // Ensure this test user exists and email is verified
        password: 'YourPassword@123'
      });

    token = loginResponse.body.token;  // Store the JWT token for use in the tests
  });

  describe('GET /api/movies/search', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .get('/api/movies/search?q=Inception');

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Access token missing');
    });

    it('should return 400 if query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/movies/search')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Missing search query');
    });

    it('should return 200 and search results when valid token and query are provided', async () => {
      const response = await request(app)
        .get('/api/movies/search?q=Inception')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.results).toBeDefined();  // Ensure movie search results are returned
    });
  });

  describe('GET /api/movies/:movieId', () => {
    it('should return 200 and movie details when a valid movie ID is provided', async () => {
      const response = await request(app)
        .get('/api/movies/27205')  // Example movie ID (Inception)
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.title).toBe('Inception');  // Ensure movie title matches
    });

    it('should return 500 if movie is not found', async () => {
      const response = await request(app)
        .get('/api/movies/9999999')  // Non-existent movie ID
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(500);
      expect(response.body.message).toBe('Error fetching movie details');
    });
  });
});