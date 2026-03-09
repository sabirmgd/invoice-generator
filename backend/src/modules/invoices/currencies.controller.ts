import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CURRENCIES } from '../../common/constants/currencies';

@ApiTags('Currencies')
@Controller('api/v1/currencies')
export class CurrenciesController {
  @Get()
  @ApiOperation({ summary: 'List supported currencies (public)' })
  getCurrencies() {
    return CURRENCIES;
  }
}
