const request = require('supertest');
const app = require('../index');  // Import the app for testing

describe('Auth Routes', () => {
  describe('POST /api/auth/signup', () => {
    it('should return 400 if email is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'TestPassword123!'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Invalid email format');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'testuser@example.com'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe(`Missing required key 'Password' in params`);
    });

    it('should return 201 if sign-up is successful', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'testuser5@example.com', // make sure this is a new user email
          password: 'TestPassword123!'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('User successfully signed up and added to database!');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Incorrect username or password.');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Missing required parameter PASSWORD');
    });

    it('should return 200 and the JWT token if login is successful', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'kisaw17744@ofionk.com', // make sure this user have a verified email first
          password: 'YourPassword@123'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });
});