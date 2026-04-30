-- Shared functions used by all tenant schemas
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Public tenants registry
CREATE TABLE IF NOT EXISTS public.tenants (
                                              id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT        NOT NULL UNIQUE,
    display_name TEXT        NOT NULL,
    schema_name  TEXT        NOT NULL UNIQUE,
    is_active    BOOLEAN     NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_tenants_slug   ON public.tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON public.tenants (is_active);