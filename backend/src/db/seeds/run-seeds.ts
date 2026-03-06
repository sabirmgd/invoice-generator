import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { SnakeCaseNamingStrategy } from '../naming.strategy';
import { Setting } from '../entities/setting.entity';
import { Profile, ProfileType } from '../entities/profile.entity';

config();

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '8001', 10),
    username: process.env.DB_USERNAME || 'invoice_user',
    password: process.env.DB_PASSWORD || 'invoice_secret_2024',
    database: process.env.DB_DATABASE || 'invoice_generator',
    namingStrategy: new SnakeCaseNamingStrategy(),
    entities: [Setting, Profile],
    synchronize: true,
  });

  await ds.initialize();
  console.log('Connected to database');

  // Settings
  const settingsRepo = ds.getRepository(Setting);
  const defaults = [
    {
      key: 'currency',
      value: 'SAR',
      description: 'Default currency code',
    },
    {
      key: 'tax_rate',
      value: '15',
      description: 'Default tax rate percentage',
    },
    {
      key: 'invoice_prefix',
      value: 'INV',
      description: 'Invoice number prefix',
    },
    {
      key: 'invoice_next_number',
      value: '1',
      description: 'Next auto-incrementing invoice number',
    },
  ];

  for (const setting of defaults) {
    const exists = await settingsRepo.findOneBy({ key: setting.key });
    if (!exists) {
      await settingsRepo.save(settingsRepo.create(setting));
      console.log(`  Created setting: ${setting.key} = ${setting.value}`);
    } else {
      console.log(`  Setting already exists: ${setting.key}`);
    }
  }

  // Profiles
  const profileRepo = ds.getRepository(Profile);
  const profiles = [
    {
      type: ProfileType.SENDER,
      name: 'Sabir Salah',
      isDefault: true,
      companyName: 'Sabir Salah',
      email: 'sabir@example.com',
      phone: '+966 50 000 0000',
      taxId: '300000000000003',
      addressLine1: 'King Fahd Road',
      city: 'Riyadh',
      state: 'Riyadh Province',
      postalCode: '12345',
      country: 'Saudi Arabia',
    },
    {
      type: ProfileType.CLIENT,
      name: 'Sample Client Co.',
      isDefault: true,
      companyName: 'Sample Client Co.',
      email: 'billing@sampleclient.com',
      phone: '+966 55 000 0000',
      taxId: '300000000000004',
      addressLine1: 'Olaya Street',
      city: 'Riyadh',
      state: 'Riyadh Province',
      postalCode: '11543',
      country: 'Saudi Arabia',
    },
    {
      type: ProfileType.BANK,
      name: 'Primary Bank Account',
      isDefault: true,
      bankName: 'Al Rajhi Bank',
      accountHolder: 'Sabir Salah',
      iban: 'SA0380000000608010167519',
      swiftCode: 'RJHISARI',
    },
  ];

  for (const profile of profiles) {
    const exists = await profileRepo.findOneBy({
      name: profile.name,
      type: profile.type,
    });
    if (!exists) {
      await profileRepo.save(profileRepo.create(profile));
      console.log(`  Created profile: [${profile.type}] ${profile.name}`);
    } else {
      console.log(
        `  Profile already exists: [${profile.type}] ${profile.name}`,
      );
    }
  }

  console.log('\nSeeding complete!');
  await ds.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
