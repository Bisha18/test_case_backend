// This is the centralized authentication middleware.
export const checkAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('token ')) {
    return res.status(401).json({ message: 'Unauthorized: No valid token provided' });
  }
  req.token = authHeader.split(' ')[1];
  next();
};