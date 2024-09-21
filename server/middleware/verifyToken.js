const jwt = require('jsonwebtoken');
const axios = require('axios');
const jose = require('node-jose');

// Cognito JWKS URL
const jwksUrl = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  try {
    // Decode the token to get the key ID (kid)
    const decodedToken = jwt.decode(token, { complete: true });
    const kid = decodedToken.header.kid;

    // Fetch the JWKS from Cognito
    const response = await axios.get(jwksUrl);
    const keys = response.data.keys;
    const key = keys.find(k => k.kid === kid);

    if (!key) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Build the RSA public key using `n` and `e` if `x5c` is not available
    const jwk = {
      kty: key.kty,
      n: key.n,
      e: key.e
    };

    // Convert the JWK to a PEM format using node-jose
    const keystore = jose.JWK.createKeyStore();
    const rsaKey = await keystore.add(jwk, 'json');
    const publicKey = rsaKey.toPEM();

    // Verify the token using the constructed PEM public key
    jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token verification failed' });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = verifyToken;
