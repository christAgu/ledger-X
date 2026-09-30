package types

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

var defaultAllowedDenoms = []string{"ueurc"}

func NewParams(treasuryAddress string, allowedDenoms []string) Params {
	return Params{
		TreasuryAddress: treasuryAddress,
		AllowedDenoms:   append([]string(nil), allowedDenoms...),
	}
}

func DefaultParams() Params {
	return NewParams("", defaultAllowedDenoms)
}

func (p Params) Validate() error {
	if p.TreasuryAddress != "" {
		if _, err := sdk.AccAddressFromBech32(p.TreasuryAddress); err != nil {
			return fmt.Errorf("invalid treasury address: %w", err)
		}
	}

	seen := make(map[string]struct{}, len(p.AllowedDenoms))
	for _, denom := range p.AllowedDenoms {
		if err := sdk.ValidateDenom(denom); err != nil {
			return fmt.Errorf("%w: %s", ErrInvalidDenom, denom)
		}
		if _, exists := seen[denom]; exists {
			return fmt.Errorf("%w: %s", ErrInvalidDenom, denom)
		}
		seen[denom] = struct{}{}
	}

	return nil
}
