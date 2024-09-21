const request = require('supertest');
const app = require('../index');  // Import the app for testing

describe('Favorites Routes', () => {
  let token;

  // Login to get a Bearer token before running the tests
  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'kisaw17744@ofionk.com',  // Ensure this test user exists
        password: 'YourPassword@123'
      });

    token = loginResponse.body.token;  // Store the JWT token for use in the tests
  });

  describe('POST /api/favorites', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .post('/api/favorites')
        .send({ movieId: 27205 });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Access token missing');
    });

    it('should return 201 when a movie is added to favorites with a valid token', async () => {
      const response = await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 27205  // Example movie ID (Inception)
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('Movie added to favorites successfully!');
    });
  });

  describe('GET /api/favorites', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .get('/api/favorites');

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Access token missing');
    });

    it('should return 200 and the list of favorite movies when token is valid', async () => {
      const response = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);  // Check if the response is an array
    });
  });

  describe('DELETE /api/favorites/:movieId', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .delete('/api/favorites/27205');

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Access token missing');
    });

    it('should return 200 when a movie is removed from favorites', async () => {
      const response = await request(app)
        .delete('/api/favorites/27205')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Movie removed from favorites successfully!');
    });

    it('should return 404 if movie is not found in favorites', async () => {
      const response = await request(app)
        .delete('/api/favorites/99999')  // Non-existent movie ID
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Movie not found in favorites');
    });
  });
});
