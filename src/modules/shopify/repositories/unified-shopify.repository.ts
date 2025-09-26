import { PrismaClient } from "@prisma/client";
import { StoresRepository } from "./domain/stores.repository";
import { OrdersRepository } from "./domain/orders.repository";
import { ProductsRepository } from "./domain/products.repository";
import { CollectionsRepository } from "./domain/collections.repository";

/**
 * Unified repository that composes all domain-specific repositories
 * Provides the same interface as the original ShopifyRepository
 * but with better organization and maintainability
 */
export class UnifiedShopifyRepository {
  private storesRepo: StoresRepository;
  private ordersRepo: OrdersRepository;
  private productsRepo: ProductsRepository;
  private collectionsRepo: CollectionsRepository;

  constructor(private prisma: PrismaClient) {
    this.storesRepo = new StoresRepository(prisma);
    this.ordersRepo = new OrdersRepository(prisma);
    this.productsRepo = new ProductsRepository(prisma);
    this.collectionsRepo = new CollectionsRepository(prisma);
  }

  // Store methods
  async findStoreById(id: string) {
    return this.storesRepo.findStoreById(id);
  }

  async findStoreByDomain(shopDomain: string) {
    return this.storesRepo.findStoreByDomain(shopDomain);
  }

  async updateStoreLastSync(storeId: string) {
    return this.storesRepo.updateStoreLastSync(storeId);
  }

  async createStore(storeData: any) {
    return this.storesRepo.createStore(storeData);
  }

  // Order methods
  async findOrdersWithPagination(options: any) {
    return this.ordersRepo.findOrdersWithPagination(options);
  }

  async countOrders() {
    return this.ordersRepo.countOrders();
  }

  async findOrderByShopifyId(shopifyOrderId: string) {
    return this.ordersRepo.findOrderByShopifyId(shopifyOrderId);
  }

  async createOrder(orderData: any) {
    return this.ordersRepo.createOrder(orderData);
  }

  async updateOrder(shopifyOrderId: string, orderData: any) {
    return this.ordersRepo.updateOrder(shopifyOrderId, orderData);
  }

  async createLineItem(lineItemData: any) {
    return this.ordersRepo.createLineItem(lineItemData);
  }

  async findLineItemsByOrderId(orderId: string) {
    return this.ordersRepo.findLineItemsByOrderId(orderId);
  }

  async deleteLineItemsByOrderId(orderId: string) {
    return this.ordersRepo.deleteLineItemsByOrderId(orderId);
  }

  async createLineItems(lineItems: any[]) {
    return this.ordersRepo.createLineItems(lineItems);
  }

  // Product methods
  async findProductsWithPagination(options: any) {
    return this.productsRepo.findProductsWithPagination(options);
  }

  async countProducts() {
    return this.productsRepo.countProducts();
  }

  async findVariantsWithPagination(options: any) {
    return this.productsRepo.findVariantsWithPagination(options);
  }

  async countVariants() {
    return this.productsRepo.countVariants();
  }

  async findProductByShopifyId(shopifyProductId: string) {
    return this.productsRepo.findProductByShopifyId(shopifyProductId);
  }

  async createProduct(productData: any) {
    return this.productsRepo.createProduct(productData);
  }

  async updateProduct(shopifyProductId: string, productData: any) {
    return this.productsRepo.updateProduct(shopifyProductId, productData);
  }

  async findVariantByShopifyId(shopifyVariantId: string) {
    return this.productsRepo.findVariantByShopifyId(shopifyVariantId);
  }

  async createVariant(variantData: any) {
    return this.productsRepo.createVariant(variantData);
  }

  async updateVariant(shopifyVariantId: string, variantData: any) {
    return this.productsRepo.updateVariant(shopifyVariantId, variantData);
  }

  async deleteVariantsByProductId(productId: string) {
    return this.productsRepo.deleteVariantsByProductId(productId);
  }

  async createProductCollection(productId: string, collectionId: string) {
    return this.productsRepo.createProductCollection(productId, collectionId);
  }

  async deleteProductCollectionsByProductId(productId: string) {
    return this.productsRepo.deleteProductCollectionsByProductId(productId);
  }

  async findProductCollections(productId: string) {
    return this.productsRepo.findProductCollections(productId);
  }

  // Collection methods
  async findCollectionsWithPagination(options: any) {
    return this.collectionsRepo.findCollectionsWithPagination(options);
  }

  async countCollections() {
    return this.collectionsRepo.countCollections();
  }

  async findCollectionByShopifyId(shopifyCollectionId: string) {
    return this.collectionsRepo.findCollectionByShopifyId(shopifyCollectionId);
  }

  async createCollection(collectionData: any) {
    return this.collectionsRepo.createCollection(collectionData);
  }

  async updateCollection(shopifyCollectionId: string, collectionData: any) {
    return this.collectionsRepo.updateCollection(shopifyCollectionId, collectionData);
  }
}