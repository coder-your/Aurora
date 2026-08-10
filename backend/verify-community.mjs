import jwt from 'jsonwebtoken';
import prisma from './utils/prisma.js';
import axios from 'axios';

const user = await prisma.users.findFirst({ where: {}, select: { user_id: true } });
if (!user) {
  throw new Error('No user found');
}
const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
console.log('user_id', user.user_id);
const response = await axios.get('http://localhost:4000/api/community/threads', {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('status', response.status);
console.log(JSON.stringify(response.data, null, 2));
await prisma.$disconnect();
