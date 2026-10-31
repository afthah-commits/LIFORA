DO $$
DECLARE
    r RECORD;
    cnt INT;
BEGIN
    FOR r IN (SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name) LOOP
        EXECUTE 'SELECT count(*) FROM ' || quote_ident(r.table_name) INTO cnt;
        RAISE NOTICE '%: % rows', r.table_name, cnt;
    END LOOP;
END $$;
