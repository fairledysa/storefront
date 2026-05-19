// FILE: apps/storefront/src/themes/malak/screens/home/_components/ProductsSlider.tsx

"use client";

import React, {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";

import Icon from "@/components/icon/Icon";
import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";
import ProductCard from "@/themes/malak/components/product-card/ProductCard";

import "swiper/css";
import "swiper/css/navigation";

type IconName = ComponentProps<typeof Icon>["icon"];

type ProductsSliderProps = {
  title?: string;
  viewAllText?: string;
  viewAllHref?: string;
  products?: any[];
  showHeader?: boolean;
  showEmpty?: boolean;
  data?: any;
  currencies?: any;
  tax?: any;
};

const ICONS: {
  chevronLeft: IconName;
  chevronRight: IconName;
} = {
  chevronLeft: "ArrowLeft01" as IconName,
  chevronRight: "ArrowRight01" as IconName,
};

function s(value: any) {
  return String(value ?? "").trim();
}

function getProductHref(product: any) {
  return (
    s(product?.href) ||
    s(product?.url) ||
    s(product?.permalink) ||
    s(product?.link) ||
    ""
  );
}

function resolveCurrenciesFromData(data: any) {
  return (
    data?.bootstrap?.currencies ||
    data?.currencies ||
    data?.store?.currencies ||
    data?.theme?.currencies ||
    data?.settings?.currencies ||
    null
  );
}

function resolveTaxFromData(data: any) {
  return (
    data?.bootstrap?.tax ||
    data?.tax ||
    data?.store?.tax ||
    data?.theme?.tax ||
    data?.settings?.tax ||
    data?.tax_settings ||
    data?.taxSettings ||
    null
  );
}

function normalizeProductCard(args: {
  product: any;
  currencies?: any;
  tax?: any;
}): ProductCardVM | null {
  const product = args.product;
  if (!product) return null;

  const href = getProductHref(product);

  const vm = toProductCardVM({
    storeSlug: "",
    currencies: args.currencies,
    tax: args.tax,
    product: {
      ...product,
      href: href || product?.href,
      showDashInstead: true,
    },
  });

  if (!vm.id && !vm.title) return null;

  return vm;
}

function isCartClickTarget(target: EventTarget | null) {
  const el = target instanceof Element ? target : null;
  if (!el) return false;

  return Boolean(
    el.closest(
      ".mkpc-cart-inline, .mkpc-action--cart, [data-mk-cart-product-id]",
    ),
  );
}

function dispatchAddToCart(product: ProductCardVM) {
  const raw = product.raw ?? {};

  window.dispatchEvent(
    new CustomEvent("product:add-to-cart", {
      detail: {
        ...raw,
        ...product,
        id: product.id,
        product_id: raw.product_id || raw.productId || raw.id || product.id,
        productId: raw.productId || raw.product_id || raw.id || product.id,
        title: product.title,
        name: product.title,
        imageUrl: product.imageUrl,
        image_url: product.imageUrl,
        price: product.price,
        basePrice: product.basePrice,
        currency: product.currency,
        currency_code: product.currency_code,
        currencyCode: product.currencyCode,
        currency_symbol: product.currency_symbol,
        currencySymbol: product.currencySymbol,
        tax: product.tax,
        qty: 1,
        quickView: false,
      },
    }),
  );
}

export default function ProductsSlider({
  title = "",
  viewAllText = "",
  viewAllHref = "#",
  products: inputProducts,
  showHeader = true,
  showEmpty = false,
  data,
  currencies,
  tax,
}: ProductsSliderProps) {
  const resolvedCurrencies = useMemo(() => {
    return currencies || resolveCurrenciesFromData(data);
  }, [currencies, data]);

  const resolvedTax = useMemo(() => {
    return tax || resolveTaxFromData(data);
  }, [tax, data]);

  const products = useMemo<ProductCardVM[]>(() => {
    if (!Array.isArray(inputProducts)) return [];

    return inputProducts
      .map((product) =>
        normalizeProductCard({
          product,
          currencies: resolvedCurrencies,
          tax: resolvedTax,
        }),
      )
      .filter(Boolean) as ProductCardVM[];
  }, [inputProducts, resolvedCurrencies, resolvedTax]);

  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);

  useEffect(() => {
    if (!swiper) return;
    if (!prevRef.current || !nextRef.current) return;
    if (!swiper.navigation) return;

    swiper.params.navigation = {
      ...(swiper.params.navigation as any),
      prevEl: prevRef.current,
      nextEl: nextRef.current,
      disabledClass: "mk-ps-nav-disabled",
    };

    swiper.navigation.destroy();
    swiper.navigation.init();
    swiper.navigation.update();
  }, [swiper, products.length]);

  if (!products.length && !showEmpty) return null;

  return (
    <section className="mk-products-slider" dir="rtl">
      {showHeader && (s(title) || s(viewAllText)) ? (
        <div className="mk-ps-head">
          <div className="mk-ps-title-wrap">
            {title ? <h3 className="mk-ps-title">{title}</h3> : null}
          </div>

          {viewAllText ? (
            <a className="mk-ps-viewall" href={viewAllHref || "#"}>
              <span>{viewAllText}</span>
              <Icon icon={ICONS.chevronLeft} size={15} />
            </a>
          ) : null}
        </div>
      ) : null}

      {products.length ? (
        <div className="mk-ps-shell">
          <button
            ref={prevRef}
            className="mk-ps-nav mk-ps-prev"
            aria-label="السابق"
            type="button"
          >
            <span className="mk-ps-nav-pill">
              <Icon icon={ICONS.chevronRight} size={19} />
            </span>
          </button>

          <button
            ref={nextRef}
            className="mk-ps-nav mk-ps-next"
            aria-label="التالي"
            type="button"
          >
            <span className="mk-ps-nav-pill">
              <Icon icon={ICONS.chevronLeft} size={19} />
            </span>
          </button>

          <div className="mk-ps-wrap">
            <Swiper
              modules={[Navigation]}
              onSwiper={setSwiper}
              spaceBetween={0}
              slidesPerView="auto"
              speed={420}
              className="mk-ps-swiper"
              dir="rtl"
              watchOverflow
              slidesOffsetBefore={0}
              slidesOffsetAfter={0}
              breakpoints={{
                0: {
                  spaceBetween: 10,
                  slidesOffsetBefore: 0,
                  slidesOffsetAfter: 0,
                },
                640: {
                  spaceBetween: 10,
                  slidesOffsetBefore: 0,
                  slidesOffsetAfter: 0,
                },
                1024: {
                  spaceBetween: 12,
                  slidesOffsetBefore: 0,
                  slidesOffsetAfter: 0,
                },
                1280: {
                  spaceBetween: 12,
                  slidesOffsetBefore: 0,
                  slidesOffsetAfter: 0,
                },
              }}
            >
              {products.map((product, index) => {
                const productId = s(product.id);

                return (
                  <SwiperSlide
                    key={`${productId || "product"}-${index}`}
                    className="mk-ps-slide"
                  >
                    <div
                      className="mk-ps-card-runtime"
                      data-mk-product-card-id={productId}
                      onClickCapture={(event) => {
                        if (!isCartClickTarget(event.target)) return;

                        event.preventDefault();
                        event.stopPropagation();
                        dispatchAddToCart(product);
                      }}
                    >
                      <ProductCard item={product as any} />
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        </div>
      ) : (
        <div className="mk-ps-empty">لا توجد منتجات لعرضها حالياً</div>
      )}
    </section>
  );
}