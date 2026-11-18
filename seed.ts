import 'dotenv/config';
import { connectDB } from './src/lib/mongodb';
import { User } from './src/lib/models/user';
import { hashPassword } from './src/lib/auth';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable de entorno requerida para el seed: ${name}`);
  }
  return value;
}

function validatePassword(name: string, value: string) {
  if (value.length < 8) {
    throw new Error(`${name} debe tener al menos 8 caracteres`);
  }
}

async function seed() {
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL').toLowerCase();
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');
  const adminName = process.env.SEED_ADMIN_NAME || 'Administrador';
  const driverEmail = requireEnv('SEED_DRIVER_EMAIL').toLowerCase();
  const driverPassword = requireEnv('SEED_DRIVER_PASSWORD');
  const driverName = process.env.SEED_DRIVER_NAME || 'Conductor';

  validatePassword('SEED_ADMIN_PASSWORD', adminPassword);
  validatePassword('SEED_DRIVER_PASSWORD', driverPassword);

  await connectDB();
  console.log('Connected to MongoDB');

  const adminExists = await User.findOne({ email: adminEmail });
  if (!adminExists) {
    await User.create({
      email: adminEmail,
      password: await hashPassword(adminPassword),
      name: adminName,
      role: 'ADMIN',
      isActive: true,
    });
    console.log(`Admin creado: ${adminEmail}`);
  } else {
    console.log('El admin ya existe');
  }

  const driverExists = await User.findOne({ email: driverEmail });
  if (!driverExists) {
    await User.create({
      email: driverEmail,
      password: await hashPassword(driverPassword),
      name: driverName,
      role: 'CONDUCTOR',
      isActive: true,
    });
    console.log(`Conductor creado: ${driverEmail}`);
  } else {
    console.log('El conductor ya existe');
  }

  console.log('Seed completo');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
