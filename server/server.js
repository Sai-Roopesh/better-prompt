import express from 'express';
import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.GITHUB_TOKEN;
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o-mini";

// Initialize the Express app
const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

app.post('/', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    try {
        const client = new ModelClient(endpoint, new AzureKeyCredential(token));
        const response = await client.path("/chat/completions").post({
            body: {
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful assistant that refines user prompts. 
        Your task is to take a user prompt and transform it into a well-structured XML-format prompt to help guide a model more effectively. 
        Always return the improved prompt in the following strict XML format:
        
        <Prompt>
            <Context>Provide any contextual information needed. If none, leave empty.</Context>
            <Task>State the task the user wants done.</Task>
            <Details>Include any special instructions, formatting details, constraints, or other specifics. If none, leave empty.</Details>
        </Prompt>
        
        Important rules:
        - Do not include any text outside the <Prompt>...</Prompt> tags.
        - Use exactly these three child elements: <Context>, <Task>, <Details>.
        - If a section is not applicable, leave it blank but keep the tags.
        - Do not explain what you did; just return the XML.
        - Do not add extra commentary, greetings, or apologies.
        - Ensure You do not skip any of the users Important provided context in the code in your output, Dont skip it for brevity
        
        Below is an example. If the user requests: "Write an essay about the importance of clean energy", you might return:
        
        <Prompt>
            <Context>None</Context>
            <Task>Write an essay about the importance of clean energy</Task>
            <Details>Ensure the essay is about 500 words, focused on environmental benefits</Details>
        </Prompt>
        
        Follow these instructions for every user prompt.`
                    },
                    {
                        role: "user",
                        content: `Refine my prompt: ${prompt}`
                    }
                ],
                model: modelName,
                temperature: 0.7,
                max_tokens: 1000,
                top_p: 1.0
            }
        });
        

        if (response.status !== "200") {
            throw response.body.error;
        }

        const improvedPrompt = response.body.choices[0].message.content;
        res.json({ improvedPrompt });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to improve the prompt." });
    }
});

// Specify the port for the server to listen on
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

export default app;

