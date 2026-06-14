'use strict';
const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = 3001;
const client = new Anthropic.Anthropic();

const PROMPTS = {
  pickup:    '玩家拿起了一件物品，放入暂存托盘',
  match:     '玩家凑齐了3个相同物品，成功消除！',
  shake:     '玩家颠锅了，物品被翻了个底朝天',
  near_lose: '玩家的暂存托盘快满了，危险！',
  win:       '玩家清空了所有物品，找到了藏在底下的大鹅！',
  lose:      '玩家暂存托盘满了，游戏失败了！',
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/goose') {
    res.writeHead(404); res.end('Not found'); return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { event } = JSON.parse(body);
      const context = PROMPTS[event] || '游戏中发生了某事';

      const msg = await client.messages.create({
        model: 'claude-fable-5',
        max_tokens: 80,
        messages: [{
          role: 'user',
          content: `你是"抓大鹅"手游里一只傲娇搞怪的大鹅角色。${context}。用10-15个字说一句大鹅台词，可以带"呱"或"嘎"，直接输出台词，不要引号和解释。`
        }]
      });

      let text = '呱！';
      if (msg.stop_reason !== 'refusal' && msg.content.length > 0) {
        text = msg.content[0].text.trim();
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ text }));
    } catch (err) {
      console.error('[goose]', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log('\n🪿 抓大鹅 × Fable 5 服务器已启动');
  console.log(`   端口: ${PORT}  |  模型: claude-fable-5`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\n   ⚠️  未检测到 ANTHROPIC_API_KEY');
    console.log('   启动方式: ANTHROPIC_API_KEY=sk-ant-... node server.js');
  }
  console.log('\n   打开 index.html 开始游戏！\n');
});
