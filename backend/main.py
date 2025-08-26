# backend/main.py  — refactored & ready to paste

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from carweaver_client import CarWeaver
from gerrit_client import GerritClient
from artifactory_client import ArtifactoryClient
import json
import os
import requests
from typing import Any, Dict, List

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Local JSON profile storage
# ---------------------------
PROFILE_FILE = "profiles.json"


def load_profiles() -> List[Dict]:
    if not os.path.exists(PROFILE_FILE):
        return []
    with open(PROFILE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_profiles(profiles: List[Dict]) -> None:
    with open(PROFILE_FILE, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2, ensure_ascii=False)


def _index_by_id(profiles: List[Dict], sw_package_id) -> int:
    for i, p in enumerate(profiles):
        if str(p.get("sw_package_id")) == str(sw_package_id):
            return i
    return -1


# ---------------------------
# Profiles CRUD
# ---------------------------
@app.get("/api/profiles")
def get_profiles():
    return load_profiles()


@app.post("/api/profiles")
async def create_or_replace_profiles(request: Request):
    """
    Accepts EITHER:
      - a single profile object  -> upsert that one
      - a list of profiles       -> replace all (legacy support)
    """
    body = await request.json()

    if isinstance(body, list):
        save_profiles(body)
        return {"success": True, "mode": "replaced_all"}

    profile = body
    if "sw_package_id" not in profile:
        raise HTTPException(status_code=400, detail="sw_package_id is required")

    profiles = load_profiles()
    idx = _index_by_id(profiles, profile["sw_package_id"])
    if idx >= 0:
        profiles[idx] = profile
        save_profiles(profiles)
        return {"success": True, "mode": "updated"}
    else:
        profiles.append(profile)
        save_profiles(profiles)
        return {"success": True, "mode": "created"}


@app.put("/api/profiles/{sw_package_id}")
async def update_profile(sw_package_id: str, request: Request):
    incoming = await request.json()
    if "sw_package_id" not in incoming:
        incoming["sw_package_id"] = int(sw_package_id) if sw_package_id.isdigit() else sw_package_id

    profiles = load_profiles()
    idx = _index_by_id(profiles, sw_package_id)
    if idx >= 0:
        profiles[idx] = incoming
        save_profiles(profiles)
        return {"success": True, "mode": "updated"}
    else:
        profiles.append(incoming)
        save_profiles(profiles)
        return {"success": True, "mode": "created"}


@app.delete("/api/profiles/{sw_package_id}")
def delete_profile(sw_package_id: str):
    profiles = load_profiles()
    idx = _index_by_id(profiles, sw_package_id)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    profiles.pop(idx)
    save_profiles(profiles)
    return {"success": True, "mode": "deleted"}


# ---------------------------
# Helper utilities
# ---------------------------
def parse_sw_package_version(sw_version: str) -> str:
    """BSW_VCC_20.0.1 -> 20.0.1.0"""
    if not sw_version:
        return ""
    numeric = sw_version.split("_")[-1] if "_" in sw_version else sw_version
    return f"{numeric}.0"


def _release_from_sw_version(sw_version: str) -> str:
    """BSW_VCC_20.0.1 -> 20.0.1"""
    if not sw_version:
        return ""
    return sw_version.split("_")[-1] if "_" in sw_version else sw_version


def _fill_versions(obj: Any, sw_version: str) -> Any:
    """Recursively fill empty 'version' keys with sw_version."""
    if isinstance(obj, list):
        return [_fill_versions(x, sw_version) for x in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k == "version" and (v is None or v == ""):
                out[k] = sw_version
            else:
                out[k] = _fill_versions(v, sw_version)
        return out
    return obj


def _renumber_source_references(refs: List[Dict]) -> List[Dict]:
    return [{**r, "idx": i + 1} for i, r in enumerate(refs or [])]


def _resolve_gerrit_tag_url(project: str, tag: str, g: GerritClient) -> str:
    project = (project or "").strip()
    if not project:
        return ""
    try:
        url = g.get_tag_url_by_exact_name(project, tag)
        return url or project  # fall back to project string if tag not found
    except Exception:
        return project


# Map artifact menu names -> Artifactory AQL property sets
_ARTIFACT_MAP = {
    "SUM SWLM": {"props": lambda sw, rel: {"baseline.sw.version": sw, "type": "swlm"}},
    "SUM SWP1": {"props": lambda sw, rel: {"release": rel, "type": "swp1"}},
    "SUM SWP2": {"props": lambda sw, rel: {"release": rel, "type": "swp2"}},
    "SUM SWP4": {"props": lambda sw, rel: {"release": rel, "type": "swp4"}},
}


def _artifact_sha256_from_url(full_url: str, client: ArtifactoryClient) -> str:
    """
    Ask Artifactory storage API for checksums of a given full URL.
    """
    base = (client.BASE_URL or "").rstrip("/")
    if not base:
        return ""
    if not full_url.startswith(base + "/"):
        return ""

    rel = full_url[len(base) + 1 :]  # repo/path/name
    parts = rel.split("/")
    if len(parts) < 2:
        return ""

    repo, path = parts[0], "/".join(parts[1:])
    r = requests.get(f"{base}/api/storage/{repo}/{path}", headers={"Authorization": f"Bearer {client.token}"})
    if r.status_code // 100 != 2:
        return ""
    return (r.json().get("checksums") or {}).get("sha256", "") or ""


# ---------------------------
# CarWeaver bridge
# ---------------------------
@app.get("/api/carweaver/items/{item_id}")
def get_carweaver_item(item_id: str):
    cw = CarWeaver()
    # Ensure we pass only the raw ID to SystemWeaver
    raw_id = item_id.split("/")[-1]
    r = cw.get_item(raw_id)
    r.raise_for_status()
    data = r.json()
    return {
        "id": data.get("id") or raw_id,
        "persistent_id": data.get("persistent_id") or data.get("persistentId") or "",
        "version": str(data.get("version") or data.get("Version") or data.get("versionNumber") or ""),
    }


@app.get("/api/carweaver/source_components/{item_id:path}")
def get_source_components(item_id: str):
    """
    Accepts either a plain id (x040000000302858D) or a full SystemWeaver URL, e.g.:
    swap://SystemWeaver:3000/x040000000302858D  OR  url:swap://SystemWeaver:3000/x040...
    """
    cw = CarWeaver()
    cid, pid, ver = cw.source_components(item_id)
    return {"id": cid, "persistent_id": pid, "version": ver}


@app.get("/api/carweaver/generic_product_module/{item_id:path}")
def get_generic_product_module(item_id: str):
    """
    Returns the GPM id (from attributes) and the item's versionNumber (when available).
    Accepts either a plain id or a full SystemWeaver URL.
    """
    cw = CarWeaver()
    # GPM id (CarWeaver helper already handles url/id internally)
    gpm_id = cw.generic_product_module(item_id)

    # Try to read the item's version as well
    raw_id = item_id.split("/")[-1]
    ver = ""
    try:
        r = cw.get_item(raw_id)
        r.raise_for_status()
        data = r.json()
        ver = str(data.get("versionNumber") or data.get("version") or "")
    except Exception:
        ver = ""

    return {"id": gpm_id, "version": ver}


# ---------------------------
# Gerrit helper
# ---------------------------
@app.get("/api/gerrit/tag_url")
def get_gerrit_tag_url(project: str, tag: str):
    gc = GerritClient()
    url = gc.get_tag_url_by_exact_name(project, tag)
    if not url:
        raise HTTPException(status_code=404, detail="Tag URL not found")
    return {"url": url}


# ---------------------------
# Artifacts helper
# ---------------------------
@app.get("/api/artifacts/resolve")
def resolve_artifact(name: str, sw_version: str):
    """
    Example:
      GET /api/artifacts/resolve?name=SUM%20SWLM&sw_version=BSW_VCC_20.0.1

    Returns: { "location": "<download-url>", "sha256": "<sha256>" }
    """
    repo = os.getenv("ARTIFACTORY_REPO", "ARTBC-SUM-LTS")
    client = ArtifactoryClient(repo=repo)

    release = _release_from_sw_version(sw_version)
    if name not in _ARTIFACT_MAP:
        raise HTTPException(status_code=400, detail=f"Unknown artifact name: {name}")

    try:
        props = _ARTIFACT_MAP[name]["props"](sw_version, release)
        url = client.find_artifact_by_properties(props)
        sha = _artifact_sha256_from_url(url, client)
        return {"location": url, "sha256": sha}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------------------
# Generate (server-side)
# ---------------------------
@app.post("/api/generate/swlm")
def generate_swlm(payload: Dict[str, Any]):
    """
    Body:
      {
        "sw_package_id": <number|string>,
        "sw_version": "BSW_VCC_20.0.1"
      }

    Returns the final JSON with:
      - source_references[].location / additional_information[].location / change_log.location
        resolved to Gerrit tag URLs (using project name(s) stored in the profile)
      - artifacts resolved from Artifactory (location + sha256)
      - empty 'version' fields filled with sw_version
    """
    sw_package_id = payload.get("sw_package_id")
    sw_version = payload.get("sw_version")
    if not sw_package_id or not sw_version:
        raise HTTPException(status_code=400, detail="sw_package_id and sw_version are required")

    release = _release_from_sw_version(sw_version)

    # 1) Load profile by id
    profiles = load_profiles()
    match = next((p for p in profiles if str(p.get("sw_package_id")) == str(sw_package_id)), None)
    if not match:
        raise HTTPException(status_code=404, detail="Profile not found")

    # 2) Fill missing versions
    profile_filled = _fill_versions(match, sw_version)

    # 3) Resolve Gerrit URLs
    g = GerritClient()
    resolved_refs: List[Dict] = []
    for ref in profile_filled.get("source_references", []) or []:
        base_project = (ref.get("location") or "").strip()

        # ref location -> Gerrit tag URL
        ref_url = _resolve_gerrit_tag_url(base_project, sw_version, g)

        # additional_information: each may override project, else inherit
        ai_resolved = []
        for ai in ref.get("additional_information", []) or []:
            ai_project = (ai.get("location") or base_project or "").strip()
            ai_url = _resolve_gerrit_tag_url(ai_project, sw_version, g) if ai_project else ""
            ai_resolved.append({**ai, "location": ai_url})

        # change_log: may have its own project; if empty, fallback to base
        cl = ref.get("change_log") or {}
        cl_project = (cl.get("location") or base_project or "").strip()
        cl_url = _resolve_gerrit_tag_url(cl_project, sw_version, g) if cl_project else ""
        change_log = {
            "filenamn": cl.get("filenamn") or cl.get("filename") or "Gerrit log",
            "version": sw_version,  # release version
            "location": cl_url,
        }

        resolved_refs.append(
            {
                **ref,
                "location": ref_url,
                "additional_information": ai_resolved,
                "change_log": change_log,
                "components": ref.get("components") or [],
            }
        )

    resolved_refs = _renumber_source_references(resolved_refs)

    # 4) Resolve Artifacts (location + sha256) using mapping -> Artifactory
    af = ArtifactoryClient(repo=os.getenv("ARTIFACTORY_REPO", "ARTBC-SUM-LTS"))
    resolved_artifacts: List[Dict] = []
    for i, a in enumerate(profile_filled.get("artifacts", []) or []):
        name = (a.get("name") or "").strip()
        loc = ""
        sha = ""
        if name in _ARTIFACT_MAP:
            props = _ARTIFACT_MAP[name]["props"](sw_version, release)
            try:
                loc = af.find_artifact_by_properties(props)
                sha = _artifact_sha256_from_url(loc, af)
            except Exception as e:
                # keep loc/sha empty on failure but continue
                print(f"[artifacts] {name}: {e}")

        resolved_artifacts.append(
            {
                "idx": i + 1,
                "name": name,
                "kind": "VBF file",
                "version": sw_version,  # release version on artifacts
                "location": loc,
                "sha256": sha,
                "target_platform": "SUM1",
                "buildtime_configurations": [{"cp": "VCTN", "cpv": ["PRR"]}],
                "source_references_idx": sorted(a.get("source_references_idx") or []),
            }
        )

    # 5) Assemble result
    result = {
        "sw_package_id": match.get("sw_package_id"),
        "sw_package_version": parse_sw_package_version(sw_version),
        "sw_package_type": match.get("sw_package_type") or "standard",
        "generic_product_module": profile_filled.get("generic_product_module") or {},
        "source_references": resolved_refs,
        "swad": profile_filled.get("swad") or [],
        "swdd": profile_filled.get("swdd") or [],
        "artifacts": resolved_artifacts,
        "sw_version": sw_version,
    }
    return result


# ---------------------------
# Root
# ---------------------------
@app.get("/")
def root():
    return {
        "msg": "Backend running.",
        "generate": "POST /api/generate/swlm with { sw_package_id, sw_version }",
        "helpers": [
            "GET /api/gerrit/tag_url?project=...&tag=...",
            "GET /api/artifacts/resolve?name=SUM%20SWLM&sw_version=BSW_VCC_20.0.1",
            "GET /api/carweaver/generic_product_module/{item_id}",
            "GET /api/carweaver/source_components/{item_id}",
        ],
    }
