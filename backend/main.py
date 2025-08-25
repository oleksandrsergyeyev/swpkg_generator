from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from carweaver_client import CarWeaver
from gerrit_client import GerritClient
from artifactory_client import ArtifactoryClient
import json
import os

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

PROFILE_FILE = "profiles.json"

# --- PROFILE STORAGE UTILS ---
def load_profiles():
    if not os.path.exists(PROFILE_FILE):
        return []
    with open(PROFILE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_profiles(profiles):
    with open(PROFILE_FILE, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2, ensure_ascii=False)

def _index_by_id(profiles, sw_package_id):
    for i, p in enumerate(profiles):
        if str(p.get("sw_package_id")) == str(sw_package_id):
            return i
    return -1

# --- PROFILE API ENDPOINTS (CRUD) ---

@app.get("/api/profiles")
def get_profiles():
    return load_profiles()

@app.post("/api/profiles")
async def create_or_replace_profiles(request: Request):
    """
    Accepts EITHER:
      - a single profile object  -> upsert that one
      - a list of profiles       -> replace all (back-compat with older UI)
    """
    body = await request.json()
    # If body is a list, replace entire set (legacy behavior)
    if isinstance(body, list):
        save_profiles(body)
        return {"success": True, "mode": "replaced_all"}

    # Else treat as single profile upsert
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
    """
    Updates (or creates) a single profile by sw_package_id.
    """
    incoming = await request.json()
    if "sw_package_id" not in incoming:
        # normalize type to match your frontend (numbers allowed)
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

# --- GENERATION ENDPOINT (dummy data) ---

def parse_sw_package_version(sw_version):
    if not sw_version:
        return ""
    if "_" in sw_version:
        numeric = sw_version.split("_")[-1]
    else:
        numeric = sw_version
    return f"{numeric}.0"

def fetch_generic_product_module(sw_package_id):
    return {
        "id": "GPM-2",
        "version": "12",
        "location": "url:to_car_weaver"
    }

def fetch_source_references(sw_package_id, sw_version):
    refs = []
    for idx, title in enumerate([
        "SumModMgr", "ShrdSrvQM", "AirPMngt", "LvlCtrlMod", "AirSuspCptDiagc", "MonrVehLvl", "AirSprgVolMngt"
    ], start=1):
        refs.append({
            "idx": idx,
            "name": "Air Suspension Controller" if idx < 7 else "Spring Stiffness Controller",
            "version": sw_version,
            "location": "https://gerrit_link",
            "components": [{
                "id": "C-9872" if idx < 7 else "C-9874",
                "persistent_id": "C-23434" if idx < 7 else "C-21248",
                "version": "18" if idx < 7 else "10",
                "location": "url:to_car_weaver"
            }],
            "additional_information": [
                {
                    "title": title,
                    "category": "design",
                    "kind": "Simulink",
                    "content_type": "application/model",
                    "location": "https://gerrit_link"
                },
                {
                    "title": title,
                    "category": "design",
                    "kind": "Generated Code",
                    "content_type": "application/source code",
                    "location": "https://gerrit_link"
                }
            ],
            "regulatory_requirements": ["N/A"],
            "change_log": {
                "filenamn": "Gerrit log",
                "version": sw_version,
                "location": "https://gerrit_link"
            }
        })
    return refs

def fetch_swad():
    return [
        {
            "id": "2470c472247fec08a3c12c20829070745f20cc4d",
            "name": "SWAD suspension",
            "location": "https://gerrit_link"
        }
    ]

def fetch_swdd():
    return [
        {
            "id": "34176208",
            "name": "NOTE-SWDD-34176208-01/10-SUM Functions",
            "location": "https://gerrit_link"
        }
    ]

def fetch_artifacts(sw_version):
    return [
        {
            "idx": 1,
            "name": "SUM SWLM",
            "kind": "VBF file",
            "version": sw_version,
            "location": "https://gerrit_link",
            "sha256": "902df162cb5ae40875488e2319862b4cdaa4948567c4f83dbd4c2e56be950d5a",
            "target_platform": "SUM1",
            "buildtime_configurations": [
                {
                    "cp": "VCTN",
                    "cpv": ["PRR"]
                }
            ],
            "source_references_idx": [1, 2, 3, 4, 5, 6, 7]
        },
        {
            "idx": 2,
            "name": "SUM SWP1",
            "kind": "VBF file",
            "version": f"{sw_version}_v2.0",
            "location": "https://gerrit_link",
            "sha256": "686d6c471d2d3747dba01d5c0bd746c265bd379d3967898ed84c49c4837e1d2c",
            "target_platform": "SUM1",
            "buildtime_configurations": [
                {
                    "cp": "VCTN",
                    "cpv": ["PRR"]
                }
            ],
            "source_references_idx": [1, 2]
        },
        {
            "idx": 3,
            "name": "SUM SWP2",
            "kind": "VBF file",
            "version": f"{sw_version}_v1.0",
            "location": "https://gerrit_link",
            "sha256": "69850200c276f38f8f4cb8a0aceb6f1d73dc1d4e0ba8d3bf1f7620f9e72fa7d2",
            "target_platform": "SUM1",
            "buildtime_configurations": [
                {
                    "cp": "VCTN",
                    "cpv": ["PRR"]
                }
            ],
            "source_references_idx": [6]
        },
        {
            "idx": 4,
            "name": "SUM SWP4",
            "kind": "VBF file",
            "version": f"{sw_version}_v2.0",
            "location": "https://gerrit_link",
            "sha256": "72782ad70dceb3146cbcd88d28fc0c7aeccae7b0b641f5fd59f29fd5b2a38022",
            "target_platform": "SUM1",
            "buildtime_configurations": [
                {
                    "cp": "VCTN",
                    "cpv": ["PRR"]
                }
            ],
            "source_references_idx": [3, 4, 5, 7]
        }
    ]

@app.post("/api/generate")
async def generate(data: dict):
    sw_package_id = data.get("sw_package_id")
    sw_version_input = data.get("sw_version")
    sw_package_version = parse_sw_package_version(sw_version_input)
    result = {
        "sw_package_id": sw_package_id,
        "sw_package_version": sw_package_version,
        "sw_package_type": "standard",
        "generic_product_module": fetch_generic_product_module(sw_package_id),
        "source_references": fetch_source_references(sw_package_id, sw_version_input),
        "swad": fetch_swad(),
        "swdd": fetch_swdd(),
        "artifacts": fetch_artifacts(sw_version_input)
    }
    return result

@app.get("/")
def root():
    return {"msg": "Backend running. POST to /api/generate with sw_package_id and sw_version (like 'BSW_VCC_20.0.1')."}

# --- CARWEAVER BRIDGE ENDPOINTS ---

@app.get("/api/carweaver/items/{item_id}")
def get_carweaver_item(item_id: str):
    cw = CarWeaver()
    r = cw.get_item(item_id)
    r.raise_for_status()
    data = r.json()
    # map backend fields into the ones the UI expects:
    return {
        "id": data.get("id") or item_id,
        "persistent_id": data.get("persistent_id") or data.get("persistentId") or "",
        "version": str(data.get("version") or data.get("Version") or ""),
    }

@app.get("/api/carweaver/source_components/{item_id:path}")
def get_source_components(item_id: str):
    """
    Accepts either a plain item id (e.g., x040000000302858D) or a full SystemWeaver URL like:
    'swap://SystemWeaver:3000/x040000000302858D' or 'url:swap://SystemWeaver:3000/x040...'
    """
    cw = CarWeaver()
    cid, pid, ver = cw.source_components(item_id)
    return {"id": cid, "persistent_id": pid, "version": ver}

@app.get("/api/carweaver/generic_product_module/{item_id:path}")
def get_generic_product_module(item_id: str):
    """
    Accepts either a plain item id (e.g., x040000000302858D) or a full SystemWeaver URL like:
    'swap://SystemWeaver:3000/x040000000302858D' or 'url:swap://SystemWeaver:3000/x040...'
    """
    cw = CarWeaver()
    gpm, ver = cw.generic_product_module(item_id)
    print(gpm, ver)
    return {"id": gpm, "version": ver}

@app.get("/api/gerrit/tag_url")
def get_gerrit_tag_url(project: str, tag: str):
    gc = GerritClient()
    url = gc.get_tag_url_by_exact_name(project, tag)
    if not url:
        raise HTTPException(status_code=404, detail="Tag URL not found")
    return {"url": url}

@app.get("/api/artifacts/resolve")
def resolve_artifact(name: str, sw_version: str):
    """
    Example:
      GET /api/artifacts/resolve?name=SUM%20SWLM&sw_version=BSW_VCC_20.0.1
    Returns: { "location": "<download-url>", "sha256": "<sha256>" }
    """
    try:
        repo = os.getenv("ARTIFACTORY_REPO", "ARTBC-SUM-LTS")
        client = ArtifactoryClient(repo=repo)

        url = client.resolve_url_via_mapping(name=name, sw_version=sw_version)
        sha = client.sha256_for_url(url)

        return {"location": url, "sha256": sha}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))