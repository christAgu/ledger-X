package types

// DONTCOVER

import (
	"cosmossdk.io/errors"
)

// x/treasury module sentinel errors
var (
	ErrInvalidSigner    = errors.Register(ModuleName, 1100, "expected gov account as only signer for proposal message")
	ErrUnauthorized     = errors.Register(ModuleName, 1101, "unauthorized treasury authority")
	ErrInvalidDenom     = errors.Register(ModuleName, 1102, "denomination is not allowed")
	ErrInvalidAmount    = errors.Register(ModuleName, 1103, "amount must be positive and valid")
	ErrInvalidReference = errors.Register(ModuleName, 1104, "invalid reference")
	ErrDuplicateRef     = errors.Register(ModuleName, 1105, "reference has already been used")
)
