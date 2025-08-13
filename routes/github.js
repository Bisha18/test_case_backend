import express from 'express';
import { Octokit } from '@octokit/rest';
import { checkAuth } from '../middleware/authMiddleware.js'; // <-- CORRECTED IMPORT

const router = express.Router();

// Get authenticated user's repos
router.get('/repos', checkAuth, async (req, res) => {
  const octokit = new Octokit({ auth: req.token });
  try {
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100, // Fetch more repos per page
      sort: 'updated'  // Sort by most recently updated
    });
    res.json(repos.map(repo => ({ id: repo.id, name: repo.name, owner: repo.owner.login })));
  } catch (error) {
    console.error('Error fetching repos:', error.message);
    res.status(500).json({ message: 'Error fetching repos' });
  }
});

// Get files for a specific repo
router.get('/:owner/:repo/files', checkAuth, async (req, res) => {
    const { owner, repo } = req.params;
    const octokit = new Octokit({ auth: req.token });
    try {
        const { data } = await octokit.git.getTree({
            owner,
            repo,
            tree_sha: 'HEAD', // or a specific branch
            recursive: 'true'
        });
        // Filter for relevant code files (e.g., .js, .jsx, .ts, .tsx) and ignore test files
        const codeFiles = data.tree.filter(file => 
            file.type === 'blob' && 
            /\.(js|jsx|ts|tsx)$/i.test(file.path) &&
            !/\.test\.(js|jsx|ts|tsx)$/i.test(file.path) && // Exclude test files
            !/node_modules/i.test(file.path) // Exclude node_modules
        );
        res.json(codeFiles);
    } catch (error) {
        console.error('Error fetching files:', error.message);
        res.status(500).json({ message: 'Error fetching files' });
    }
});

export default router;