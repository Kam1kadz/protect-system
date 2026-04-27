package public

import (
	"fmt"
	"regexp"
)

var rePublicSchema = regexp.MustCompile(`^[a-z0-9_]+$`)

func safeSchema(slug string) (string, error) {
	if !rePublicSchema.MatchString(slug) {
		return "", fmt.Errorf("invalid schema: %s", slug)
	}
	return slug, nil
}
