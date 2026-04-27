package service

import (
	"fmt"
	"regexp"
)

var reServiceSchema = regexp.MustCompile(`^[a-z0-9_]+$`)

func safeSchemaValidate(slug string) (string, error) {
	if !reServiceSchema.MatchString(slug) {
		return "", fmt.Errorf("invalid schema: %s", slug)
	}
	return slug, nil
}
