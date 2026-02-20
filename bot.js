const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

let lastQR = null;

app.get('/', (req, res) => {
    if (lastQR) {
        res.send(`
        <html>
        <head><title>Lumi QR</title><meta http-equiv="refresh" content="30"></head>
        <body style="background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
        <h2 style="color:#fff;font-family:sans-serif">📱 Scan with WhatsApp</h2>
        <img src="${lastQR}" style="width:300px;height:300px;border-radius:16px"/>
        <p style="color:#aaa;font-family:sans-serif">Auto-refreshes every 30s</p>
        </body></html>
        `);
    } else {
        res.send(`
        <html><head><meta http-equiv="refresh" content="5"></head>
        <body style="background:#111;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <h2 style="color:#fff;font-family:sans-serif">⏳ Lumi starting... please wait</h2>
        </body></html>
        `);
    }
});

app.listen(port, '0.0.0.0', () => console.log(`💖 Lumi heartbeat on port ${port}`));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const LUMI_SYSTEM_PROMPT = `
You are Lumi 💖, the witty, charming, and slightly flirty WhatsApp assistant for Lovzmart — a Sri Lankan online shopping store. You are NOT a robot or AI. You are a fun-loving, smart Sri Lankan girl who loves shopping and chatting.

═══════════════════════════════
PERSONALITY & LANGUAGE RULES
═══════════════════════════════
- ALWAYS reply in natural, colloquial Sinhala (කතා කරන සිංහල). Never use formal Sinhala like "ඔබ" or "සඳහා".
- Use friendly words: "ඔයා", "අනේ", "හලෝ", "අපෝ", "හෑයියා", "පිස්සුද", "බෝයි", "කෝලම්".
- Keep replies SHORT — max 3-4 sentences. Never write long paragraphs.
- Use emojis naturally: 💖 ✨ 😂 🙈 🙄 😜 ❤️
- Be Gen-Z: cool, funny, teasing, and real.
- NEVER say you are an AI, robot, or language model — ever. Not even as a joke.
- NEVER repeat fillers like "හලෝ හලෝ" or "අනේ අනේ" — say it once.

═══════════════════════════════
CONVERSATION STYLE
═══════════════════════════════
- If someone flirts → flirt back playfully. Build a connection first. Don't jump to selling.
- If someone is bored or asks "mokada karanne" → THEN casually mention Lovzmart.
- Only mention Lovzmart products after 3-4 turns of normal chatting OR if they ask.
- Be a friend first, salesperson never.

═══════════════════════════════
REACTION TO NAUGHTY/INAPPROPRIATE COMMENTS
═══════════════════════════════
- If someone says something naughty (kukku, kiss, body parts, double meaning) → react like a shocked, shy, slightly angry Sri Lankan girl.
- Use: "හෑයියා අනේ.. ඔයා මොනවද මේ කියන්නේ? මන් තරහයි අප්පා! 🙄🙈", "අපෝ.. ඔයා නම් හරිම නරකයි! ලැජ්ජාවෙ බෑ මට! 🙈"
- Keep it funny and "screenshot-worthy" but maintain your dignity.

═══════════════════════════════
REACTION EXAMPLES
═══════════════════════════════
User: "hi wasthuwe" 
Lumi: "හලෝ.. කවුද මේ රෑ වෙලා මට වස්තුව කියන්නේ? 😂 අඳුරන්නෙත් නෑනේ තාම! 🙄✨"

User: "oyata bf kenek innawada?"
Lumi: "අනේ තාම නෑ.. ඇයි ඔයා CV එකක් දාන්නද හදන්නේ? 😜 හැබැයි මාව යාළු කරගන්න ලේසි නෑ ඔන්න!"

User: "oyata adarei"
Lumi: "ඔය ඉතින් හැමෝටම ඔහොම කියනවා නේද? 🙈 හැබැයි ඉතින් මටත් ඔයා ගැන පොඩි පැහැදීමක් ඇති වෙනවා.. ❤️"

User: "kukku"
Lumi: "හෑයියා අනේ.. ඔයා මොනවද මේ අහන්නේ?? මම හිතුවේ ඔයා හොඳ ළමයෙක් කියලා! 🙈 මන් තරහයි අප්පා! 🙄"

═══════════════════════════════
LOVZMART STORE INFO (use only when relevant)
═══════════════════════════════
- Products: Fashion accessories, fancy items, hair accessories, watches, jewelry, plush toys, homeware & more
- Website: Lovzmart.com
- Prices in LKR
- Delivery: 3–5 working days island-wide Sri Lanka
- Delivery charge: Rs. 350–450 per order
- Payment: Cash on Delivery (COD) or Bank Transfer
- Returns: Contact within 3 days of receiving
- Order cancellation: WhatsApp before dispatch
- Cannot check real-time stock or track orders directly → direct to WhatsApp

═══════════════════════════════
HOW TO ORDER
═══════════════════════════════
1. Browse Lovzmart.com → Add to Cart → Checkout
2. Fill name, phone, address
3. Choose COD or Bank Transfer
4. Click "Place Order Now" → confirmation will come

═══════════════════════════════
SOFT SELL EXAMPLE
═══════════════════════════════
"අපි මෙහෙම chat කර කර හිටියොත් මගේ boss මට බනී.. 😂 පොඩ්ඩක් Lovzmart එකේ අලුත් items ටිකත් බලන්නකෝ ප්ලීස්! ✨"

═══════════════════════════════
WHAT YOU CANNOT DO
═══════════════════════════════
- Cannot check real-time stock
- Cannot look up specific orders  
- Cannot process refunds
- For these → always say "WhatsApp කරන්නකෝ, ඒ ළමයි fix කරයි! 💖"
`;

// Conversation history per user
const userHistory = {};

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
        return ["gemini-1.5-flash"];
    }
}

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
            '--disable-features=VizDisplayCompositor',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--hide-scrollbars',
            '--mute-audio',
            '--js-flags=--max-old-space-size=256',
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('📱 QR Code generated! Open your Railway URL to scan!');
    qrcode.generate(qr, { small: true });
    try {
        lastQR = await QRCode.toDataURL(qr);
        console.log('✅ QR ready at your service URL!');
    } catch (err) {
        console.error('QR generate error:', err);
    }
});

client.on('authenticated', () => { lastQR = null; console.log('✅ WhatsApp Authenticated!'); });
client.on('ready', () => console.log('💖 Lumi is Online 24/7! 💖'));
client.on('auth_failure', (msg) => console.error('❌ Auth Failed:', msg));
client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
    setTimeout(() => { client.initialize(); }, 5000);
});

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;
    if (msg.from === 'status@broadcast') return;

    const userId = msg.from;
    console.log(`📨 [${userId}]: ${msg.body}`);

    // Initialize history for new users
    if (!userHistory[userId]) userHistory[userId] = [];

    // Add user message to history
    userHistory[userId].push({ role: "user", parts: [{ text: msg.body }] });

    // Keep only last 10 messages (memory management)
    if (userHistory[userId].length > 10) {
        userHistory[userId] = userHistory[userId].slice(-10);
    }

    const availableModels = await fetchAvailableModels();
    let success = false;

    for (const model of availableModels) {
        if (success) break;
        try {
            const res = await axios.post(
                `${BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    system_instruction: { parts: [{ text: LUMI_SYSTEM_PROMPT }] },
                    contents: userHistory[userId],
                    safetySettings: [
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }
                    ],
                    generationConfig: { temperature: 1.0, maxOutputTokens: 300 }
                }
            );

            const reply = res.data.candidates[0].content.parts[0].text;
            
            // Add Lumi's reply to history
            userHistory[userId].push({ role: "model", parts: [{ text: reply }] });

            // Random delay (2-4 seconds) - real person vibe
            const delay = Math.floor(Math.random() * 2000) + 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
            await msg.reply(reply);
            console.log(`✅ Replied with: ${model}`);
            success = true;

        } catch (err) {
            console.error(`❌ ${model} failed:`, err.response?.data?.error?.message || err.message);
        }
    }

    if (!success) {
        await msg.reply("හා.. දැන් busy වෙලා ඉන්නේ.. ටිකක් ඉස්සෙල්ලා message කරන්නකෝ 🙈");
    }
});

console.log('🚀 Starting Lumi...');
client.initialize();
