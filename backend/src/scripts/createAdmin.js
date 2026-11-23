
require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../database/prismaClient');
const readline = require('readline');

const ADMIN_EMAIL = 'admin1312@gmail.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter a strong password for the admin account: ', async (password) => {
  try {
    if (!password || password.length < 12) {
      throw new Error('Password must contain at least 12 characters.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });

    if (existingAdmin) {
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { role: 'ADMIN', passwordHash }
      });
      console.log('Existing account updated to ADMIN.');
    } else {
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          passwordHash,
          role: 'ADMIN'
        }
      });
      console.log('Administrator account created successfully.');
    }
  } catch (error) {
    console.error('Admin setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
});
