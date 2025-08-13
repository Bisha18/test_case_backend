import express from 'express';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Helper function to fetch file content (this stays the same)
async function getFileContents(octokit, owner, repo, files) {
    const contentPromises = files.map(async (file) => {
        const { data } = await octokit.git.getBlob({ owner, repo, file_sha: file.sha });
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return { path: file.path, content };
    });
    return Promise.all(contentPromises);
}

// Generate Test Case Summaries
router.post('/generate-summaries', checkAuth, async (req, res) => {
    const { owner, repo, files } = req.body;
    const octokit = new Octokit({ auth: req.token });

    try {
        const filesWithContent = await getFileContents(octokit, owner, repo, files);
        
        const prompt = `
            You are an expert Test Case Generator for React applications.
            I have the following files from a project:
            ${filesWithContent.map(f => `\n--- File: ${f.path} ---\n${f.content}`).join('\n')}
            
            Based on these files, suggest a list of test cases using Jest and React Testing Library.
            For each test case, provide a short, clear summary of what it tests.
            Return the output as a JSON array of strings. For example: ["Renders the component without crashing", "Handles button click and updates state", "Displays an error message on failed API call"].
            Do NOT write any code, only the summary list. Ensure the output is valid JSON.
        `;
        
        // Use the correct, modern Gemini model name
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // <-- FINAL FIX
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        try {
            // Clean the response to ensure it's valid JSON before parsing
            const cleanedText = text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
            const summaries = JSON.parse(cleanedText);
            res.json({ summaries });
        } catch (parseError) {
             console.error("Failed to parse AI response as JSON:", text);
             res.status(500).json({ message: "AI returned an invalid format." });
        }

    } catch (error) {
        console.error("Error generating summaries:", error);
        res.status(500).json({ message: "Failed to generate summaries." });
    }
});

// Generate Test Code from a Summary
router.post('/generate-code', checkAuth, async (req, res) => {
    const { owner, repo, files, summary } = req.body;
    const octokit = new Octokit({ auth: req.token });

    try {
        const filesWithContent = await getFileContents(octokit, owner, repo, files);

        const prompt = `
            You are an expert test code writer using Jest and React Testing Library.
            Here are the relevant source code files:
            ${filesWithContent.map(f => `\n--- File: ${f.path} ---\n${f.content}`).join('\n')}

            Your task is to write a complete Jest test file that implements the following test case:
            "${summary}"

            The test file should:
            1. Include all necessary imports from '@testing-library/react', 'react', and the component itself.
            2. Assume the test file will be created at a path like 'src/components/__tests__/MyComponent.test.js'. Adjust the import paths for the components accordingly.
            3. Be fully functional and ready to run.
            4. Only return the code as a single block. Do not add any explanations or markdown backticks like \`\`\`javascript.
        `;

        // Use the correct, modern Gemini model name here as well
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // <-- FINAL FIX
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Clean the response to remove markdown backticks if the AI includes them
        const code = response.text().trim().replace(/^```(javascript|js)?\n/, '').replace(/\n```$/, '');
        
        res.json({ code });

    } catch (error) {
        console.error("Error generating test code:", error);
        res.status(500).json({ message: "Failed to generate test code." });
    }
});

export default router;