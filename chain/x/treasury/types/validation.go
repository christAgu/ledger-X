package types

import (
	"fmt"
	"unicode/utf8"
)

func validateReference(ref string) error {
	if ref == "" || utf8.RuneCountInString(ref) > 128 {
		return fmt.Errorf("%w: reference must contain 1 to 128 characters", ErrInvalidReference)
	}
	return nil
}

func ValidateReferenceForMsg(ref string) error {
	return validateReference(ref)
}

func validateReferences(refs []string) error {
	seen := make(map[string]struct{}, len(refs))
	for _, ref := range refs {
		if err := validateReference(ref); err != nil {
			return err
		}
		if _, exists := seen[ref]; exists {
			return fmt.Errorf("%w: %s", ErrDuplicateRef, ref)
		}
		seen[ref] = struct{}{}
	}
	return nil
}
