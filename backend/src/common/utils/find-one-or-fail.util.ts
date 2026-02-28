import { Repository, FindOneOptions } from 'typeorm';
import { NotFoundException } from '../exceptions/app.exception';

export async function findOneOrFail<T extends { id: string }>(
  repo: Repository<T>,
  entityName: string,
  id: string,
  options?: Omit<FindOneOptions<T>, 'where'>,
): Promise<T> {
  const entity = await repo.findOne({
    where: { id } as any,
    ...options,
  });
  if (!entity) {
    throw new NotFoundException(entityName, id);
  }
  return entity;
}
