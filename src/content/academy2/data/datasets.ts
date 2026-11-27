import irisRecords from "../p1/data/iris.json";
import type { Table } from "../../../grading/academy2/data/table";

export const irisTable: Table = {
  columns: [
    "sepal_length",
    "sepal_width",
    "petal_length",
    "petal_width",
    "species",
  ],
  rows: irisRecords,
};
export const irisSource = "https://archive.ics.uci.edu/dataset/53/iris";
export const irisDimensions = [
  "sepal_length",
  "sepal_width",
  "petal_length",
  "petal_width",
] as const;

/** R datasets::airquality, New York daily observations May–September 1973. */
import airRecords from "./air-quality.json";
export const airTable: Table = {
  columns: ["ozone", "solar_r", "wind", "temp", "month", "day"],
  rows: airRecords,
};
export const airSource =
  "https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/airquality.html";
