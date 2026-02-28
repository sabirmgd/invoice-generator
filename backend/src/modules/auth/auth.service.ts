import { Injectable, HttpStatus, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { User, AuthProvider } from '../../db/entities/user.entity';
import { AppException } from '../../common/exceptions/app.exception';
import { EncryptionService } from '../../common/services/encryption.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private firebaseApp: admin.app.App | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    if (!projectId) return; // Firebase disabled for local dev
    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: this.config
          .get<string>('FIREBASE_PRIVATE_KEY', '')
          .replace(/\\n/g, '\n'),
      }),
    });
  }

  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.firebaseApp) {
      throw new AppException('Firebase not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return this.firebaseApp.auth().verifyIdToken(idToken);
  }

  async findByFirebaseUid(uid: string): Promise<User | null> {
    return this.userRepo.findOneBy({ firebaseUid: uid });
  }

  async verifyAndUpsert(idToken: string): Promise<User> {
    const decoded = await this.verifyToken(idToken);
    const existing = await this.findByFirebaseUid(decoded.uid);
    if (existing) return existing;

    const isGoogle = decoded.firebase?.sign_in_provider === 'google.com';
    const user = this.userRepo.create({
      firebaseUid: decoded.uid,
      email: decoded.email ?? '',
      displayName: decoded.name ?? null,
      provider: isGoogle ? AuthProvider.GOOGLE : AuthProvider.PASSWORD,
    });
    return this.userRepo.save(user);
  }

  async saveLlmKey(
    firebaseUid: string,
    apiKey: string,
    provider: string,
  ): Promise<void> {
    const user = await this.findByFirebaseUid(firebaseUid);
    if (!user) throw new AppException('User not found', HttpStatus.NOT_FOUND);
    user.encryptedLlmKey = this.encryption.encrypt(apiKey, firebaseUid);
    user.llmProvider = provider;
    await this.userRepo.save(user);
  }

  async getDecryptedLlmKey(firebaseUid: string): Promise<{ apiKey: string; provider: string } | null> {
    const user = await this.findByFirebaseUid(firebaseUid);
    if (!user?.encryptedLlmKey || !user.llmProvider) return null;
    return {
      apiKey: this.encryption.decrypt(user.encryptedLlmKey, firebaseUid),
      provider: user.llmProvider,
    };
  }

  async deleteLlmKey(firebaseUid: string): Promise<void> {
    const user = await this.findByFirebaseUid(firebaseUid);
    if (!user) throw new AppException('User not found', HttpStatus.NOT_FOUND);
    user.encryptedLlmKey = undefined;
    user.llmProvider = undefined;
    await this.userRepo.save(user);
  }
}
