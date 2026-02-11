// ============================================
// src/middleware/auth.middleware.js
// ============================================
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.substring(7);
  req.accessToken = token;
  req.userId = 'user_' + token.substring(0, 10); // Simplified user ID
  
  next();
};
