// Defaults and helpers
export const DEFAULT_CATEGORY = "design";
export const DEFAULT_KIND = "Simulink";
export const DEFAULT_CONTENT_TYPE = "application/model";
export const DEFAULT_REG_REQ = "N/A";
export const DEFAULT_FILENAMN = "Gerrit log";
export const DEFAULT_TARGET_PLATFORM = "SUM1";
export const DEFAULT_CP = "VCTN";
export const DEFAULT_CPV = "PRR";

// Keep fields in desired order
export const EMPTY_PROFILE = () => ({
  sw_package_id: "",
  profile_name: "",
  generic_product_module: { location: "", id: "", version: "" },
  source_references: [],
  swad: [],
  swdd: [],
  artifacts: [],
});
