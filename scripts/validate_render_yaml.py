import sys
import yaml

def validate():
    with open('render.yaml', 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    print("YAML is well-formed.")
    
    # Check databases
    databases = data.get('databases', [])
    assert len(databases) == 1, f"Expected 1 database, found {len(databases)}"
    db = databases[0]
    assert db['name'] == 'lifora-db'
    assert db['databaseName'] == 'lifora_db'
    assert db['region'] == 'singapore'
    assert db['plan'] in ['free', 'starter']
    print(f"[OK] Database validated: {db['name']} ({db['region']}, plan: {db['plan']})")

    # Check services
    services = data.get('services', [])
    assert len(services) == 2, f"Expected 2 services, found {len(services)}"

    # 1. Backend
    backend = next((s for s in services if s['name'] == 'lifora-backend'), None)
    assert backend is not None, "lifora-backend not found"
    assert backend['type'] == 'web', f"Expected type 'web', got {backend['type']}"
    assert backend['runtime'] == 'python', f"Expected runtime 'python', got {backend['runtime']}"
    assert 'pip install -r backend/requirements.txt' in backend['buildCommand']
    assert 'uvicorn backend.app.main:app' in backend['startCommand']
    assert 'python -m alembic upgrade head' in backend['preDeployCommand']
    print(f"[OK] Backend validated: {backend['name']} (type: {backend['type']}, runtime: {backend['runtime']})")

    # 2. Frontend
    frontend = next((s for s in services if s['name'] == 'lifora-frontend'), None)
    assert frontend is not None, "lifora-frontend not found"
    assert frontend['type'] == 'static', f"Expected type 'static', got {frontend['type']}"
    assert frontend['rootDir'] == 'frontend'
    assert 'npm run build' in frontend['buildCommand']
    assert frontend['staticPublishPath'] == 'dist'
    assert frontend['routes'][0]['type'] == 'rewrite'
    assert frontend['routes'][0]['source'] == '/*'
    assert frontend['routes'][0]['destination'] == '/index.html'
    print(f"[OK] Frontend validated: {frontend['name']} (type: {frontend['type']}, publish: {frontend['staticPublishPath']})")

    print("\n[SUCCESS] Render Blueprint specification validation PASSED completely.")

if __name__ == '__main__':
    validate()
