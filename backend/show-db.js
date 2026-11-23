require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showNotes() {
  const notes = await prisma.note.findMany();
  if (notes.length === 0) {
    console.log('No notes found. Create a note from the app first, then run this again.');
  } else {
    console.log('\n=== NOTES IN DATABASE (raw encrypted form) ===\n');
    notes.forEach(n => {
      console.log('Note ID       :', n.id);
      console.log('Title (plain) :', n.title);
      console.log('Content in DB :', n.content.substring(0, 80) + '...');
      console.log('IV            :', n.iv);
      console.log('AuthTag       :', n.authTag);
      console.log('---');
    });
    console.log('\nNotice: content is encrypted hex - NOT readable without the key!');
  }
  await prisma.$disconnect();
}

showNotes();
