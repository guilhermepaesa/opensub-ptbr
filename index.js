const express = require("express");
const app = express();
const cors = require('cors');
const multiSubtitles = require('./opensubtitles.js');
const sub2vtt = require('sub2vtt');
const manifest = require("./manifest.json");

app.use(cors());

// 所有响应添加缓存控制
app.use((_, res, next) => {
    res.setHeader('Cache-Control', 'max-age=86400, public');
    next();
});

// Landing page
app.get('/', (_, res) => {
    const landingHTML = `
        <html>
        <head>
            <title>${manifest.name}</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1 { color: #333; }
                .logo { max-width: 300px; margin: 20px 0; }
                .install { display: inline-block; padding: 10px 20px; background: #1a5;
                          color: white; text-decoration: none; border-radius: 3px; }
            </style>
        </head>
        <body>
            <img src="${manifest.logo}" class="logo" />
            <h1>${manifest.name} v${manifest.version}</h1>
            <h2>${manifest.description}</h2>
            <p>To install this addon in Stremio, click the button below:</p>
            <a class="install" href="stremio://stremio-streams.aimixtech.com:8443/manifest.json">Install Addon</a>
        </body>
        </html>
    `;
    res.setHeader('content-type', 'text/html');
    res.send(landingHTML);
});

// Manifest endpoint
app.get('/manifest.json', (_, res) => {
	res.setHeader('Cache-Control', 'max-age=86400, public');
    res.setHeader('Content-Type', 'application/json');
    res.send(manifest);
});

// 字幕列表路由 - 标准格式
app.get('/:resource/:type/:id/:extra.json', async (req, res) => {
    console.log("Subtitle request:", req.params);
    const { type, id } = req.params;
	// 支持的语言列表
	const supportedLangs = ["chinese (traditional)", "chinese (simplified)", "chinese bilingual", "english"];
    
    try {
        const subtitles = await multiSubtitles(type, id, supportedLangs);
        res.json({ subtitles: subtitles || [] });
    } catch (error) {
        console.error("Error getting subtitles:", error);
        res.json({ subtitles: [] });
    }
});

// 字幕内容路由
app.get('/sub.vtt', async (req, res) => {
    console.log('=== /sub.vtt 路由开始 ===');
    console.log('Query 参数:', req.query);
    console.log('Headers:', req.headers);
    
    try {

        res.setHeader('Cache-Control', 'max-age=86400,staleRevalidate=stale-while-revalidate, staleError=stale-if-error, public');
		let url,proxy;
		if (req?.query?.proxy) proxy = JSON.parse(Buffer.from(req.query.proxy, 'base64').toString());
		if (req?.query?.from) url = req.query.from
		else throw 'error: no url';
		console.log("url", url,"proxy",proxy)
		generated = sub2vtt.gerenateUrl(url,{referer:"someurl"});
		console.log(generated);
		let sub = new sub2vtt(url ,proxy);
		//console.log(await sub.CheckUrl()) 
        let file = await sub.getSubtitle();
        console.log('字幕内容获取状态:', file ? '成功' : '失败');
        
        if (!file?.subtitle) {
            console.error('字幕内容获取失败');
            throw new Error('Failed to get subtitle content');
        }
        
        console.log('字幕内容获取成功，准备发送响应');
        res.setHeader('Content-Type', 'text/vtt;charset=UTF-8');
        res.send(file.subtitle);
        console.log('=== /sub.vtt 路由结束 ===');
        
    } catch (err) {
        console.error('字幕获取错误:', err.message);
        console.error('错误堆栈:', err.stack);
        res.status(404).send('Subtitle not found');
    }
});

module.exports = app;
