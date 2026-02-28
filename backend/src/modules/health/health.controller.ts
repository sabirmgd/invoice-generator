import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness() {
    const isConnected = this.dataSource.isInitialized;
    return {
      status: isConnected ? 'ok' : 'unavailable',
      database: isConnected ? 'connected' : 'disconnected',
    };
  }
}
