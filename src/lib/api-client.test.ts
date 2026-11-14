import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet } from "./api-client";
import { fetchCategories, fetchProduct, fetchProducts } from "../features/menu/api";

describe("apiGet & menu api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("omits empty and undefined query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchProducts({ categoryId: 2, search: "   " });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("http://localhost:8000/api/v1/products?category_id=2");
    expect(options.headers).toMatchObject({ Accept: "application/json" });
  });

  it("unwraps data for categories and single product", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: 1, name: "Cơm" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 5,
            category_id: 1,
            name: "Cơm sườn",
            description: null,
            price: 45000,
            image_url: null,
            is_available: true,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const categories = await fetchCategories();
    const product = await fetchProduct(5);

    expect(categories).toEqual([{ id: 1, name: "Cơm" }]);
    expect(product.price).toBe(45000);
  });

  it("throws ApiError with status and message on non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: "Not found" }),
      }),
    );

    await expect(apiGet("/products/999")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Not found",
    });
  });

  it("throws ApiError with status 0 when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    try {
      await apiGet("/products");
      expect.unreachable("Expected apiGet to reject");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
    }
  });
});
