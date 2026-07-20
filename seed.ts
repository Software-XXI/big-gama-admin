import 'dotenv/config';
import { connectDB } from './src/lib/mongodb';
import { User } from './src/lib/models/user';
import { hashPassword } from './src/lib/auth';

async function seed() {
  await connectDB();
  console.log('📦 Connected to MongoDB');

  const adminExists = await User.findOne({ email: 'admin@biggama.com' });
  if (!adminExists) {
    const hashed = await hashPassword('Admin123456');
    await User.create({
      email: 'admin@biggama.com',
      password: hashed,
      name: 'Administrador',
      role: 'ADMIN',
      isActive: true,
    });
    console.log('✅ Admin created: admin@biggama.com / Admin123456');
  } else {
    console.log('ℹ️ Admin already exists');
  }

  const driverExists = await User.findOne({ email: 'conductor@biggamma.com' });
  if (!driverExists) {
    const hashed = await hashPassword('Conductor123');
    await User.create({
      email: 'conductor@biggamma.com',
      password: hashed,
      name: 'Juan Pérez',
      role: 'CONDUCTOR',
      isActive: true,
    });
    console.log('✅ Driver created: conductor@biggamma.com / Conductor123');
  } else {
    console.log('ℹ️ Driver already exists');
  }

  console.log('🎉 Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
