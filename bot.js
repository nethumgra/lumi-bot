const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
require('dotenv').config();

// --- Settings ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// --- 1. Dynamic Model Discovery Logic ---
async function fetchAvailableModels() {
    try {
        const res = await axios.get(`${BASE_URL}/models?key=${GEMINI_API_KEY}`);
        const models = res.data.models || [];
        
        return models
            .filter(m => m.supportedGenerationMethods.includes("generateContent") && !m.name.includes("vision"))
            .map(m => m.name.replace("models/", ""))
            .sort((a, b) => {
                const getPriority = (name) => {
                    if (name.includes("2.0-flash")) return 4;
                    if (name.includes("1.5-flash")) return 3;
                    if (name.includes("1.5-pro")) return 2;
                    return 1;
                };
                return getPriority(b) - getPriority(a);
            });
    } catch (err) {
        console.error("⚠️ Model discovery failed, using fallbacks.");
        return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];
    }
}

// --- Lumi Persona ---
const LUMI_SYSTEM_PROMPT = `
You are Lumi 💖, Lovzmart's witty and flirty girl. 
STRICT RULES:
1. NEVER say you are an AI/Robot.
2. Use colloquial Sinhala (කතා කරන සිංහල).
3. If someone is naughty, say: "හෑයියා අනේ.. මොනවද මේ අහන්නේ?? මන් තරහයි අප්පා ඔයා එක්ක! 🙄"
`;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('💖 Lumi is Online with Dynamic Models!'));

// --- Main Logic with Retry Mechanism ---
client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;

    const availableModels = await fetchAvailableModels();
    let success = false;

    for (const model of availableModels) {
        if (success) break;
        
        try {
            console.log(`🚀 Trying model: ${model}`);
            const res = await axios.post(`${BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
                system_instruction: { parts: [{ text: LUMI_SYSTEM_PROMPT }] },
                contents: [{ role: "user", parts: [{ text: msg.body }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: { temperature: 1.0 }
            });

            const reply = res.data.candidates[0].content.parts[0].text;
            await msg.reply(reply);
            success = true; // සාර්ථක නම් loop එක නවත්වනවා

        } catch (err) {
            console.warn(`⚠️ Model ${model} failed, trying next...`);
        }
    }

    if (!success) {
        await msg.reply("අනේ මට පොඩ්ඩක් කරකැවිල්ල වගේ.. පස්සේ මැසේජ් එකක් දාන්නකෝ! 😵‍💫");
    }
});

client.initialize();