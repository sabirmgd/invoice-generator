import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { SaveLlmKeyDto } from './dto/save-llm-key.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify Firebase ID token and create/return user' })
  async verify(@Body() dto: VerifyTokenDto) {
    return this.authService.verifyAndUpsert(dto.idToken);
  }

  @Patch('llm-key')
  @ApiOperation({ summary: 'Save encrypted LLM API key' })
  async saveLlmKey(
    @Headers('authorization') authHeader: string,
    @Body() dto: SaveLlmKeyDto,
  ) {
    const uid = await this.extractUid(authHeader);
    await this.authService.saveLlmKey(uid, dto.apiKey, dto.provider);
    return { saved: true };
  }

  @Delete('llm-key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete saved LLM API key' })
  async deleteLlmKey(@Headers('authorization') authHeader: string) {
    const uid = await this.extractUid(authHeader);
    await this.authService.deleteLlmKey(uid);
  }

  private async extractUid(authHeader: string): Promise<string> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }
    const decoded = await this.authService.verifyToken(authHeader.slice(7));
    return decoded.uid;
  }
}
