
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.4.1
 * Query Engine version: a9055b89e58b4b5bfb59600785423b1db3d0e75d
 */
Prisma.prismaVersion = {
  client: "6.4.1",
  engine: "a9055b89e58b4b5bfb59600785423b1db3d0e75d"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  fullName: 'fullName',
  email: 'email',
  password: 'password',
  phone: 'phone',
  avatarUrl: 'avatarUrl',
  role: 'role',
  preferences: 'preferences',
  refreshToken: 'refreshToken',
  isEmailVerified: 'isEmailVerified',
  isBanned: 'isBanned',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FoodPartnerScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  phone: 'phone',
  restaurantName: 'restaurantName',
  description: 'description',
  logo: 'logo',
  coverImage: 'coverImage',
  fssaiLicenseNumber: 'fssaiLicenseNumber',
  cuisine: 'cuisine',
  address: 'address',
  city: 'city',
  pincode: 'pincode',
  latitude: 'latitude',
  longitude: 'longitude',
  openingHours: 'openingHours',
  isOpen: 'isOpen',
  isApproved: 'isApproved',
  avgRating: 'avgRating',
  totalRatings: 'totalRatings',
  refreshToken: 'refreshToken',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DeliveryPartnerScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  phone: 'phone',
  vehicleType: 'vehicleType',
  vehicleNumber: 'vehicleNumber',
  drivingLicenseNumber: 'drivingLicenseNumber',
  latitude: 'latitude',
  longitude: 'longitude',
  isOnline: 'isOnline',
  isApproved: 'isApproved',
  currentOrderId: 'currentOrderId',
  rating: 'rating',
  totalDeliveries: 'totalDeliveries',
  refreshToken: 'refreshToken',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FoodScalarFieldEnum = {
  id: 'id',
  foodPartnerId: 'foodPartnerId',
  name: 'name',
  description: 'description',
  price: 'price',
  discountedPrice: 'discountedPrice',
  category: 'category',
  tags: 'tags',
  video: 'video',
  thumbnailUrl: 'thumbnailUrl',
  cloudinaryPublicId: 'cloudinaryPublicId',
  isVeg: 'isVeg',
  spiceLevel: 'spiceLevel',
  preparationTime: 'preparationTime',
  calories: 'calories',
  isAvailable: 'isAvailable',
  likeCount: 'likeCount',
  saveCount: 'saveCount',
  commentCount: 'commentCount',
  viewCount: 'viewCount',
  avgRating: 'avgRating',
  totalRatings: 'totalRatings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FoodVariantScalarFieldEnum = {
  id: 'id',
  foodId: 'foodId',
  name: 'name',
  price: 'price'
};

exports.Prisma.FoodAddOnScalarFieldEnum = {
  id: 'id',
  foodId: 'foodId',
  name: 'name',
  price: 'price'
};

exports.Prisma.LikeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  foodId: 'foodId',
  createdAt: 'createdAt'
};

exports.Prisma.SaveScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  foodId: 'foodId',
  collection: 'collection',
  createdAt: 'createdAt'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  foodId: 'foodId',
  parentId: 'parentId',
  text: 'text',
  likeCount: 'likeCount',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CouponScalarFieldEnum = {
  id: 'id',
  code: 'code',
  type: 'type',
  value: 'value',
  minOrderValue: 'minOrderValue',
  maxDiscount: 'maxDiscount',
  usageLimit: 'usageLimit',
  usedCount: 'usedCount',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.CartScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  partnerId: 'partnerId',
  deliveryInstructions: 'deliveryInstructions',
  tipAmount: 'tipAmount',
  appliedCoupon: 'appliedCoupon',
  pricing: 'pricing',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  foodId: 'foodId',
  name: 'name',
  thumbnailUrl: 'thumbnailUrl',
  isVeg: 'isVeg',
  selectedVariant: 'selectedVariant',
  selectedAddOns: 'selectedAddOns',
  unitPrice: 'unitPrice',
  quantity: 'quantity',
  itemTotal: 'itemTotal'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  label: 'label',
  recipientName: 'recipientName',
  street: 'street',
  landmark: 'landmark',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  latitude: 'latitude',
  longitude: 'longitude',
  contactPhone: 'contactPhone',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  orderNumber: 'orderNumber',
  userId: 'userId',
  partnerId: 'partnerId',
  deliveryPartnerId: 'deliveryPartnerId',
  deliveryAddress: 'deliveryAddress',
  restaurantSnapshot: 'restaurantSnapshot',
  pricing: 'pricing',
  appliedCoupon: 'appliedCoupon',
  deliveryInstructions: 'deliveryInstructions',
  status: 'status',
  paymentStatus: 'paymentStatus',
  paymentMethod: 'paymentMethod',
  razorpayOrderId: 'razorpayOrderId',
  razorpayPaymentId: 'razorpayPaymentId',
  deliveryOtp: 'deliveryOtp',
  plainOtp: 'plainOtp',
  cancellation: 'cancellation',
  estimatedPrepTimeMinutes: 'estimatedPrepTimeMinutes',
  estimatedDeliveryTime: 'estimatedDeliveryTime',
  actualDeliveryTime: 'actualDeliveryTime',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  foodId: 'foodId',
  name: 'name',
  thumbnailUrl: 'thumbnailUrl',
  isVeg: 'isVeg',
  selectedVariant: 'selectedVariant',
  selectedAddOns: 'selectedAddOns',
  unitPrice: 'unitPrice',
  quantity: 'quantity',
  itemTotal: 'itemTotal'
};

exports.Prisma.OrderTimelineScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  status: 'status',
  timestamp: 'timestamp',
  note: 'note',
  actorRole: 'actorRole',
  actorId: 'actorId'
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  balance: 'balance',
  currency: 'currency',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  type: 'type',
  amount: 'amount',
  balanceAfter: 'balanceAfter',
  description: 'description',
  orderId: 'orderId',
  referenceId: 'referenceId',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentRecordScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  userId: 'userId',
  razorpayOrderId: 'razorpayOrderId',
  razorpayPaymentId: 'razorpayPaymentId',
  razorpaySignature: 'razorpaySignature',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  method: 'method',
  failureReason: 'failureReason',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  recipientId: 'recipientId',
  recipientRole: 'recipientRole',
  type: 'type',
  title: 'title',
  message: 'message',
  data: 'data',
  channels: 'channels',
  isRead: 'isRead',
  readAt: 'readAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Role = exports.$Enums.Role = {
  customer: 'customer',
  admin: 'admin'
};

exports.VehicleType = exports.$Enums.VehicleType = {
  bike: 'bike',
  scooter: 'scooter',
  electric_vehicle: 'electric_vehicle',
  cycle: 'cycle'
};

exports.SpiceLevel = exports.$Enums.SpiceLevel = {
  mild: 'mild',
  medium: 'medium',
  hot: 'hot'
};

exports.CouponType = exports.$Enums.CouponType = {
  percent: 'percent',
  flat: 'flat'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  RAZORPAY: 'RAZORPAY',
  WALLET: 'WALLET',
  COD: 'COD'
};

exports.WalletTxType = exports.$Enums.WalletTxType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  ORDER_PLACED: 'ORDER_PLACED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_PREPARING: 'ORDER_PREPARING',
  ORDER_READY: 'ORDER_READY',
  ORDER_PICKED_UP: 'ORDER_PICKED_UP',
  ORDER_OUT_FOR_DELIVERY: 'ORDER_OUT_FOR_DELIVERY',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  REFUND_CREDITED: 'REFUND_CREDITED',
  OTP_GENERATED: 'OTP_GENERATED',
  DISCOUNT_ALERT: 'DISCOUNT_ALERT',
  SYSTEM_ALERT: 'SYSTEM_ALERT'
};

exports.Prisma.ModelName = {
  User: 'User',
  FoodPartner: 'FoodPartner',
  DeliveryPartner: 'DeliveryPartner',
  Food: 'Food',
  FoodVariant: 'FoodVariant',
  FoodAddOn: 'FoodAddOn',
  Like: 'Like',
  Save: 'Save',
  Comment: 'Comment',
  Coupon: 'Coupon',
  Cart: 'Cart',
  CartItem: 'CartItem',
  Address: 'Address',
  Order: 'Order',
  OrderItem: 'OrderItem',
  OrderTimeline: 'OrderTimeline',
  Wallet: 'Wallet',
  WalletTransaction: 'WalletTransaction',
  PaymentRecord: 'PaymentRecord',
  Notification: 'Notification'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
