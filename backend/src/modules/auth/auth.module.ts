import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../db/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import { EncryptionService } from '../../common/services/encryption.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [AuthService, OptionalAuthGuard, EncryptionService],
  exports: [AuthService, OptionalAuthGuard, EncryptionService],
})
export class AuthModule {}
