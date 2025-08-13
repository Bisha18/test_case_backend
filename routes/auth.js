import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// 1. Redirect user to GitHub for authorization
router.get('/github', (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo`;
  res.redirect(url);
});

// 2. GitHub redirects back here with a code
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // 3. Exchange the code for an access token
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' }
    });

    const accessToken = response.data.access_token;
    
    // 4. Redirect user back to the frontend with the token
    // THIS IS THE CORRECT LINE
   res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`);

  } catch (error) {
    console.error('Error getting GitHub access token', error);
    res.status(500).send('Authentication Failed');
  }
});

export default router;