// src/services/search.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Centralized Search & Discovery Engine for Insta-Zomato:
//   1. Multi-field full-text matching across dish titles, descriptions, categories & tags
//   2. Restaurant matching across name, cuisine, and address
//   3. Dynamic facet filters (Dietary isVeg, Category, Price range, Rating, Max distance)
//   4. Geospatial proximity ranking & dynamic travel ETA estimation
//   5. Autocomplete search suggestions (Dishes, Restaurants, Cuisines)
//   6. Curated trending categories & popular searches aggregation
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const { calculateHaversineDistance, calculateDynamicDeliveryFee } = require("./map.services");
const logger = require("../config/logger");

// Curated top food categories with emojis and descriptions
const POPULAR_CATEGORIES = [
  { id: "burgers", name: "Burgers", icon: "🍔", tag: "Burgers" },
  { id: "pizza", name: "Pizza", icon: "🍕", tag: "Pizza" },
  { id: "biryani", name: "Biryani", icon: "🍚", tag: "Biryani" },
  { id: "desserts", name: "Desserts", icon: "🍰", tag: "Desserts" },
  { id: "shakes", name: "Shakes & Beverages", icon: "🥤", tag: "Beverages" },
  { id: "rolls", name: "Rolls & Wraps", icon: "🌯", tag: "Rolls" },
  { id: "chinese", name: "Asian & Chinese", icon: "🥢", tag: "Chinese" },
  { id: "healthy", name: "Healthy Bowls", icon: "🥗", tag: "Healthy" },
  { id: "north_indian", name: "North Indian", icon: "🥘", tag: "North Indian" },
  { id: "south_indian", name: "South Indian", icon: "🥞", tag: "South Indian" },
];

/**
 * Universal Search & Discovery across dishes and restaurants.
 *
 * @param {Object} params
 * @param {string} [params.query=""] - Text search term
 * @param {boolean|string} [params.isVeg] - Filter vegetarian dishes
 * @param {string} [params.category] - Category or cuisine tag
 * @param {number} [params.minPrice] - Minimum dish price
 * @param {number} [params.maxPrice] - Maximum dish price
 * @param {number} [params.minRating] - Minimum rating (1-5)
 * @param {number} [params.maxDistanceKm=15.0] - Maximum delivery radius in km
 * @param {number} [params.userLat] - User current latitude
 * @param {number} [params.userLng] - User current longitude
 * @param {string} [params.sortBy="relevance"] - relevance | rating | delivery_time | price_low_high | price_high_low | distance
 * @param {number} [params.page=1] - Pagination page
 * @param {number} [params.limit=20] - Results per page
 */
async function searchDishesAndRestaurants({
  query = "",
  isVeg,
  category,
  minPrice,
  maxPrice,
  minRating,
  maxDistanceKm = 15.0,
  userLat,
  userLng,
  sortBy = "relevance",
  page = 1,
  limit = 20,
}) {
  try {
    const trimmedQuery = query.trim();
    const hasLocation = userLat !== undefined && userLng !== undefined && !isNaN(parseFloat(userLat)) && !isNaN(parseFloat(userLng));
    const uLat = hasLocation ? parseFloat(userLat) : null;
    const uLng = hasLocation ? parseFloat(userLng) : null;

    // ── 1. Build Prisma Where Clause for Food Items ──────────────────────────
    const foodWhere = {
      isAvailable: true,
    };

    // Text search matching name, description, category, or tags
    if (trimmedQuery) {
      foodWhere.OR = [
        { name: { contains: trimmedQuery, mode: "insensitive" } },
        { description: { contains: trimmedQuery, mode: "insensitive" } },
        { category: { contains: trimmedQuery, mode: "insensitive" } },
        { tags: { has: trimmedQuery.toLowerCase() } },
      ];
    }

    // Dietary filter
    if (isVeg !== undefined && isVeg !== null && isVeg !== "") {
      foodWhere.isVeg = isVeg === true || isVeg === "true";
    }

    // Category filter
    if (category) {
      foodWhere.category = { equals: category, mode: "insensitive" };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      foodWhere.price = {};
      if (minPrice !== undefined && !isNaN(parseFloat(minPrice))) {
        foodWhere.price.gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(parseFloat(maxPrice))) {
        foodWhere.price.lte = parseFloat(maxPrice);
      }
    }

    // ── 2. Execute Food Search Query ─────────────────────────────────────────
    const foods = await prisma.food.findMany({
      where: foodWhere,
      include: {
        foodPartner: {
          select: {
            id: true,
            name: true,
            restaurantName: true,
            address: true,
            city: true,
            latitude: true,
            longitude: true,
            isOpen: true,
          },
        },
      },
    });

    // ── 3. Execute Restaurant Search Query ───────────────────────────────────
    let matchedRestaurants = [];
    if (trimmedQuery) {
      matchedRestaurants = await prisma.foodPartner.findMany({
        where: {
          OR: [
            { restaurantName: { contains: trimmedQuery, mode: "insensitive" } },
            { address: { contains: trimmedQuery, mode: "insensitive" } },
            { city: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          restaurantName: true,
          address: true,
          city: true,
          latitude: true,
          longitude: true,
          isOpen: true,
          foods: {
            where: { isAvailable: true },
            take: 3,
            select: {
              id: true,
              name: true,
              price: true,
              thumbnailUrl: true,
              isVeg: true,
            },
          },
        },
        take: 10,
      });
    }

    // ── 4. Process Geospatial Proximity, ETA & Delivery Fee ──────────────────
    let enrichedFoods = foods.map((food) => {
      let distanceKm = 2.5;
      let prepTime = food.preparationTime || 20;

      if (hasLocation && food.foodPartner?.latitude && food.foodPartner?.longitude) {
        distanceKm = calculateHaversineDistance(
          uLat,
          uLng,
          food.foodPartner.latitude,
          food.foodPartner.longitude,
        );
      }

      // Approximate road delivery time: 3 mins per km + restaurant prep time
      const travelTimeMinutes = Math.max(5, Math.round(distanceKm * 3));
      const totalEtaMinutes = prepTime + travelTimeMinutes;

      // Delivery fee preview
      const feeObj = calculateDynamicDeliveryFee(distanceKm);
      const deliveryFee = feeObj.totalDeliveryFee;

      // Score relevance for ranking: exact title match gives bonus
      let relevanceScore = 0;
      if (trimmedQuery) {
        const lowerName = food.name.toLowerCase();
        const lowerQ = trimmedQuery.toLowerCase();
        if (lowerName === lowerQ) relevanceScore += 100;
        else if (lowerName.startsWith(lowerQ)) relevanceScore += 50;
        else if (lowerName.includes(lowerQ)) relevanceScore += 25;

        if (food.category?.toLowerCase() === lowerQ) relevanceScore += 30;
        if (food.tags?.some((t) => t.toLowerCase() === lowerQ)) relevanceScore += 20;
      }
      relevanceScore += (food.likeCount || 0) * 0.1;

      return {
        ...food,
        effectivePrice: food.discountedPrice || food.price,
        distanceKm,
        estimatedEtaMinutes: totalEtaMinutes,
        deliveryFee,
        relevanceScore,
      };
    });

    // Filter by maxDistanceKm if user location is available
    if (hasLocation && maxDistanceKm) {
      enrichedFoods = enrichedFoods.filter((f) => f.distanceKm <= parseFloat(maxDistanceKm));
    }

    // Process matched restaurants with distance
    const enrichedRestaurants = matchedRestaurants.map((rest) => {
      let distanceKm = 2.5;
      if (hasLocation && rest.latitude && rest.longitude) {
        distanceKm = calculateHaversineDistance(uLat, uLng, rest.latitude, rest.longitude);
      }
      return {
        ...rest,
        distanceKm,
        estimatedEtaMinutes: 20 + Math.round(distanceKm * 3),
      };
    });

    // ── 5. Apply Multi-Criteria Sorting ───────────────────────────────────────
    if (sortBy === "rating") {
      enrichedFoods.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else if (sortBy === "delivery_time") {
      enrichedFoods.sort((a, b) => a.estimatedEtaMinutes - b.estimatedEtaMinutes);
    } else if (sortBy === "price_low_high") {
      enrichedFoods.sort((a, b) => a.effectivePrice - b.effectivePrice);
    } else if (sortBy === "price_high_low") {
      enrichedFoods.sort((a, b) => b.effectivePrice - a.effectivePrice);
    } else if (sortBy === "distance") {
      enrichedFoods.sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      // Default: relevance
      enrichedFoods.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // ── 6. Aggregate Facets for Filter Chips ──────────────────────────────────
    const categoryCounts = {};
    let vegCount = 0;
    let nonVegCount = 0;
    let minPriceFound = Infinity;
    let maxPriceFound = 0;

    for (const f of enrichedFoods) {
      if (f.category) {
        categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
      }
      if (f.isVeg) vegCount++;
      else nonVegCount++;

      if (f.effectivePrice < minPriceFound) minPriceFound = f.effectivePrice;
      if (f.effectivePrice > maxPriceFound) maxPriceFound = f.effectivePrice;
    }

    // ── 7. Pagination ────────────────────────────────────────────────────────
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));
    const totalCount = enrichedFoods.length;
    const totalPages = Math.ceil(totalCount / parsedLimit) || 1;
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginatedFoods = enrichedFoods.slice(startIndex, startIndex + parsedLimit);

    return {
      query: trimmedQuery,
      foods: paginatedFoods,
      restaurants: enrichedRestaurants,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalCount,
        totalPages,
        hasNextPage: parsedPage < totalPages,
      },
      facets: {
        categories: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })),
        dietary: { veg: vegCount, nonVeg: nonVegCount },
        priceRange: {
          min: minPriceFound === Infinity ? 0 : minPriceFound,
          max: maxPriceFound,
        },
      },
    };
  } catch (error) {
    logger.error("searchDishesAndRestaurants failed:", { error: error.message, query });
    throw error;
  }
}

/**
 * Fast prefix/substring autocomplete suggestions for the search bar.
 * @param {string} query
 * @param {Object} options
 * @param {number} [options.limit=8]
 */
async function getSearchSuggestions(query = "", { limit = 8 } = {}) {
  try {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return { suggestions: [] };
    }

    // 1. Match Food Titles
    const matchingFoods = await prisma.food.findMany({
      where: {
        isAvailable: true,
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { category: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        thumbnailUrl: true,
        isVeg: true,
      },
      take: limit,
    });

    // 2. Match Restaurant Names
    const matchingRestaurants = await prisma.foodPartner.findMany({
      where: {
        restaurantName: { contains: trimmed, mode: "insensitive" },
      },
      select: {
        id: true,
        restaurantName: true,
        address: true,
      },
      take: 4,
    });

    // 3. Match Popular Categories
    const matchingCategories = POPULAR_CATEGORIES.filter(
      (c) => c.name.toLowerCase().includes(trimmed) || c.tag.toLowerCase().includes(trimmed),
    ).slice(0, 3);

    const suggestions = [];

    // Add category suggestions first
    for (const cat of matchingCategories) {
      suggestions.push({
        text: cat.name,
        type: "category",
        icon: cat.icon,
        payload: { category: cat.tag },
      });
    }

    // Add dish suggestions
    for (const food of matchingFoods) {
      suggestions.push({
        text: food.name,
        type: "dish",
        subtext: `in ${food.category} • ₹${food.price}`,
        isVeg: food.isVeg,
        payload: { foodId: food.id, category: food.category },
      });
    }

    // Add restaurant suggestions
    for (const rest of matchingRestaurants) {
      suggestions.push({
        text: rest.restaurantName,
        type: "restaurant",
        subtext: rest.address,
        payload: { restaurantId: rest.id },
      });
    }

    return {
      query: trimmed,
      suggestions: suggestions.slice(0, limit),
    };
  } catch (error) {
    logger.error("getSearchSuggestions failed:", { error: error.message, query });
    return { query, suggestions: [] };
  }
}

/**
 * Returns curated trending categories, popular keywords, and top-rated reels.
 */
async function getTrendingAndCategories() {
  try {
    // Top-viewed / most-liked food items
    const trendingDishes = await prisma.food.findMany({
      where: { isAvailable: true },
      include: {
        foodPartner: {
          select: {
            id: true,
            restaurantName: true,
            address: true,
          },
        },
      },
      orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
      take: 8,
    });

    const popularKeywords = [
      "Cheesy Pizza",
      "Chicken Biryani",
      "Paneer Tikka Roll",
      "Smash Burger",
      "Cold Coffee & Shakes",
      "Loaded Nachos",
      "Momos & Dumplings",
      "Chocolate Brownie",
    ];

    return {
      categories: POPULAR_CATEGORIES,
      popularKeywords,
      trendingDishes: trendingDishes.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        price: f.price,
        discountedPrice: f.discountedPrice,
        category: f.category,
        thumbnailUrl: f.thumbnailUrl,
        video: f.video,
        isVeg: f.isVeg,
        likeCount: f.likeCount,
        restaurantName: f.foodPartner?.restaurantName,
        restaurantId: f.foodPartner?.id,
      })),
    };
  } catch (error) {
    logger.error("getTrendingAndCategories failed:", { error: error.message });
    return {
      categories: POPULAR_CATEGORIES,
      popularKeywords: [],
      trendingDishes: [],
    };
  }
}

module.exports = {
  searchDishesAndRestaurants,
  getSearchSuggestions,
  getTrendingAndCategories,
  POPULAR_CATEGORIES,
};
