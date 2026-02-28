import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message }, status);
  }
}

export class NotFoundException extends AppException {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}
