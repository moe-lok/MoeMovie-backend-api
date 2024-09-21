const express = require('express');
const axios = require('axios');
const redis = require('redis');
const verifyToken = require('../middleware/verifyToken');
const connection = require('../db'); // MySQL connection
const router = express.Router();
const validator = require('validator'); 

// Initialize Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

// Connect to Redis server
redisClient.connect().catch((err) => {
  console.error('Error connecting to Redis:', err);
});

// Middleware to fetch the user from the MySQL database
const fetchUserFromDatabase = (req, res, next) => {
  const userSub = req.user.sub;  // Get the user's Cognito UserSub from the JWT token

  const query = 'SELECT * FROM Users WHERE provider_id = ?';  // provider_id is the Cognito UserSub
  connection.query(query, [userSub], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Database error fetching user',
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found in the database' });
    }

    req.localUser = results[0];  // Attach the user data from MySQL to the request
    next();
  });
};

// Middleware to fetch or store movie details in the database
const fetchOrStoreMovieInDatabase = async (movieId, res) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM Movies WHERE id = ?';
    connection.query(query, [movieId], async (err, results) => {
      if (err) {
        return reject('Database error fetching movie');
      }

      if (results.length > 0) {
        return resolve(results[0]);  // Movie exists in the database
      }

      try {
        // If movie doesn't exist, fetch from TMDb and insert into the database
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}`;
        const response = await axios.get(url);
        const movieData = response.data;

        // Insert movie data into the database
        const insertQuery = 'INSERT INTO Movies (id, title, release_date, overview, poster_url) VALUES (?, ?, ?, ?, ?)';
        connection.query(insertQuery, [movieData.id, movieData.title, movieData.release_date, movieData.overview, movieData.poster_path], (err) => {
          if (err) {
            return reject('Error storing movie in database');
          }

          resolve(movieData);  // Return the fetched movie data
        });
      } catch (error) {
        reject('Error fetching movie from TMDb');
      }
    });
  });
};

// Movie search route with Redis caching
router.get('/movies/search', verifyToken, fetchUserFromDatabase, async (req, res) => {
  const query = req.query.q;

  if (query == null) {
    // bad value - null or undefined
    return res.status(400).json({
      message: 'Missing search query'
    });
  }

  // Sanitize the search query to prevent any malicious input
  const safeQuery = validator.trim(validator.escape(query));

  try {
    // Check if the movie search query result is in Redis cache
    const cacheData = await redisClient.get(`movie_search_${safeQuery}`);
    if (cacheData) {
      return res.status(200).json(JSON.parse(cacheData));  // Return cached data
    }

    // If not cached, fetch the data from the TMDb API
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${safeQuery}`;
    const response = await axios.get(url);

    // Cache the movie search results for 1 hour
    await redisClient.setEx(`movie_search_${safeQuery}`, 3600, JSON.stringify(response.data));

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching movie data:', error);
    res.status(500).json({ message: 'Error fetching movie data' });
  }
});

// Route for searching or fetching movie details (with database integration)
router.get('/movies/:movieId', verifyToken, async (req, res) => {
  const { movieId } = req.params;

  // Check if the movie search id query result is in Redis cache
  const cacheData = await redisClient.get(`movieid_${movieId}`);
  if (cacheData) {
    return res.status(200).json(JSON.parse(cacheData));  // Return cached data
  }

  try {
    // First, check if the movie is in the database or fetch it and store it
    const movie = await fetchOrStoreMovieInDatabase(movieId, res);

    // Cache the movie search results for 1 hour
    await redisClient.setEx(`movieid_${movieId}`, 3600, JSON.stringify(movie));

    res.status(200).json(movie);  // Return movie details
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching movie details' });
  }
});

// Add a movie to favorites, ensuring the movie exists in the database first
router.post('/favorites', verifyToken, fetchUserFromDatabase, async (req, res) => {
  const { movieId } = req.body;
  const userId = req.localUser.id;  // User's MySQL ID

  try {
    // Ensure the movie is stored in the database before adding to favorites
    await fetchOrStoreMovieInDatabase(movieId, res);

    // Add the movie to the user's favorites
    const query = 'INSERT INTO Favourites (id, user_id, movie_id) VALUES (UUID(), ?, ?)';
    connection.query(query, [userId, movieId], (err) => {
      if (err) {
        return res.status(500).json({
          message: 'Error adding movie to favorites',
          error: err.message
        });
      }

      res.status(201).json({ message: 'Movie added to favorites successfully!' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding movie to favorites' });
  }
});

// Get all favorite movies of the user
router.get('/favorites', verifyToken, fetchUserFromDatabase, (req, res) => {
  const userId = req.localUser.id;  // Fetch the user ID from the MySQL Users table

  const query = `
    SELECT Movies.* FROM Favourites
    INNER JOIN Movies ON Favourites.movie_id = Movies.id
    WHERE Favourites.user_id = ?`;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Error fetching favorite movies',
        error: err.message
      });
    }

    res.status(200).json(results);
  });
});

// Remove a movie from the user's favorites (with existence check)
router.delete('/favorites/:movieId', verifyToken, fetchUserFromDatabase, (req, res) => {
  const { movieId } = req.params;
  const userId = req.localUser.id;  // Fetch the user ID from the MySQL Users table

  // Check if the movie is in the user's favorites before attempting to remove
  const checkQuery = 'SELECT * FROM Favourites WHERE user_id = ? AND movie_id = ?';
  connection.query(checkQuery, [userId, movieId], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Error checking favorites',
        error: err.message
      });
    }

    if (results.length === 0) {
      // Movie is not in the user's favorites
      return res.status(404).json({
        message: 'Movie not found in favorites'
      });
    }

    // Proceed with deletion if the movie exists in favorites
    const deleteQuery = 'DELETE FROM Favourites WHERE user_id = ? AND movie_id = ?';
    connection.query(deleteQuery, [userId, movieId], (err) => {
      if (err) {
        return res.status(500).json({
          message: 'Error removing movie from favorites',
          error: err.message
        });
      }

      res.status(200).json({ message: 'Movie removed from favorites successfully!' });
    });
  });
});

module.exports = router;
