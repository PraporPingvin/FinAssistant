const crypto = require('crypto');

const secret = crypto.randomBytes(64).toString('hex');
console.log('\n' + '='.repeat(60));
console.log('🔑 Сгенерируйте JWT_SECRET:');
console.log('='.repeat(60));
console.log('\n' + secret + '\n');
console.log('Добавьте эту строку в ваш .env файл:\n');
console.log(`JWT_SECRET=${secret}\n`);
console.log('='.repeat(60) + '\n');