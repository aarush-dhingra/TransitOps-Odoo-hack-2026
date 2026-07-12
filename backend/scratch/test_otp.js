'use strict';

const crypto = require('crypto');
const prisma = require('../src/utils/prisma');

async function main() {
  const email = 'fleet@transitops.dev';
  const otp = '482916';
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.passwordResetOtp.updateMany({ where: { email, used: false }, data: { used: true } });
  await prisma.passwordResetOtp.create({ data: { email, otpHash, expiresAt } });
  console.log(`OTP ${otp} seeded for ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
