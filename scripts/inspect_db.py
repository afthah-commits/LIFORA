import asyncio
from sqlalchemy import text
from backend.app.core.database import AsyncSessionLocal

async def inspect():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"))
        tables = [r[0] for r in res.fetchall()]
        print(f"Total tables found: {len(tables)}")
        for t in tables:
            c_res = await session.execute(text(f'SELECT COUNT(*) FROM "{t}";'))
            cnt = c_res.scalar()
            print(f"  - {t}: {cnt} rows")

if __name__ == "__main__":
    asyncio.run(inspect())
