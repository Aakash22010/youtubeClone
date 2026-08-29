// A failed database connect must not kill the process — that is what turned a dead
// Atlas cluster into a Render "no open ports detected" crash loop.
// Run: npm run build && node scripts/check-db.cjs
const assert = require('node:assert');
const net = require('node:net');
const connectDB = require('../dist/utils/db').default;

const listener = net.createServer().listen(0);

listener.on('listening', async () => {
  process.env.MONGO_URI = 'mongodb+srv://u:p@does-not-exist.invalid/?appName=db';
  await connectDB();
  assert.ok(listener.listening, 'listener died after a failed DB connect');
  console.log('ok: failed DB connect left the process alive and still listening');
  listener.close();
  process.exit(0);
});
