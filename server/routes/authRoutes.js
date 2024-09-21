const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();
const connection = require('../db');
const validator = require('validator');
const rateLimit = require('express-rate-limit');

AWS.config.update({ region: process.env.AWS_REGION });

// Initialize Cognito Identity Service Provider
const cognito = new AWS.CognitoIdentityServiceProvider();

// Rate limiter for sign-up
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 sign-up requests per windowMs
  message: 'Too many sign-up attempts, please try again after 1 hour'
});

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes'
});

// Sign-up route
router.post('/signup', signupLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  // Sanitize and validate inputs
  const safeUsername = validator.trim(validator.escape(username));
  const safeEmail = validator.normalizeEmail(email);

  if (!validator.isEmail(safeEmail)) {
    return res.status(400).json({
      message: 'Invalid email format'
    });
  }

  // Proceed with AWS Cognito sign-up process
  const params = {
    ClientId: process.env.AWS_COGNITO_CLIENT_ID, // Cognito App client ID
    Username: safeEmail, // Using email as the username
    Password: password,
    UserAttributes: [
      {
        Name: 'email',
        Value: safeEmail
      },
      {
        Name: 'name',
        Value: safeUsername
      }
    ]
  };

  try {
    // Sign up the user in AWS Cognito
    const result = await cognito.signUp(params).promise();

    // Extract the Cognito UserSub (unique user ID from Cognito)
    const userSub = result.UserSub;

    // Insert the user into the MySQL database
    const query = 'INSERT INTO Users (id, provider_id, username, email) VALUES (UUID(), ?, ?, ?)';
    connection.query(query, [userSub, safeUsername, safeEmail], (err) => {
      if (err) {
        return res.status(500).json({
          message: 'Error adding user to database',
          error: err.message
        });
      }

      res.status(201).json({
        message: 'User successfully signed up and added to database!',
        result
      });
    });
  } catch (error) {
    res.status(400).json({
      message: 'Error signing up user',
      error: error.message
    });
  }
});

// Login route
router.post('/login', loginLimiter,async (req, res) => {
  const { email, password } = req.body;

  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.AWS_COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  };

  try {
    const result = await cognito.initiateAuth(params).promise();

    if (!result.AuthenticationResult) {
      // Handle the case where the authentication result is missing
      return res.status(400).json({
        message: 'Error logging in',
        error: 'User is not confirmed or login failed. Please check your email or credentials.'
      });
    }

    // Return the JWT token if authentication is successful
    res.status(200).json({
      message: 'User successfully logged in!',
      token: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken
    });
  } catch (error) {
    // Log the full error details to catch specific AWS Cognito issues
    console.error('Cognito login error:', error);
    res.status(400).json({
      message: 'Error logging in',
      error: error.message || 'Unknown error occurred during login.'
    });
  }
});

// Email verification route
router.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;
  
    const params = {
      ClientId: process.env.AWS_COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code
    };
  
    try {
      const result = await cognito.confirmSignUp(params).promise();
      res.status(200).json({
        message: 'Email successfully verified!',
        result
      });
    } catch (error) {
      res.status(400).json({
        message: 'Error verifying email',
        error: error.message
      });
    }
  });

module.exports = router;