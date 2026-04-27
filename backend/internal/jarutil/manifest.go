package jarutil

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
)

type ClassManifest struct {
	Hashes       map[string]string `json:"hashes"`
	ManifestHash string            `json:"manifest_hash"`
}

func BuildManifest(jarData []byte) (*ClassManifest, error) {
	r, err := zip.NewReader(bytes.NewReader(jarData), int64(len(jarData)))
	if err != nil {
		return nil, fmt.Errorf("open jar: %w", err)
	}

	hashes := make(map[string]string)
	for _, f := range r.File {
		if f.FileInfo().IsDir() || !strings.HasSuffix(f.Name, ".class") {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("open entry %s: %w", f.Name, err)
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return nil, fmt.Errorf("read entry %s: %w", f.Name, err)
		}
		h := sha256.Sum256(data)
		hashes[f.Name] = hex.EncodeToString(h[:])
	}

	if len(hashes) == 0 {
		return nil, fmt.Errorf("no .class files found in jar")
	}

	return &ClassManifest{
		Hashes:       hashes,
		ManifestHash: canonicalHash(hashes),
	}, nil
}

func canonicalHash(hashes map[string]string) string {
	keys := make([]string, 0, len(hashes))
	for k := range hashes {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	h := sha256.New()
	for _, k := range keys {
		h.Write([]byte(k))
		h.Write([]byte(hashes[k]))
	}
	return hex.EncodeToString(h.Sum(nil))
}

func MarshalManifest(m *ClassManifest) ([]byte, error) {
	return json.Marshal(m)
}