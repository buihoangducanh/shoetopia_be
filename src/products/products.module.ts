import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductRepository } from './products.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.entity';
import { CategoriesModule } from 'src/categories/categories.module';
import { ProductsAdminController } from './products.admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    CategoriesModule,
  ],
  controllers: [ProductsController, ProductsAdminController],
  providers: [ProductsService, ProductRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
