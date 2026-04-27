package middleware

func TenantKey() string { return ctxTenant }
func SchemaKey() string  { return ctxSchema }
func ClaimsKey() string  { return ctxClaims }