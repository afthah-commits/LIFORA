import sys
import yaml

def validate():
    with open('render.yaml', 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    print("YAML is well-formed.")
    
    # 1. Check databases section
    databases = data.get('databases', [])
    assert len(databases) == 1, f"Expected 1 database, found {len(databases)}"
    db = databases[0]
    assert db['name'] == 'lifora-db'
    assert db['databaseName'] == 'lifora_db'
    assert db['region'] == 'singapore'
    assert db['plan'] in ['free', 'starter']
    print(f"[OK] Database validated: {db['name']} (DB: {db['databaseName']}, Region: {db['region']}, Plan: {db['plan']})")

    # 2. Check services section
    services = data.get('services', [])
    assert len(services) == 2, f"Expected 2 services, found {len(services)}"

    # 2.1 Backend Web Service
    backend = next((s for s in services if s['name'] == 'lifora-backend'), None)
    assert backend is not None, "lifora-backend not found"
    assert backend['type'] == 'web', f"Expected backend type 'web', got {backend['type']}"
    assert backend['runtime'] == 'python', f"Expected runtime 'python', got {backend['runtime']}"
    assert 'pip install -r backend/requirements.txt' in backend['buildCommand']
    assert 'uvicorn backend.app.main:app' in backend['startCommand']
    assert 'python -m alembic upgrade head' in backend['preDeployCommand']
    print(f"[OK] Backend validated: {backend['name']} (type: {backend['type']}, runtime: {backend['runtime']})")

    # 2.2 Frontend Static Web Service (Render Official: type: web, runtime: static)
    frontend = next((s for s in services if s['name'] == 'lifora-frontend'), None)
    assert frontend is not None, "lifora-frontend not found"
    assert frontend['type'] == 'web', f"Expected frontend type 'web', got {frontend['type']}"
    assert frontend['runtime'] == 'static', f"Expected frontend runtime 'static', got {frontend['runtime']}"
    assert frontend['rootDir'] == 'frontend'
    assert 'npm run build' in frontend['buildCommand']
    assert frontend['staticPublishPath'] in ['dist', './dist']
    assert frontend['routes'][0]['type'] == 'rewrite'
    assert frontend['routes'][0]['source'] == '/*'
    assert frontend['routes'][0]['destination'] == '/index.html'
    print(f"[OK] Frontend validated: {frontend['name']} (type: {frontend['type']}, runtime: {frontend['runtime']}, publish: {frontend['staticPublishPath']})")

    print("\n[SUCCESS] Render Blueprint specification validation PASSED completely.")

if __name__ == '__main__':
    validate()
