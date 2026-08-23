export type UserRole = "customer" | "partner" | "rider" | "admin";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  dietaryPreferences?: {
    isVegOnly: boolean;
    spicePreference?: "mild" | "medium" | "hot";
    allergies?: string[];
  };
  walletBalance?: number;
}

export interface Address {
  _id: string;
  label: "Home" | "Work" | "Other";
  street: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode: string;
  coordinates: [number, number]; // [longitude, latitude]
  isDefault: boolean;
}

export interface Variant {
  name: string;
  price: number;
}

export interface AddOn {
  name: string;
  price: number;
}

export interface FoodPartner {
  _id: string;
  restaurantName: string;
  cuisineTypes: string[];
  rating: number;
  ratingCount: number;
  isOpen: boolean;
  coverImage?: string;
  logoUrl?: string;
  fssaiLicense?: string;
  location: {
    type: "Point";
    coordinates: [number, number];
    address: string;
  };
}

export interface FoodItem {
  _id: string;
  title: string;
  description: string;
  partner: FoodPartner;
  price: number;
  discountPrice?: number;
  videoUrl: string;
  thumbnailUrl: string;
  isVeg: boolean;
  category: string;
  spiceLevel: "mild" | "medium" | "hot";
  prepTimeMinutes: number;
  calories?: number;
  isAvailable: boolean;
  variants: Variant[];
  addOns: AddOn[];
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  distanceKm?: number;
  etaMinutes?: number;
}

export interface CartItem {
  foodId: string;
  title: string;
  thumbnailUrl: string;
  isVeg: boolean;
  quantity: number;
  selectedVariant?: Variant;
  selectedAddOns: AddOn[];
  unitPrice: number;
  itemTotal: number;
}

export interface Cart {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  taxAmount: number;
  discountAmount: number;
  appliedCoupon: string | null;
  tipAmount: number;
  totalAmount: number;
  deliveryInstructions?: string;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface Order {
  _id: string;
  orderNumber: string;
  customer: User;
  partner: FoodPartner;
  deliveryPartner?: {
    _id: string;
    name: string;
    phone: string;
    rating: number;
    vehicleNumber: string;
    currentLocation?: {
      coordinates: [number, number];
    };
  };
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  taxAmount: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryOtp: string;
  deliveryAddress: Address;
  deliveryInstructions?: string;
  createdAt: string;
  estimatedDeliveryTime?: string;
}
