package repo

import (
	"fmt"
	"regexp"
)

var slugRe = regexp.MustCompile(`^[a-z0-9_]{1,32}$`)

func safeSchema(slug string) (string, error) {
	if !slugRe.MatchString(slug) {
		return "", fmt.Errorf("invalid tenant slug")
	}
	return "tenant_" + slug, nil
}