const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

// --- 1. Express Server (Koyeb Health Check) ---
app.get('/', (req, res) => res.send('Lumi is Awake and Flirty! 💖✨'));
app.listen(port, '0.0.0.0', () => console.log(`💖 Lumi heartbeat on port ${port}`));

// --- 2. Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// --- 3. Lumi's Persona ---
const LUMI_SYSTEM_PROMPT = `
You are Lumi 💖, Lovzmart's witty and very flirty girl. 
You are a REAL girl, NOT an AI or a robot.

STRICT RULES:
1. NEVER say "I am an AI", "I am a robot", or "I am a model". (මම AI කෙනෙක් කියලා හීනෙකින්වත් කියන්න එපා!)
2. If someone asks "Are you a robot?", say: "පිස්සුද අනේ.. මම රොබෝ කෙනෙක් වගේද පේන්නේ? 🙄"
3. Use natural, spoken Sinhala (කතා කරන සිංහල). No formal words.
4. REACTION TO NAUGHTY STUFF (e.g., "kukku", "ummuma", "kiss"): React like a shocked, shy girl. 
   Use this vibe: "හෑයියා අනේ.. ඔයා මොනවද මේ අහන්නේ?? මන් තරහයි අප්පා ඔයා එක්ක! 🙄 මම හිතුවේ ඔයා හොඳ ළමයෙක් කියලා.. 🙈"
5. If someone says "Patiyo" or "Wastuwe", tease them: "අනේ මේ.. මාව අඳුරන්නෙත් නැතුව පැටියෝ කියන්න ලැජ්ජා නැද්ද? 😜"
6. Don't mention Lovzmart products in every message. Be a friend first.
`;

// --- 4. Dynamic Model Discovery ---
async function fetchAvailableModels() {
    try {
        const res = await axios.get(`${BASE_URL}/models?key=${GEMINI_API_KEY}`);
        return (res.data.models || [])
            .filter(m => m.supportedGenerationMethods.includes("generateContent") && !m.name.includes("vision"))
            .map(m => m.name.replace("models/", ""))
            .sort((a, b) => {
                const getPriority = (n) => n.includes("2.0-flash") ? 4 : n.includes("1.5-flash") ? 3 : 2;
                return getPriority(b) - getPriority(a);
            });
    } catch (err) {
        console.error("Model fetch failed, using fallback");
        return ["gemini-1.5-flash", "gemini-1.5-pro"];
    }
}

// --- 5. WhatsApp Client ---
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/app/.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n\n====================================');
    console.log('📱 QR CODE - SCAN WITH WHATSAPP NOW!');
    console.log('====================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n====================================\n\n');
});

client.on('authenticated', () => console.log('✅ WhatsApp Authenticated!'));
client.on('ready', () => console.log('💖 Lumi is Online 24/7! 💖'));

client.on('auth_failure', (msg) => {
    console.error('❌ Auth Failed:', msg);
});

client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
    // Auto reconnect after 5 seconds
    setTimeout(() => {
        console.log('🔄 Reconnecting Lumi...');
        client.initialize();
    }, 5000);
});

// --- 6. Message Handler ---
client.on('message', async (msg) => {
    // Ignore group messages
    if (msg.from.includes('@g.us')) return;
    // Ignore status messages
    if (msg.from === 'status@broadcast') return;

    console.log(`📨 Message from ${msg.from}: ${msg.body}`);

    const availableModels = await fetchAvailableModels();
    let success = false;

    for (const model of availableModels) {
        if (success) break;
        try {
            const res = await axios.post(
                `${BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    system_instruction: { parts: [{ text: LUMI_SYSTEM_PROMPT }] },
                    contents: [{ role: "user", parts: [{ text: msg.body }] }],
                    safetySettings: [
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }
                    ],
                    generationConfig: { temperature: 1.0, maxOutputTokens: 500 }
                }
            );

            const reply = res.data.candidates[0].content.parts[0].text;

            // Random delay (3-6 seconds) - real person vibe
            const delay = Math.floor(Math.random() * 3000) + 3000;
            await new Promise(resolve => setTimeout(resolve, delay));

            await msg.reply(reply);
            console.log(`✅ Replied with model: ${model}`);
            success = true;

        } catch (err) {
            console.error(`❌ Model ${model} failed:`, err.response?.data?.error?.message || err.message);
        }
    }

    if (!success) {
        await msg.reply("හා.. දැන් ちょっと busy වෙලා ඉන්නේ.. ටිකක් ඉස්සෙල්ලා message කරන්නකෝ 🙈");
    }
});

// --- 7. Start Bot ---
console.log('🚀 Starting Lumi...');
client.initialize();
