package storage

import (
	"bytes"
	"encoding/binary"
	"errors"
	"io"

	"github.com/ps/backend/internal/crypto"
)

const (
	magic      uint32 = 0x5053504C
	versionV1  byte   = 0x01
	versionV2  byte   = 0x02
	ChunkSize         = 512 * 1024
)

var (
	ErrBadMagic    = errors.New("bad payload magic")
	ErrBadVersion  = errors.New("unsupported payload version")
	ErrBadCiphertext = errors.New("invalid ciphertext")
)

// Encode wraps EncodeWithManifest without a manifest (v1 format).
func Encode(w io.Writer, r io.Reader, key []byte) error {
	return EncodeWithManifest(w, r, key, nil)
}

// EncodeWithManifest writes v2 PSPL if manifestJSON is non-nil, otherwise v1.
// Format v1: magic(4) | 0x01(1) | chunk_count(4) | chunks...
// Format v2: magic(4) | 0x02(1) | manifest_len(4) | manifest_enc(n) | chunk_count(4) | chunks...
func EncodeWithManifest(w io.Writer, r io.Reader, key []byte, manifestJSON []byte) error {
	raw, err := io.ReadAll(r)
	if err != nil {
		return err
	}

	var body bytes.Buffer
	var count uint32

	for len(raw) > 0 {
		sz := ChunkSize
		if len(raw) < sz {
			sz = len(raw)
		}
		enc, err := crypto.EncryptAESGCM(key, raw[:sz])
		if err != nil {
			return err
		}
		raw = raw[sz:]

		lb := make([]byte, 4)
		binary.BigEndian.PutUint32(lb, uint32(len(enc)))
		body.Write(lb)
		body.Write(enc)
		count++
	}

	// Write header
	hdrBase := make([]byte, 5)
	binary.BigEndian.PutUint32(hdrBase[0:4], magic)

	if manifestJSON == nil {
		hdrBase[4] = versionV1
		if _, err := w.Write(hdrBase); err != nil {
			return err
		}
		cl := make([]byte, 4)
		binary.BigEndian.PutUint32(cl, count)
		if _, err := w.Write(cl); err != nil {
			return err
		}
	} else {
		hdrBase[4] = versionV2
		if _, err := w.Write(hdrBase); err != nil {
			return err
		}

		encManifest, err := crypto.EncryptAESGCM(key, manifestJSON)
		if err != nil {
			return err
		}

		ml := make([]byte, 4)
		binary.BigEndian.PutUint32(ml, uint32(len(encManifest)))
		if _, err := w.Write(ml); err != nil {
			return err
		}
		if _, err := w.Write(encManifest); err != nil {
			return err
		}

		cl := make([]byte, 4)
		binary.BigEndian.PutUint32(cl, count)
		if _, err := w.Write(cl); err != nil {
			return err
		}
	}

	_, err = body.WriteTo(w)
	return err
}

// Transcode re-encrypts every section (manifest + chunks) from srcKey to dstKey.
// Supports both v1 and v2 PSPL. Processes one chunk at a time.
func Transcode(w io.Writer, r io.Reader, srcKey, dstKey []byte) error {
	hdrBase := make([]byte, 5)
	if _, err := io.ReadFull(r, hdrBase); err != nil {
		return ErrBadMagic
	}
	if binary.BigEndian.Uint32(hdrBase[0:4]) != magic {
		return ErrBadMagic
	}
	ver := hdrBase[4]
	if ver != versionV1 && ver != versionV2 {
		return ErrBadVersion
	}
	if _, err := w.Write(hdrBase); err != nil {
		return err
	}

	if ver == versionV2 {
		ml := make([]byte, 4)
		if _, err := io.ReadFull(r, ml); err != nil {
			return err
		}
		manifestLen := binary.BigEndian.Uint32(ml)

		encManifest := make([]byte, manifestLen)
		if _, err := io.ReadFull(r, encManifest); err != nil {
			return err
		}

		plainManifest, err := crypto.DecryptAESGCM(srcKey, encManifest)
		if err != nil {
			return ErrBadCiphertext
		}

		reEncManifest, encErr := crypto.EncryptAESGCM(dstKey, plainManifest)
		for i := range plainManifest {
			plainManifest[i] = 0
		}
		if encErr != nil {
			return encErr
		}

		newML := make([]byte, 4)
		binary.BigEndian.PutUint32(newML, uint32(len(reEncManifest)))
		if _, err := w.Write(newML); err != nil {
			return err
		}
		if _, err := w.Write(reEncManifest); err != nil {
			return err
		}
	}

	cl := make([]byte, 4)
	if _, err := io.ReadFull(r, cl); err != nil {
		return err
	}
	chunkCount := binary.BigEndian.Uint32(cl)
	if _, err := w.Write(cl); err != nil {
		return err
	}

	lb := make([]byte, 4)
	for i := uint32(0); i < chunkCount; i++ {
		if _, err := io.ReadFull(r, lb); err != nil {
			return err
		}
		chunkLen := binary.BigEndian.Uint32(lb)

		enc := make([]byte, chunkLen)
		if _, err := io.ReadFull(r, enc); err != nil {
			return err
		}

		plain, err := crypto.DecryptAESGCM(srcKey, enc)
		if err != nil {
			return ErrBadCiphertext
		}

		reEnc, encErr := crypto.EncryptAESGCM(dstKey, plain)
		for j := range plain {
			plain[j] = 0
		}
		if encErr != nil {
			return encErr
		}

		outLen := make([]byte, 4)
		binary.BigEndian.PutUint32(outLen, uint32(len(reEnc)))
		if _, err := w.Write(outLen); err != nil {
			return err
		}
		if _, err := w.Write(reEnc); err != nil {
			return err
		}
	}

	return nil
}