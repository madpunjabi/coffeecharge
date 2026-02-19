#!/usr/bin/env bash
# scripts/overture-extract.sh
# Queries Overture Maps S3 directly via DuckDB. Run once locally.
# Prerequisite: brew install duckdb
# Output: scripts/output/overture-us-pois.parquet (~200–500MB)
# Runtime: 10–30 minutes (downloads from S3)

set -e

mkdir -p "$(dirname "$0")/output"

duckdb -c "
INSTALL spatial;
LOAD spatial;
COPY (
  SELECT
    id,
    names.primary AS name,
    categories.primary AS category,
    ST_X(ST_GeomFromWKB(geometry)) AS lng,
    ST_Y(ST_GeomFromWKB(geometry)) AS lat,
    sources[1].record_id AS source_id,
    opening_hours,
    CASE
      WHEN names.primary ILIKE '%starbucks%' THEN 'Starbucks'
      WHEN names.primary ILIKE '%mcdonald%' THEN 'McDonald''s'
      WHEN names.primary ILIKE '%panera%' THEN 'Panera'
      WHEN names.primary ILIKE '%target%' THEN 'Target'
      WHEN names.primary ILIKE '%walmart%' THEN 'Walmart'
      WHEN names.primary ILIKE '%whole foods%' THEN 'Whole Foods'
      ELSE names.primary
    END AS brand
  FROM read_parquet('s3://overturemaps-us-west-2/release/2025-Q4/theme=places/type=place/*',
    filename=true, hive_partitioning=1)
  WHERE bbox.minx > -125.0 AND bbox.maxx < -66.0
    AND bbox.miny > 24.0  AND bbox.maxy < 50.0
    AND categories.primary IN (
      'coffee_shop', 'fast_food', 'restaurant', 'grocery', 'department_store',
      'shopping_mall', 'convenience_store', 'gas_station'
    )
) TO '$(dirname "$0")/output/overture-us-pois.parquet' (FORMAT PARQUET);
"

echo "Done. Output: scripts/output/overture-us-pois.parquet"
