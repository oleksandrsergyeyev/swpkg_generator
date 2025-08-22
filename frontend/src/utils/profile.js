export function renumberSourceReferences(refs = []) {
  return (refs || []).map((r, i) => ({ ...r, idx: i + 1 }));
}

export function orderProfileForDisplay(p = {}) {
  return {
    sw_package_id: p.sw_package_id ?? "",
    profile_name: p.profile_name ?? "",
    generic_product_module: p.generic_product_module ?? {
      location: "",
      id: "",
      version: "",
    },
    source_references: Array.isArray(p.source_references)
      ? p.source_references
      : [],
    swad: Array.isArray(p.swad) ? p.swad : [],
    swdd: Array.isArray(p.swdd) ? p.swdd : [],
    artifacts: Array.isArray(p.artifacts) ? p.artifacts : [],
  };
}

// Order helper for the Generated JSON panel (purely for display)
export function orderGeneratedForDisplay(obj = {}) {
  const {
    sw_package_id,
    sw_package_version,
    sw_package_type,
    generic_product_module,
    source_references,
    swad,
    swdd,
    artifacts,
    sw_version,
    ...rest
  } = obj;

  const ordered = {
    sw_package_id,
    ...(sw_package_version !== undefined && { sw_package_version }),
    ...(sw_package_type !== undefined && { sw_package_type }),
    generic_product_module,
    source_references,
    swad,
    swdd,
    artifacts,
    ...(sw_version !== undefined && { sw_version }),
  };

  return { ...ordered, ...rest };
}

export function fillVersionFields(obj, sw_version) {
  if (Array.isArray(obj)) {
    return obj.map((item) => fillVersionFields(item, sw_version));
  } else if (obj && typeof obj === "object") {
    const newObj = { ...obj };
    for (const key of Object.keys(newObj)) {
      if (key === "version" && (!newObj[key] || newObj[key] === "")) {
        newObj[key] = sw_version;
      } else {
        newObj[key] = fillVersionFields(newObj[key], sw_version);
      }
    }
    return newObj;
  }
  return obj;
}
