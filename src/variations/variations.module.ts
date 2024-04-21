import { Module } from '@nestjs/common';
import { VariationsController } from './variations.controller';
import { VariationsService } from './variations.service';
import { VariationsRepository } from './variations.repository';
import { ProductsModule } from 'src/products/products.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Variation, VariationSchema } from './variations.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Variation.name, schema: VariationSchema },
    ]),
    ProductsModule,
  ],
  controllers: [VariationsController],
  providers: [VariationsService, VariationsRepository],
  exports: [VariationsService],
})
export class VariationsModule {}
