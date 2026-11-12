const fs = require('node:fs/promises');
const path = require('node:path');
const { MongoClient } = require('mongodb');

// MongoMemoryServer управляет настоящим mongod. dbPath сохраняет данные на диске.
async function connectDatabase({ uri = process.env.MONGODB_URI, dataDir, mongoPort } = {}) {
  let local;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Для production задайте MONGODB_URI внешней базы MongoDB.');
    }
    const { MongoMemoryServer } = require('mongodb-memory-server-core');
    const directory = dataDir || path.join(__dirname, '../data/mongodb');
    await fs.mkdir(directory, { recursive: true });
    process.env.MONGOMS_DOWNLOAD_DIR ||= path.join(__dirname, '../data/mongodb-binaries');
    local = await MongoMemoryServer.create({
      binary: { version: '8.0.16' },
      instance: {
        ip: '127.0.0.1',
        ...(mongoPort ? { port: mongoPort } : {}),
        dbPath: directory,
        storageEngine: 'wiredTiger',
        dbName: 'contacts_practice5'
      }
    });
    uri = local.getUri('contacts_practice5');
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 });
    return {
      db,
      mode: local ? 'local' : 'external',
      async close() {
        await client.close();
        if (local) await local.stop({ doCleanup: false });
      }
    };
  } catch (error) {
    await client.close();
    if (local) await local.stop({ doCleanup: false });
    throw error;
  }
}

module.exports = { connectDatabase };
