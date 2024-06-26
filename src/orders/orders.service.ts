import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import ShortUniqueId from 'short-unique-id';
import { CartService } from 'src/cart/cart.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from 'src/constant/enum/order.enum';
import { ProductsService } from 'src/products/products.service';
import { OrderBy } from 'src/types/order-by.type';
import { SortBy } from 'src/types/sort-by.type';
import { User } from 'src/users/users.entity';
import { UsersService } from 'src/users/users.service';
import { VariationsService } from 'src/variations/variations.service';
import { CreateOrderDto, RequestCreateOrderDto } from './dtos/create-order-dto';
import { OrdersListResponse } from './dtos/orders-response';
import { UpdateOrderDto } from './dtos/update-order.dto';
import { Order } from './order.entity';
import { OrderRepository } from './orders.repository';
import { PaymentMethodsService } from 'src/payment-methods/payment-methods.service';
@Injectable()
export class OrdersService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartService: CartService,
    private readonly userService: UsersService,
    private readonly productService: ProductsService,
    private readonly variationService: VariationsService,
    private readonly paymentMethodService: PaymentMethodsService,
  ) {}

  async findAllAdmin(
    page: number,
    limit: number,
    filter?: FilterQuery<Order>,
    sortBy?: SortBy,
    order?: OrderBy,
  ): Promise<OrdersListResponse> {
    const queryFilter: FilterQuery<Order> = {};
    if (filter) {
      if (filter['orderCode'])
        queryFilter['orderCode'] = {
          $regex: filter['orderCode'],
          $options: 'i',
        };

      switch (filter['orderStatus']) {
        case OrderStatus.PENDING:
          queryFilter['orderStatus'] = [OrderStatus.PENDING];
          break;
        case OrderStatus.PROCESSING:
          queryFilter['orderStatus'] = [
            OrderStatus.PENDING,
            OrderStatus.PROCESSING,
          ];
          break;
        case OrderStatus.SHIPPING:
          queryFilter['orderStatus'] = [
            OrderStatus.PENDING,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPING,
          ];
          break;
        case OrderStatus.DELIVERED:
          queryFilter['orderStatus'] = [
            OrderStatus.PENDING,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPING,
            OrderStatus.DELIVERED,
          ];
          break;

        case OrderStatus.CANCELLED:
          queryFilter['orderStatus'] = { $in: ['CANCELLED'] };
          break;
        default:
          break;
      }
    }

    const sortOption = order === OrderBy.ASC ? 'asc' : 'desc';

    const res = await this.orderRepository.findAllWithFullFilters(
      page,
      limit,
      queryFilter,
      sortBy,
      sortOption,
    );

    res.data.forEach((order) => {
      delete (order.user as any).password;
    });

    const mappedOrdersList = await Promise.all(
      res.data.map(async (order) => {
        const mappedOrderItems = await Promise.all(
          order.orderItems.map(async (orderItem) => {
            const productInfo = await this.productService.findOneByCondition({
              variations: orderItem.variation._id,
            });
            delete productInfo.variations;
            delete productInfo.category;
            const orderItemFullData = {
              ...orderItem,
              product: productInfo,
            };
            return orderItemFullData;
          }),
        );

        const mappedOrder = {
          ...order,
          orderItems: mappedOrderItems,
        };
        return mappedOrder;
      }),
    );

    return {
      orders: mappedOrdersList,
      totalPage: res.totalPage,
      totalDocs: res.totalDocs,
    };
  }

  async findAll(
    user: Partial<User>,
    page: number,
    limit: number,
    filter?: FilterQuery<Order>,
    sortBy?: SortBy,
    order?: OrderBy,
  ): Promise<OrdersListResponse> {
    const queryFilter: FilterQuery<Order> = {};
    queryFilter['user'] = user._id;
    if (filter) {
      if (filter['orderCode'])
        queryFilter['orderCode'] = {
          $regex: filter['orderCode'],
          $options: 'i',
        };

      switch (filter['orderStatus']) {
        case OrderStatus.PENDING:
          queryFilter['orderStatus'] = [OrderStatus.PENDING];
          break;
        case OrderStatus.PROCESSING:
          queryFilter['orderStatus'] = [
            OrderStatus.PENDING,
            OrderStatus.PROCESSING,
          ];
          break;
        case OrderStatus.SHIPPING:
          queryFilter['orderStatus'] = [
            OrderStatus.PENDING,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPING,
          ];
          break;
        case OrderStatus.DELIVERED:
          queryFilter['orderStatus'] = [
            OrderStatus.PENDING,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPING,
            OrderStatus.DELIVERED,
          ];
          break;

        case OrderStatus.CANCELLED:
          queryFilter['orderStatus'] = { $in: ['CANCELLED'] };
          break;
        default:
          break;
      }
    }

    const sortOption = order === OrderBy.ASC ? 'asc' : 'desc';

    const res = await this.orderRepository.findAllWithFullFilters(
      page,
      limit,
      queryFilter,
      sortBy,
      sortOption,
    );

    res.data.forEach((order) => {
      delete (order.user as any).password;
    });

    const mappedOrdersList = await Promise.all(
      res.data.map(async (order) => {
        const mappedOrderItems = await Promise.all(
          order.orderItems.map(async (orderItem) => {
            const productInfo = await this.productService.findOneByCondition({
              variations: orderItem.variation._id,
            });
            delete productInfo.variations;
            delete productInfo.category;
            const orderItemFullData = {
              ...orderItem,
              product: productInfo,
            };
            return orderItemFullData;
          }),
        );

        const mappedOrder = {
          ...order,
          orderItems: mappedOrderItems,
        };
        return mappedOrder;
      }),
    );

    return {
      orders: mappedOrdersList,
      totalPage: res.totalPage,
      totalDocs: res.totalDocs,
    };
  }

  async getOrderByIdAdmin(orderId: string) {
    const order = await this.orderRepository.findById(orderId);

    const mappedOrder = await Promise.all(
      order.orderItems.map(async (orderItem) => {
        const productInfo = await this.productService.findOneByCondition({
          variations: orderItem.variation._id,
        });
        delete productInfo.variations;
        delete productInfo.category;
        const orderItemFullData = {
          ...orderItem,
          product: productInfo,
        };
        return orderItemFullData;
      }),
    );

    order.orderItems = mappedOrder;

    delete (order.user as any).password;
    return order;
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.orderRepository.findById(orderId);

    if (!order || (order as any).user._id.toString() !== userId)
      throw new NotFoundException('Order not found');
    const mappedOrder = await Promise.all(
      order.orderItems.map(async (orderItem) => {
        const productInfo = await this.productService.findOneByCondition({
          variations: orderItem.variation._id,
        });
        delete productInfo.variations;
        delete productInfo.category;
        const orderItemFullData = {
          ...orderItem,
          product: productInfo,
        };
        return orderItemFullData;
      }),
    );

    order.orderItems = mappedOrder;

    delete (order.user as any).password;
    return order;
  }

  async createAnOrder(
    userId: string,
    requestCreateOrderDto: RequestCreateOrderDto,
  ) {
    if (requestCreateOrderDto.payment.paymentMethod === PaymentMethod.VNPAY) {
      const payment = await this.paymentMethodService.findByName(
        PaymentMethod.VNPAY,
      );
      if (!payment.isEnabled)
        throw new BadRequestException(
          'Phương thức thanh toán vừa được cập nhật vui lòng tải lại trang',
        );
    }

    const cart = await this.cartService.getCartByUserId(userId);
    const cartResponse = await this.cartService.getCartResponseData(userId);
    const user: User = await this.userService.findOneById(userId);

    const variationIds = cart.items.map((item) => item.variation._id);
    const variations = await Promise.all(
      variationIds.map((id) => this.variationService.findOne(id)),
    );

    const itemsExceedingStock = cart.items.filter((item, index) => {
      const maxQuantity = variations[index].availableQuantity || 0;
      return item.quantity > maxQuantity;
    });

    if (itemsExceedingStock.length > 0) {
      // Nếu có mục vượt quá số lượng có sẵn
      throw new BadRequestException(
        'Giỏ hàng của bạn đã được cập nhật xin vui lòng kiểm tra giỏ hàng và F5 để tải lại trang',
      );
    }

    const mappedOrderItemsFromCart = cart.items.map((item) => {
      return {
        variation: item.variation,
        price: item.variation.salePrice || item.variation.unitPrice,
        quantity: item.quantity,
      };
    });

    await Promise.all(
      cart.items.map(async (item) => {
        const existingVariation = await this.variationService.findOne(
          String(item.variation._id),
        );

        existingVariation.availableQuantity -= item.quantity;
        await this.variationService.update(
          String(item.variation._id),
          existingVariation,
        );
      }),
    );
    const uid = new ShortUniqueId({ length: 10 });
    const orderCode = 'ORDER-' + uid.rnd();
    const orderData: CreateOrderDto = {
      user: userId,
      orderItems: mappedOrderItemsFromCart,
      orderStatus: [OrderStatus.PENDING],
      phoneNumber: requestCreateOrderDto.phoneNumber || user.phoneNumber,
      receiverName:
        requestCreateOrderDto.receiverName ||
        user.firstName + ' ' + user.lastName,
      shippingAddress: requestCreateOrderDto.shippingAddress || user.address,
      shippingFee: cartResponse.shippingFee,
      totalPrice: cartResponse.totalPrice,
      shippingFeePercentage: cartResponse.shippingFeePercentage,
      totalAmount: cartResponse.totalAmount,
      orderCode: orderCode,
      payment: {
        paymentMethod:
          requestCreateOrderDto.payment.paymentMethod ||
          PaymentMethod.CASH_ON_DELIVERY,
        paymentStatus: PaymentStatus.UNPAID,
      },
    };
    const orderResponse = await this.orderRepository.create(orderData);
    delete orderResponse.user.password;
    if (orderResponse) this.cartService.clearCart(userId);
    return orderResponse;
  }
  async updateOrder(
    userId: string,
    id: string,
    orderUpdateDto: UpdateOrderDto,
  ) {
    const order = await this.orderRepository.findByCondition({
      _id: id,
      user: userId,
    });

    if (!order) throw new NotFoundException('Order not found');

    if (orderUpdateDto.orderStatus) {
      order.orderStatus = [...order.orderStatus, orderUpdateDto.orderStatus];
    }

    if (orderUpdateDto.orderStatus === OrderStatus.CANCELLED) {
      await Promise.all(
        order.orderItems.map(async (item) => {
          const existingVariation = await this.variationService.findOne(
            String(item.variation._id),
          );

          existingVariation.availableQuantity += item.quantity;
          await this.variationService.update(
            String(item.variation._id),
            existingVariation,
          );
        }),
      );
    }

    if (orderUpdateDto.orderStatus === OrderStatus.DELIVERED) {
      order.payment.paymentStatus = PaymentStatus.PAID;
    }
    const responseOrderUpdate = await this.orderRepository.findByIdAndUpdate(
      id,
      order,
    );
    delete responseOrderUpdate.user;
    return responseOrderUpdate;
  }

  async updateOrderByCode(
    userId: string,
    orderCode: string,
    orderUpdateDto: UpdateOrderDto,
  ) {
    const order = await this.orderRepository.findByCondition({
      orderCode: orderCode,
      user: userId,
    });

    if (!order) throw new NotFoundException('Order not found');

    if (orderUpdateDto.paymentStatus === PaymentStatus.PAID) {
      order.payment.paymentStatus = PaymentStatus.PAID;
    }
    if (orderUpdateDto.orderStatus) {
      order.orderStatus = [...order.orderStatus, orderUpdateDto.orderStatus];
    }

    if (orderUpdateDto.orderStatus === OrderStatus.CANCELLED) {
      await Promise.all(
        order.orderItems.map(async (item) => {
          const existingVariation = await this.variationService.findOne(
            String(item.variation._id),
          );

          existingVariation.availableQuantity += item.quantity;
          await this.variationService.update(
            String(item.variation._id),
            existingVariation,
          );
        }),
      );
    }

    const responseOrderUpdate =
      await this.orderRepository.findByConditionAndUpdate({ orderCode }, order);
    delete responseOrderUpdate.user;
    return responseOrderUpdate;
  }
  async updateOrderAdmin(id: string, orderUpdateDto: UpdateOrderDto) {
    const order = await this.orderRepository.findByCondition({
      _id: id,
    });

    if (!order) throw new NotFoundException('Order not found');

    if (orderUpdateDto.orderStatus) {
      order.orderStatus = [...order.orderStatus, orderUpdateDto.orderStatus];
    }
    const responseOrderUpdate = await this.orderRepository.findByIdAndUpdate(
      id,
      order,
    );
    delete responseOrderUpdate.user;
    return responseOrderUpdate;
  }
  async getTotalAmountBetweenDates(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const matchCondition: any = {};

    if (startDate && endDate) {
      matchCondition.createdAt = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      matchCondition.createdAt = { $gte: startDate };
    } else if (endDate) {
      matchCondition.createdAt = { $lte: endDate };
    }
    matchCondition.orderStatus = { $in: [OrderStatus.DELIVERED] };
    const result = await this.orderRepository.aggregate([
      {
        $match: matchCondition, // Lọc các đơn hàng từ startDate đến endDate nếu có
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalPrice' }, // Tính tổng tiền các đơn hàng
        },
      },
    ]);

    return result.length > 0 ? result[0].totalAmount : 0;
  }

  async getOrdersCountToday(): Promise<number> {
    // Lấy ngày hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đặt thời gian về đầu ngày

    // Lấy ngày bắt đầu và kết thúc của ngày hôm nay
    const startOfToday = today;
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999); // Đặt thời gian về cuối ngày

    const result = await this.orderRepository.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 }, // Đếm số lượng đơn hàng
        },
      },
    ]);

    // Lấy số lượng đơn hàng từ kết quả aggregation
    const ordersCount = result.length > 0 ? result[0].ordersCount : 0;
    return ordersCount;
  }

  async getVariationSalesBetweenDates(
    page = 1,
    limit = 5,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ data: any[]; totalDocs: number; totalPages: number }> {
    const matchCondition: any = {};

    if (startDate && endDate) {
      matchCondition.createdAt = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      matchCondition.createdAt = { $gte: startDate };
    } else if (endDate) {
      matchCondition.createdAt = { $lte: endDate };
    }
    matchCondition.orderStatus = { $in: [OrderStatus.DELIVERED] };
    const aggregationPipeline: any[] = [
      {
        $unwind: '$orderItems',
      },
      {
        $group: {
          _id: '$orderItems.variation',
          totalSaleQuantity: { $sum: '$orderItems.quantity' },
          salePriceAtBoughtTime: { $first: '$orderItems.price' },
        },
      },
      {
        $lookup: {
          from: 'variations',
          localField: '_id',
          foreignField: '_id',
          as: 'variationInfo',
        },
      },
      {
        $unwind: '$variationInfo',
      },
      {
        $lookup: {
          from: 'products',
          localField: 'variationInfo._id',
          foreignField: 'variations',
          as: 'productInfo',
        },
      },
      {
        $unwind: '$productInfo',
      },
      {
        $group: {
          _id: null,
          data: { $push: '$$ROOT' },
          totalDocs: { $sum: 1 },
        },
      },
      {
        $project: {
          data: { $slice: ['$data', (page - 1) * limit, limit] },
          totalDocs: 1,
          totalPages: { $ceil: { $divide: ['$totalDocs', limit] } },
        },
      },
    ];

    if (Object.keys(matchCondition).length > 0) {
      aggregationPipeline.unshift({
        $match: matchCondition,
      });
    }

    const result = await this.orderRepository.aggregate(aggregationPipeline);
    return result[0];
  }
}
