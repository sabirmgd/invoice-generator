import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';

interface AssessmentResponse {
  tokenProperties?: {
    valid: boolean;
    action?: string;
  };
  riskAnalysis?: {
    score?: number;
  };
  error?: { message: string };
}

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly siteKey: string;
  private readonly projectId: string;
  private readonly scoreThreshold: number;
  private readonly auth: GoogleAuth;

  constructor(private readonly configService: ConfigService) {
    this.siteKey = this.configService.get<string>('app.recaptcha.siteKey', '');
    this.projectId = this.configService.get<string>(
      'app.recaptcha.projectId',
      '',
    );
    this.scoreThreshold = this.configService.get<number>(
      'app.recaptcha.scoreThreshold',
      0.5,
    );
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  get isConfigured(): boolean {
    return !!this.siteKey && !!this.projectId;
  }

  async verify(
    token: string | undefined,
    expectedAction: string,
  ): Promise<number | undefined> {
    if (!this.isConfigured) {
      this.logger.warn('reCAPTCHA not configured — skipping verification');
      return undefined;
    }

    if (!token) {
      throw new BadRequestException('reCAPTCHA token is required');
    }

    const accessToken = await this.auth.getAccessToken();
    if (!accessToken) {
      this.logger.warn(
        'Could not obtain GCP access token — skipping reCAPTCHA',
      );
      return undefined;
    }

    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${this.projectId}/assessments`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        event: {
          token,
          siteKey: this.siteKey,
          expectedAction,
        },
      }),
    });

    const result: AssessmentResponse = await res.json();

    if (!result.tokenProperties?.valid) {
      this.logger.warn('reCAPTCHA token invalid');
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    const score = result.riskAnalysis?.score;
    if (score !== undefined && score < this.scoreThreshold) {
      this.logger.warn(`reCAPTCHA score too low: ${score}`);
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    this.logger.log(`reCAPTCHA verified — score: ${score}`);
    return score;
  }
}
