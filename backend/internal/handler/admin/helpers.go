package admin

import (
	"fmt"
	"regexp"
)

var reAdminSchema = regexp.MustCompile(`^[a-z0-9_]+$`)

func safeSchema(slug string) (string, error) {
	if !reAdminSchema.MatchString(slug) {
		return "", fmt.Errorf("invalid schema: %s", slug)
	}
	return "tenant_" + slug, nil
}
