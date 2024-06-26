import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './categories.entity';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { IdParam } from 'src/pipes/validate-mongo-id.pipe';

@Controller('/api/v1/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('name') name?: string,
  ): Promise<Category[]> {
    const filter: { name?: string } = name ? { name } : {};

    return await this.categoriesService.findAll(+page, +limit, filter);
  }

  @Get('/home')
  async findHomePageCategories(
    @Query('page') page = 1,
    @Query('limit') limit = 4,
    @Query('name') name?: string,
  ): Promise<Category[]> {
    let filter: { name?: string; isShowAtHomePage?: boolean } = name
      ? { name }
      : {};
    filter = { ...filter, isShowAtHomePage: true };
    return await this.categoriesService.findAll(+page, +limit, filter);
  }

  @Get(':id')
  async findOne(@IdParam('id') @Param('id') id: string): Promise<Category> {
    return await this.categoriesService.findOne(id);
  }

  @Post()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return await this.categoriesService.create(createCategoryDto);
  }

  @Put(':id')
  async update(
    @IdParam('id')
    @Param('id')
    id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return await this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  async remove(@IdParam('id') @Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}
