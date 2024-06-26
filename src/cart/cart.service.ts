import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { Variation } from 'src/variations/variations.entity';
import { VariationsService } from 'src/variations/variations.service';
import { Cart } from './cart.entity';
import { CartRepository } from './cart.repository';
import { CartItemDto } from './dtos/cart-item.dto';
import { CartResponseDto } from './dtos/cart-response.dto';
import {
  calculateShippingFee,
  defaultShippingFeeTiers,
} from 'src/utils/calculate-shipping-fee';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly variationService: VariationsService,
    private readonly productService: ProductsService,
  ) {}

  async getCartResponseData(userId: string): Promise<CartResponseDto> {
    const cart = await this.cartRepository.findByCondition({ user: userId });

    const cartData: CartResponseDto = {
      items: [],
      totalPrice: 0,
    };

    if (!cart) {
      return cartData;
    }

    const cartResponse = cart;

    const mappedCartItems = await Promise.all(
      cartResponse.items.map(async (item) => {
        const productItemData = await this.productService.findOneByCondition({
          variations: item.variation._id,
        });

        return { productItemData, cartItemVariationData: item };
      }),
    );

    const updatedCartItems = await Promise.all(
      mappedCartItems.map(async (item) => {
        const productItemData = item.productItemData as any;
        const cartItemVariationData = item.cartItemVariationData;
        const maxQuantity =
          cartItemVariationData.variation.availableQuantity || 0;

        // Xác định số lượng thực tế của sản phẩm trong giỏ hàng
        const realQuantityInCart = Math.min(
          cartItemVariationData.quantity,
          maxQuantity,
        );

        if (realQuantityInCart === 0) {
          // Nếu số lượng thực tế là 0, loại bỏ mục khỏi giỏ hàng
          return null;
        }

        // Cập nhật số lượng mới trong giỏ hàng
        const updatedCartItem = {
          productId: productItemData._id,
          ...productItemData,
          ...cartItemVariationData,
          quantity: realQuantityInCart,
          subTotal:
            realQuantityInCart *
            (cartItemVariationData.variation.salePrice ||
              cartItemVariationData.variation.unitPrice),
        };

        return updatedCartItem;
      }),
    );

    cartData.items = updatedCartItems.filter((item) => item !== null); // Loại bỏ các mục null

    cartData.totalPrice = cartResponse.items.reduce(
      (accumulator: number, currentItem) => {
        const price =
          currentItem.variation.salePrice || currentItem.variation.unitPrice;
        return accumulator + price * currentItem.quantity;
      },
      0,
    );

    const shippingFeeData = calculateShippingFee(
      cartData.totalPrice,
      defaultShippingFeeTiers,
    );

    cartData.shippingFee = shippingFeeData.shippingFee;
    cartData.shippingFeePercentage = shippingFeeData.shippingFeePercentage;
    cartData.totalAmount = cartData.totalPrice + shippingFeeData.shippingFee;

    return cartData;
  }

  async getCartByUserId(userId: string): Promise<Cart> {
    const cart = await this.cartRepository.findByCondition({ user: userId });
    if (!cart) return this.createNewCart(userId);
    return cart;
  }

  async createNewCart(userId: string): Promise<Cart> {
    return await this.cartRepository.create({ user: userId, items: [] });
  }

  async addProductToCart(
    userId: string,
    itemAddedToCartData: CartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.getCartByUserId(userId);

    const existingVariation: Variation = await this.variationService.findOne(
      itemAddedToCartData.variationId,
    );
    if (!existingVariation) {
      throw new NotFoundException(
        `Variation with id ${itemAddedToCartData.variationId} not found`,
      );
    }

    const index = cart.items.findIndex(
      (item) => String(item.variation?._id) === itemAddedToCartData.variationId,
    );
    if (index !== -1) {
      const isQuantityValid =
        existingVariation.availableQuantity >=
        cart.items[index].quantity + itemAddedToCartData.quantity;
      if (!isQuantityValid) {
        throw new BadRequestException(
          `Số lượng thêm vào giỏ phải nhỏ hơn hoặc bằng số lượng sẵn có là ${existingVariation.availableQuantity}`,
        );
      }

      cart.items[index].quantity += itemAddedToCartData.quantity;

      if (cart.items[index].quantity > existingVariation.availableQuantity)
        throw new BadRequestException(
          `Quantity must be less than or equal to ${existingVariation.availableQuantity}`,
        );
    } else {
      const isQuantityValid =
        existingVariation.availableQuantity >= itemAddedToCartData.quantity;
      if (!isQuantityValid) {
        throw new BadRequestException(
          `Số lượng thêm vào giỏ phải nhỏ hơn hoặc bằng số lượng sẵn có là ${existingVariation.availableQuantity}`,
        );
      }
      cart.items.push({
        variation: existingVariation,
        quantity: itemAddedToCartData.quantity,
      });
    }
    await this.cartRepository.findByIdAndUpdate(cart._id, cart);
    return this.getCartResponseData(userId);
  }

  async updateCartItemQuantity(
    userId: string,
    itemUpdated: CartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.getCartByUserId(userId);

    const existingVariation: Variation = await this.variationService.findOne(
      itemUpdated.variationId,
    );
    if (!existingVariation) {
      throw new NotFoundException(
        `Variation with id ${itemUpdated.variationId} not found`,
      );
    }
    const index = cart.items.findIndex(
      (item) => String(item.variation?._id) === itemUpdated.variationId,
    );
    if (index !== -1) {
      const isQuantityValid =
        existingVariation.availableQuantity >= itemUpdated.quantity;
      if (!isQuantityValid) {
        throw new BadRequestException(
          `Số trong giỏ phải nhỏ hơn hoặc bằng số lượng sẵn có là ${existingVariation.availableQuantity}`,
        );
      }
      cart.items[index].quantity = itemUpdated.quantity;
    }
    await this.cartRepository.findByIdAndUpdate(cart._id, cart);
    return this.getCartResponseData(userId);
  }

  async decreaseItemQuantity(
    userId: string,
    variationId: string,
  ): Promise<CartResponseDto> {
    const cart = await this.getCartByUserId(userId);
    const index = cart.items.findIndex(
      (item) => String(item.variation?._id) === variationId,
    );

    if (index === -1) throw new BadRequestException('Item not exists in cart');

    if (index !== -1) {
      cart.items[index].quantity--;
    }
    await this.cartRepository.findByIdAndUpdate(cart._id, cart);
    return this.getCartResponseData(userId);
  }

  async removeItemFromCart(
    userId: string,
    variationId: string,
  ): Promise<CartResponseDto> {
    const cart = await this.getCartByUserId(userId);
    const index = cart.items.findIndex(
      (item) => String(item.variation?._id) === variationId,
    );
    if (index === -1) throw new BadRequestException('Item not exists in cart');
    if (index !== -1) {
      cart.items.splice(index, 1);
    }
    await this.cartRepository.findByIdAndUpdate(cart._id, cart);
    return this.getCartResponseData(userId);
  }

  async clearCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getCartByUserId(userId);
    cart.items = [];
    await this.cartRepository.findByIdAndUpdate(cart._id, cart);
    return this.getCartResponseData(userId);
  }
}
