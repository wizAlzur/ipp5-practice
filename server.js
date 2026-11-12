const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { connectDatabase } = require('./server/database');
const { createApp } = require('./server/app');

async function main() {
  if (!fs.existsSync(path.join(__dirname, 'dist/contacts/browser/index.html'))) {
    throw new Error('Сначала соберите Angular командой npm run build.');
  }
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || (process.env.DYNO ? '0.0.0.0' : '127.0.0.1');
  const database = await connectDatabase();
  const app = createApp(database.db);
  const server = app.listen(port, host);
  try { await once(server, 'listening'); }
  catch (error) { await database.close(); throw error; }
  console.log(`MongoDB подключена (${database.mode === 'local' ? 'локальная, данные в data/mongodb' : 'внешняя'}).`);
  console.log(`Телефонный справочник: http://${host}:${port}`);
  console.log(`API: http://${host}:${port}/v1/contact`);
  let closing = false;
  async function stop() {
    if (closing) return;
    closing = true;
    server.closeIdleConnections();
    await new Promise(resolve => server.close(resolve));
    await database.close();
  }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

main().catch(error => {
  console.error(error.code === 'EADDRINUSE' ? 'Порт занят. Остановите предыдущий сервер или задайте PORT=8081 npm start.' : error.message);
  process.exitCode = 1;
});
