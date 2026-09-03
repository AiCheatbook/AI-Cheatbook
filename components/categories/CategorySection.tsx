"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CategoryData = {
  name: string;
  count: number;
};

export default function CategorySection() {
  const [categoryData, setCategoryData] = useState<
    CategoryData[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      setLoading(true);

      const { data, error } = await supabase
        .from("library_items")
        .select("category");

      if (error) {
        console.error(
          "Failed to load categories:",
          error
        );

        setCategoryData([]);
        setLoading(false);

        return;
      }

      const categoryCounts = new Map<string, number>();

      (data || []).forEach((item) => {
        if (!item.category) {
          return;
        }

        const category = item.category.trim();

        if (!category) {
          return;
        }

        categoryCounts.set(
          category,
          (categoryCounts.get(category) || 0) + 1
        );
      });

      const categories = Array.from(
        categoryCounts.entries()
      )
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      setCategoryData(categories);
      setLoading(false);
    }

    loadCategories();
  }, []);

  return (
    <section className="bg-black px-6 py-12 sm:py-14">
      <div className="mx-auto max-w-6xl">

        {/* Header */}

        <div className="mb-7">

          <p className="text-sm font-semibold uppercase tracking-wider text-brand-text">
            Explore the Library
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Browse by Category
          </h2>

          <p className="mt-2 max-w-2xl text-zinc-600">
            Find prompts organized by the type of
            content you want to create.
          </p>

        </div>

        {/* Loading */}

        {loading && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">

            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="aspect-[4/5] animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
                />
              )
            )}

          </div>
        )}

        {/* Categories */}

        {!loading && categoryData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">

            {categoryData.map((category) => (
              <Link
                key={category.name}
                href={`/search?category=${encodeURIComponent(
                  category.name
                )}`}
                className="group flex aspect-[4/5] flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition duration-300 hover:-translate-y-1 hover:border-brand hover:bg-zinc-800"
              >

                {/* Top */}

                <div className="flex items-start justify-between gap-3">

                  <h3 className="font-semibold text-white transition group-hover:text-brand-text">
                    {category.name}
                  </h3>

                  <span className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 transition group-hover:bg-brand/20 group-hover:text-brand-text">
                    {category.count}
                  </span>

                </div>

                {/* Bottom */}

                <p className="text-sm text-zinc-600 transition group-hover:text-zinc-600">
                  Explore prompts →
                </p>

              </Link>
            ))}

          </div>
        )}

        {/* Empty State */}

        {!loading && categoryData.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-zinc-600">
              No categories available yet.
            </p>
          </div>
        )}

      </div>
    </section>
  );
}