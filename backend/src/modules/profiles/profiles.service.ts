import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile, ProfileType } from '../../db/entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryProfileDto } from './dto/query-profile.dto';
import { findOneOrFail } from '../../common/utils/find-one-or-fail.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly repo: Repository<Profile>,
  ) {}

  async create(ownerId: string, dto: CreateProfileDto): Promise<Profile> {
    if (dto.isDefault) {
      await this.unsetDefault(ownerId, dto.type);
    }
    const profile = this.repo.create({ ...dto, ownerId });
    return this.repo.save(profile);
  }

  async findAll(ownerId: string, query: QueryProfileDto): Promise<PaginatedResult<Profile>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.ownerId = :ownerId', { ownerId })
      .orderBy('p.createdAt', 'DESC');
    if (query.type) {
      qb.andWhere('p.type = :type', { type: query.type });
    }
    return paginate(qb, query);
  }

  async findOne(ownerId: string, id: string): Promise<Profile> {
    const profile = await findOneOrFail(this.repo, 'Profile', id);
    if (profile.ownerId !== ownerId) {
      throw new AppException('Profile not found', HttpStatus.NOT_FOUND);
    }
    return profile;
  }

  async update(ownerId: string, id: string, dto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.findOne(ownerId, id);
    if (dto.isDefault && !profile.isDefault) {
      await this.unsetDefault(ownerId, dto.type ?? profile.type);
    }
    Object.assign(profile, dto);
    return this.repo.save(profile);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const profile = await this.findOne(ownerId, id);
    await this.repo.softRemove(profile);
  }

  async findDefaultByType(ownerId: string, type: ProfileType): Promise<Profile | null> {
    return this.repo.findOneBy({ ownerId, type, isDefault: true });
  }

  private async unsetDefault(ownerId: string, type: ProfileType): Promise<void> {
    await this.repo.update({ ownerId, type, isDefault: true }, { isDefault: false });
  }
}
