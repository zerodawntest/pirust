import fs from 'fs'; import crypto from 'crypto';
const [appId, keyPath] = process.argv.slice(2);
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now()/1000);
const data = b64({alg:'RS256',typ:'JWT'})+'.'+b64({iat:now-60,exp:now+540,iss:appId});
const sig = crypto.sign('RSA-SHA256', Buffer.from(data), fs.readFileSync(keyPath)).toString('base64url');
process.stdout.write(data+'.'+sig);
