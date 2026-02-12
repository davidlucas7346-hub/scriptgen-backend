// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());           // Permite requisições do seu frontend
app.use(express.json());   // Para ler JSON do corpo da requisição

// Rota principal – gera o roteiro
app.post('/api/generate-script', async (req, res) => {
    const { apiKey, prompt } = req.body;

    // ⚠️ A chave agora é recebida do frontend? Não!
    // Na versão segura, o backend usa a chave do .env e ignora a chave enviada.
    // Para não quebrar seu frontend atual, vamos usar a chave do .env
    // e você pode remover o campo api-key do HTML depois.

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key não configurada no servidor' });
    }

    // Modelos a tentar (em ordem)
    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro'
    ];

    let lastError = null;

    for (const model of models) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || `Erro ${response.status}`);
            }

            const script = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (script) {
                return res.json({ script });
            }
        } catch (error) {
            lastError = error;
            console.log(`Modelo ${model} falhou:`, error.message);
        }
    }

    // Se nenhum modelo funcionou
    res.status(500).json({ 
        error: 'Não foi possível gerar o roteiro. ' + (lastError?.message || '') 
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});