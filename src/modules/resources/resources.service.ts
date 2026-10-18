import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateResourceDto) {
    return this.prisma.resource.create({ data: dto });
  }

  findAll() {
    return this.prisma.resource.findMany();
  }

  async findOne(id: number) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Ресурс не найден');
    return resource;
  }

  async update(id: number, dto: UpdateResourceDto) {
    await this.findOne(id); // проверка на существование
    return this.prisma.resource.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.resource.delete({ where: { id } });
  }
}