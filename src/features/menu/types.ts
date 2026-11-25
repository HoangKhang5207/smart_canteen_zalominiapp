export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  stock_quantity?: number | null;
  low_stock_threshold?: number;
  is_in_stock?: boolean;
}
